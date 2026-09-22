import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { integrationConnectionId } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { ListWhatsAppTemplatesUseCase } from "../application/list-whatsapp-templates.usecase.js";
import { SyncWhatsAppTemplatesUseCase } from "../application/sync-whatsapp-templates.usecase.js";
import { SyncWhatsAppTemplatesResponseDto } from "../dto/inbox.dto.js";

@ApiTags("inbox") @ApiBearerAuth() @UseGuards(SupabaseJwtGuard, CapabilityGuard) @Controller("v1/integrations/:connectionId/whatsapp-templates")
export class WhatsAppTemplatesController {
  constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly list: ListWhatsAppTemplatesUseCase, private readonly sync: SyncWhatsAppTemplatesUseCase) {}

  @Get() @RequireCapability("inbox:read") @ApiOkResponse({ type: SyncWhatsAppTemplatesResponseDto })
  async index(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("connectionId") connectionId: string): Promise<SyncWhatsAppTemplatesResponseDto> {
    const user = await this.currentUser.execute(claims.sub);
    return this.list.execute(user.orgId, integrationConnectionId.from(connectionId)) as Promise<SyncWhatsAppTemplatesResponseDto>;
  }

  @Post("sync") @RequireCapability("integrations:manage") @ApiOkResponse({ type: SyncWhatsAppTemplatesResponseDto })
  async syncTemplates(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("connectionId") connectionId: string): Promise<SyncWhatsAppTemplatesResponseDto> {
    const user = await this.currentUser.execute(claims.sub);
    return this.sync.execute(user.orgId, integrationConnectionId.from(connectionId)) as Promise<SyncWhatsAppTemplatesResponseDto>;
  }
}
