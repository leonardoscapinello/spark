import { Controller, ForbiddenException, Get, NotFoundException, Param, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiExcludeEndpoint } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Readable } from "node:stream";
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";
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
    const { column } = tableConfig;
    upstream.searchParams.set("table", table);
    const eventPrefixes = table === "events" ? readableEventPrefixes(capabilities) : [];
    const eventFilter = eventPrefixes.length > 0
      ? ` AND (${eventPrefixes.map((_, index) => `"type" LIKE $${index + 2}`).join(" OR ")})`
      : "";
    upstream.searchParams.set("where", `"${column}" = $1${eventFilter}`);
    upstream.searchParams.set("params[1]", user.orgId);
    eventPrefixes.forEach((prefix, index) => upstream.searchParams.set(`params[${index + 2}]`, `${prefix}.%`));

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
