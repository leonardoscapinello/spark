import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { integrationConnectionId } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CheckIntegrationUseCase } from "../application/check-integration.usecase.js";
import { UpdateIntegrationStatusUseCase } from "../application/update-integration-status.usecase.js";
import { UpsertIntegrationUseCase } from "../application/upsert-integration.usecase.js";
import { IntegrationWriteResponseDto, UpdateIntegrationStatusDto, UpsertIntegrationDto } from "../dto/integrations.dto.js";
@ApiTags("integrations") @ApiBearerAuth() @UseGuards(SupabaseJwtGuard, CapabilityGuard) @Controller("v1/integrations")
export class IntegrationsController {
  constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly upsertIntegration: UpsertIntegrationUseCase, private readonly checkIntegration: CheckIntegrationUseCase, private readonly updateStatus: UpdateIntegrationStatusUseCase) {}
  @Post() @RequireCapability("integrations:manage") @ApiOkResponse({ type: IntegrationWriteResponseDto })
  async upsert(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: UpsertIntegrationDto): Promise<IntegrationWriteResponseDto> { const user = await this.currentUser.execute(claims.sub); return this.upsertIntegration.execute(user.orgId, user.id, body) as Promise<IntegrationWriteResponseDto>; }
  @Post(":id/check") @RequireCapability("integrations:manage") @ApiOkResponse({ type: IntegrationWriteResponseDto })
  async check(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string): Promise<IntegrationWriteResponseDto> { const user = await this.currentUser.execute(claims.sub); return this.checkIntegration.execute(user.orgId, user.id, integrationConnectionId.from(id)) as Promise<IntegrationWriteResponseDto>; }
  @Patch(":id/status") @RequireCapability("integrations:manage") @ApiOkResponse({ type: IntegrationWriteResponseDto })
  async status(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: UpdateIntegrationStatusDto): Promise<IntegrationWriteResponseDto> { const user = await this.currentUser.execute(claims.sub); return this.updateStatus.execute(user.orgId, user.id, integrationConnectionId.from(id), body) as Promise<IntegrationWriteResponseDto>; }
}
