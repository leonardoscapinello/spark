import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { campaignId } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CampaignsService } from "../application/campaigns.service.js";
import { AudienceWriteResponseDto, CampaignWriteResponseDto, CreateAudienceDto, CreateCampaignDto } from "../dto/campaigns.dto.js";
@ApiTags("campaigns") @ApiBearerAuth() @UseGuards(SupabaseJwtGuard, CapabilityGuard) @Controller("v1/campaigns")
export class CampaignsController { constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly campaigns: CampaignsService) {}
  @Post("audiences") @RequireCapability("campaigns:write") @ApiCreatedResponse({ type: AudienceWriteResponseDto }) async createAudience(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: CreateAudienceDto) { const user = await this.currentUser.execute(claims.sub); return this.campaigns.createAudience(user.orgId, user.id, body); }
  @Post() @RequireCapability("campaigns:write") @ApiCreatedResponse({ type: CampaignWriteResponseDto }) async createCampaign(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: CreateCampaignDto) { const user = await this.currentUser.execute(claims.sub); return this.campaigns.createCampaign(user.orgId, user.id, body); }
  @Post(":id/send") @RequireCapability("campaigns:write") @ApiOkResponse({ type: CampaignWriteResponseDto }) async send(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string) { const user = await this.currentUser.execute(claims.sub); return this.campaigns.send(user.orgId, campaignId.from(id)); }
}
