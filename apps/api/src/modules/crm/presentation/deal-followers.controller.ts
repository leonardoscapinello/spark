import { Body, Controller, Delete, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { dealId, userId } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { AddDealFollowerDto, DealFollowerWriteResponseDto } from "../dto/deal-follower.dto.js";
import { DealFollowersRepository } from "../infrastructure/deal-followers.repository.js";

@ApiTags("crm")
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@RequireCapability("deals:write")
@Controller("v1/deals/:dealId/followers")
export class DealFollowersController {
  constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly followers: DealFollowersRepository) {}

  @Post()
  @ApiCreatedResponse({ type: DealFollowerWriteResponseDto })
  async add(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("dealId") id: string, @Body() body: AddDealFollowerDto): Promise<DealFollowerWriteResponseDto> {
    const actor = await this.currentUser.execute(claims.sub);
    return this.followers.add(actor.orgId, actor.id, dealId.from(id), body.userId) as Promise<DealFollowerWriteResponseDto>;
  }

  @Delete(":userId")
  @ApiOkResponse({ type: DealFollowerWriteResponseDto })
  async remove(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("dealId") id: string, @Param("userId") followerId: string): Promise<DealFollowerWriteResponseDto> {
    const actor = await this.currentUser.execute(claims.sub);
    return this.followers.remove(actor.orgId, actor.id, dealId.from(id), userId.from(followerId)) as Promise<DealFollowerWriteResponseDto>;
  }
}
