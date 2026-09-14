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

    const electricBase = this.config.get<string>("ELECTRIC_URL") ?? "http://localhost:3010";
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
    const { column, userColumn } = tableConfig;
    upstream.searchParams.set("table", table);
    const eventPrefixes = table === "events" ? readableEventPrefixes(capabilities) : [];
    const eventFilter = eventPrefixes.length > 0
      ? ` AND (${eventPrefixes.map((_, index) => `"type" LIKE $${index + 2}`).join(" OR ")})`
      : "";
    // Personal tables (user_preferences) narrow to the requester too — the
    // server decides this, never the client, for the same reason as the org.
    const userParam = eventPrefixes.length + 2;
    const userFilter = userColumn ? ` AND "${userColumn}" = $${userParam}` : "";
    upstream.searchParams.set("where", `"${column}" = $1${eventFilter}${userFilter}`);
    upstream.searchParams.set("params[1]", user.orgId);
    eventPrefixes.forEach((prefix, index) => upstream.searchParams.set(`params[${index + 2}]`, `${prefix}.%`));
    if (userColumn) upstream.searchParams.set(`params[${userParam}]`, user.id);
    const columns = TABLE_COLUMNS.get(table);
    if (columns) upstream.searchParams.set("columns", columns.join(","));

    const response = await fetch(upstream);

    reply.status(response.status);
    for (const [name, value] of response.headers) {
      // content-encoding/length describe Electric's ORIGINAL compressed
      // body; when relaying via stream, Fastify recalculates — a stale
      // header here makes the client truncate or choke on the parse.
      if (name === "content-encoding" || name === "content-length") continue;
      reply.header(name, value);
    }

    if (!response.body) {
      await reply.send();
      return;
    }
    await reply.send(Readable.fromWeb(response.body as never));
  }
}
