import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  CapabilityGuard,
  CurrentSupabaseUser,
  RequireCapability,
  SupabaseJwtGuard,
  type SupabaseJwtClaims,
} from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { SocialService } from "../application/social.service.js";
import {
  CreateSocialPostDto,
  SocialPostWriteResponseDto,
  SyncSocialChannelsResponseDto,
} from "../dto/social.dto.js";

@ApiTags("social")
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@Controller("v1/social")
export class SocialController {
  constructor(
    private readonly currentUser: GetCurrentUserUseCase,
    private readonly social: SocialService,
  ) {}
  @Post("channels/sync")
  @RequireCapability("social:write")
  @ApiOkResponse({ type: SyncSocialChannelsResponseDto })
  async syncChannels(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
  ): Promise<SyncSocialChannelsResponseDto> {
    const user = await this.currentUser.execute(claims.sub);
    return this.social.syncChannels(user.orgId) as Promise<SyncSocialChannelsResponseDto>;
  }
  @Post("posts")
  @RequireCapability("social:write")
  @ApiCreatedResponse({ type: SocialPostWriteResponseDto })
  async createPost(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Body() body: CreateSocialPostDto,
  ): Promise<SocialPostWriteResponseDto> {
    const user = await this.currentUser.execute(claims.sub);
    return this.social.createPost(user.orgId, user.id, body) as Promise<SocialPostWriteResponseDto>;
  }
}
