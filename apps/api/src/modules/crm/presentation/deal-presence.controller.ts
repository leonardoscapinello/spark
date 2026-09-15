import { Controller, Get, NotFoundException, Param, Res, ServiceUnavailableException, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiExcludeEndpoint } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import { dealId as dealIdFactory, type DealViewer } from "@spark/core";
import { SupabaseJwtGuard, CapabilityGuard, RequireCapability, CurrentSupabaseUser, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { DealsRepository } from "../infrastructure/deals.repository.js";
import { DealPresenceService } from "../infrastructure/deal-presence.service.js";

@Controller("v1/deals")
export class DealPresenceController {
  constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly deals: DealsRepository, private readonly presence: DealPresenceService) {}

  @Get(":id/presence")
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("deals:read")
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async watch(@Param("id") rawId: string, @CurrentSupabaseUser() claims: SupabaseJwtClaims, @Res() reply: FastifyReply): Promise<void> {
    const user = await this.currentUser.execute(claims.sub);
    const id = dealIdFactory.from(rawId);
    if (!await this.deals.exists(user.orgId, id)) throw new NotFoundException("Negócio não encontrado.");
    let pending: DealViewer[] | null = null;
    let lastPayload = "";
    let started = false;
    const send = (viewers: DealViewer[] | null) => {
      pending = viewers;
      if (!started || reply.raw.destroyed) return;
      if (viewers === null) { reply.raw.end(); return; }
      const payload = JSON.stringify(viewers);
      if (payload === lastPayload) return;
      lastPayload = payload;
      reply.raw.write(`data: ${payload}\n\n`);
    };
    const session = await this.presence.join(user.orgId, id, { userId: user.id, name: user.name, avatarUrl: user.avatarUrl }, send)
      .catch(() => { throw new ServiceUnavailableException("Presença temporariamente indisponível."); });
    if (reply.raw.destroyed) { await session.leave(); return; }
    reply.hijack();
    for (const [name, value] of Object.entries(reply.getHeaders())) {
      if (value !== undefined) reply.raw.setHeader(name, value);
    }
    reply.raw.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", "x-accel-buffering": "no" });
    reply.raw.flushHeaders();
    started = true;
    send(pending);
    // One heartbeat renews the ephemeral lease; no Postgres reads or writes.
    let renewing = false;
    const heartbeat = setInterval(() => {
      if (Date.now() >= claims.exp * 1_000) { reply.raw.end(); return; }
      if (renewing) return;
      renewing = true;
      void session.renew().then(() => { if (!reply.raw.destroyed) reply.raw.write(": heartbeat\n\n"); })
        .catch(() => reply.raw.end()).finally(() => { renewing = false; });
    }, 20_000);
    reply.raw.once("close", () => { clearInterval(heartbeat); void session.leave().catch(() => undefined); });
  }
}
