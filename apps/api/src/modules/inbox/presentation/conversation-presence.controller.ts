import { Controller, Get, HttpCode, NotFoundException, Param, Post, Res, ServiceUnavailableException, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiExcludeEndpoint } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import { conversationId } from "@spark/core";
import { SupabaseJwtGuard, CapabilityGuard, RequireCapability, CurrentSupabaseUser, type SupabaseJwtClaims } from "../../../auth/index.js";
import { ResourcePresenceService } from "../../../common/resource-presence.service.js";
import { streamPresence } from "../../../common/presence-stream.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { InboxRepository } from "../infrastructure/inbox.repository.js";

@Controller("v1/conversations")
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@ApiBearerAuth()
export class ConversationPresenceController {
  constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly inbox: InboxRepository, private readonly presence: ResourcePresenceService) {}

  private async resolve(claims: SupabaseJwtClaims, rawId: string) {
    const user = await this.currentUser.execute(claims.sub);
    const id = conversationId.from(rawId);
    if (!await this.inbox.exists(user.orgId, id)) throw new NotFoundException("Conversa não encontrada.");
    return { user, id };
  }

  @Get(":id/presence")
  @RequireCapability("inbox:read")
  @ApiExcludeEndpoint()
  async watch(@Param("id") rawId: string, @CurrentSupabaseUser() claims: SupabaseJwtClaims, @Res() reply: FastifyReply): Promise<void> {
    const { user, id } = await this.resolve(claims, rawId);
    await streamPresence({ presence: this.presence, orgId: user.orgId, resource: { kind: "conversation", id },
      viewer: { userId: user.id, name: user.name, avatarUrl: user.avatarUrl }, expiresAt: claims.exp * 1_000, reply });
  }

  @Post(":id/typing")
  @HttpCode(204)
  @RequireCapability("inbox:write")
  @ApiExcludeEndpoint()
  async typing(@Param("id") rawId: string, @CurrentSupabaseUser() claims: SupabaseJwtClaims): Promise<void> {
    const { user, id } = await this.resolve(claims, rawId);
    await this.presence.publishTyping(user.orgId, id, { userId: user.id, name: user.name, avatarUrl: user.avatarUrl })
      .catch(() => { throw new ServiceUnavailableException("Presença temporariamente indisponível."); });
  }
}
