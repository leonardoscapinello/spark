import { Controller, ForbiddenException, Get, NotFoundException, Param, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiExcludeEndpoint } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Readable } from "node:stream";
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";
import { getTableColumns, getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import * as dbSchema from "@spark/db";
import { canReadSyncResource, effectiveCapabilities, readableEventPrefixes } from "@spark/core";
import { SupabaseJwtGuard, CurrentSupabaseUser, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { SHAPE_TABLES, isSyncableTable } from "../application/shape-tables.js";
import { PermissionGroupsRepository } from "../../identity/infrastructure/permission-groups.repository.js";
import { appendDealShapeScope } from "./deal-shape-scope.js";
import { appendEventShapeScope } from "./event-shape-scope.js";

/**
 * Authorization proxy in front of Electric (docs/adr/0018, docs/adr/0026).
 * The client NEVER talks to Electric directly — only to this. This is
 * where, and only where, the shape's WHERE clause is decided: the client
 * picks the table, the SERVER picks the filter. Without this, "a badly
 * written shape" becomes a data leak between organizations (this
 * architecture's security risk #1, logged in the roadmap).
 *
 * @ApiExcludeEndpoint — doesn't go into openapi.json/the generated client
 * (ADR-0004). This isn't a business endpoint with a Zod contract; it's
 * sync infrastructure that packages/data talks to via ShapeStream, not
 * via api-client.
 */
/**
 * Column list per table, derived from the Drizzle schema at boot. The
 * server decides the columns for the same reason it decides the WHERE:
 * Electric refuses a shape over a table that has a GENERATED column
 * (contacts.search_vector, migration 0029) unless the columns are listed
 * explicitly — and the client never needed that column anyway (it
 * filters locally, CLAUDE.md rule 5). Derived, not hand-written, so a new
 * column added through Drizzle is synced without anyone remembering this.
 */
const TABLE_COLUMNS: ReadonlyMap<string, readonly string[]> = new Map(
  // `unknown` first: the module also exports strings and functions, and a union
  // with a string literal defeats the type predicate below.
  Object.values(dbSchema as Record<string, unknown>)
    .filter((value): value is PgTable => is(value, PgTable))
    .map((table) => [getTableName(table), Object.values(getTableColumns(table)).map((column) => column.name)] as const),
);

@Controller("v1/shapes")
export class ShapesController {
  constructor(
    private readonly config: ConfigService,
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly permissionGroups: PermissionGroupsRepository,
  ) {}

  @Get(":table")
  @UseGuards(SupabaseJwtGuard)
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxy(
    @Param("table") table: string,
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    if (!isSyncableTable(table)) {
      throw new NotFoundException(`Table "${table}" is not syncable.`);
    }

    const user = await this.getCurrentUser.execute(claims.sub);
    const groups = await this.permissionGroups.getUserCapabilities(user.id);
    const capabilities = effectiveCapabilities(groups);
    if (!canReadSyncResource(capabilities, table)) {
      throw new ForbiddenException(`Missing permission to synchronize "${table}".`);
    }
    const request = reply.request as FastifyRequest;

    const electricBase = this.config.getOrThrow<string>("ELECTRIC_URL");
    const upstream = new URL("/v1/shape", electricBase);

    // only Electric's own protocol parameters pass through from the
    // client — never "table" or "where", which the server decides below
    // on its own.
    const query = request.query as Record<string, string>;
    for (const key of ELECTRIC_PROTOCOL_QUERY_PARAMS) {
      if (query[key] !== undefined) upstream.searchParams.set(key, query[key]);
    }

    // noUncheckedIndexedAccess (tsconfig.base.json) requires this even
    // after already passing isSyncableTable — the guard narrows the KEY,
    // it doesn't prove the VALUE present to the compiler's eyes.
    const tableConfig = SHAPE_TABLES[table];
    if (!tableConfig) {
      throw new NotFoundException(`Table "${table}" is not syncable.`);
    }
    const { column, userColumn, sharedUnless } = tableConfig;
    upstream.searchParams.set("table", table);
    const filters = [`"${column}" = $1`];
    const params: string[] = [user.orgId];
    const eventPrefixes = table === "events" ? readableEventPrefixes(capabilities) : [];
    if (eventPrefixes.length > 0) {
      const clauses = eventPrefixes.map((prefix) => {
        params.push(`${prefix}.%`);
        return `"type" LIKE $${params.length}`;
      });
      filters.push(`(${clauses.join(" OR ")})`);
    }
    // Personal tables (user_preferences) narrow to the requester too — the
    // server decides this, never the client, for the same reason as the org.
    if (userColumn) {
      params.push(user.id);
      filters.push(`"${userColumn}" = $${params.length}`);
    }
    // Shared-unless-private rows (saved views): everyone gets the org-wide
    // ones, only the owner gets their private ones — decided here, so a
    // private view never leaves the server for anyone else.
    if (sharedUnless) {
      params.push(sharedUnless.sharedValue);
      const sharedParam = params.length;
      params.push(user.id);
      filters.push(`("${sharedUnless.flagColumn}" = $${sharedParam} OR "${sharedUnless.ownerColumn}" = $${params.length})`);
    }
    if (table === "deals") appendDealShapeScope(query, filters, params);
    if (table === "events") appendEventShapeScope(query, filters, params);
    upstream.searchParams.set("where", filters.join(" AND "));
    params.forEach((value, index) => upstream.searchParams.set(`params[${index + 1}]`, value));
    const columns = TABLE_COLUMNS.get(table);
    if (columns) upstream.searchParams.set("columns", columns.join(","));

    // The browser closing its request (tab closed, shape unsubscribed) must
    // close ours to Electric too — otherwise every abandoned SSE stream
    // stays open upstream for as long as the process lives.
    const abort = new AbortController();
    request.raw.on("close", () => abort.abort());
    const response = await fetch(upstream, { signal: abort.signal });

    // Streamed by hand (hijack): Node only sends headers with the first body
    // byte, and an idle SSE stream (liveSse in packages/data) writes nothing
    // until something changes — the client would sit waiting for headers that
    // never come. flushHeaders() ships them at once; the body is piped as it
    // arrives. Fastify's own headers (CORS) are merged in so they survive
    // the hijack.
    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries(reply.getHeaders())) if (value !== undefined) headers[name] = String(value);
    for (const [name, value] of response.headers) {
      // content-encoding/length describe Electric's ORIGINAL compressed
      // body; relayed as a stream, a stale header makes the client
      // truncate or choke on the parse.
      if (name === "content-encoding" || name === "content-length") continue;
      // CORS is ours (enableCors, one origin) — Electric answers with "*" and must not override it.
      if (name.startsWith("access-control-") && name !== "access-control-expose-headers") continue;
      headers[name] = value;
    }
    reply.hijack();
    reply.raw.writeHead(response.status, headers);
    reply.raw.flushHeaders();
    if (!response.body) {
      reply.raw.end();
      return;
    }
    const stream = Readable.fromWeb(response.body as never);
    // The abort above surfaces here as an AbortError on the readable. It's
    // the normal end of a live stream (the browser left), not a failure —
    // and an unhandled 'error' on a Readable takes the whole process down.
    stream.on("error", (error: Error) => {
      if (error.name !== "AbortError") request.log.warn({ err: error }, "shape stream from Electric failed");
      reply.raw.destroy();
    });
    stream.pipe(reply.raw);
  }
}
