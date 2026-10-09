import { Controller, Get, NotFoundException, Param, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiExcludeEndpoint } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import { dealId as dealIdFactory } from "@spark/core";
import { SupabaseJwtGuard, CapabilityGuard, RequireCapability, CurrentSupabaseUser, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { DealsRepository } from "../infrastructure/deals.repository.js";
import { ResourcePresenceService } from "../../../common/resource-presence.service.js";
import { streamPresence } from "../../../common/presence-stream.js";

@Controller("v1/deals")
export class DealPresenceController {
  constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly deals: DealsRepository, private readonly presence: ResourcePresenceService) {}

  @Get(":id/presence")
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("deals:read")
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async watch(@Param("id") rawId: string, @CurrentSupabaseUser() claims: SupabaseJwtClaims, @Res() reply: FastifyReply): Promise<void> {
    const user = await this.currentUser.execute(claims.sub);
    const id = dealIdFactory.from(rawId);
    if (!await this.deals.exists(user.orgId, id)) throw new NotFoundException("Negócio não encontrado.");
    await streamPresence({ presence: this.presence, orgId: user.orgId, resource: { kind: "deal", id },
      viewer: { userId: user.id, name: user.name, avatarUrl: user.avatarUrl }, expiresAt: claims.exp * 1_000, reply });
  }
}
