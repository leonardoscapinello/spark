import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { activityId as activityIdFactory } from "@spark/core";
import { SupabaseJwtGuard, CapabilityGuard, RequireCapability, CurrentSupabaseUser, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CreateActivityUseCase } from "../application/create-activity.usecase.js";
import { CompleteActivityUseCase } from "../application/complete-activity.usecase.js";
import { ActivitiesRepository } from "../infrastructure/activities.repository.js";
import {
  CreateActivityDto, UpdateActivityDto,
  CreateActivityResponseDto,
  CompleteActivityDto,
  CompleteActivityResponseDto,
} from "../dto/activity.dto.js";

@ApiTags("activities")
@Controller("v1/activities")
export class ActivitiesController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly createActivity: CreateActivityUseCase,
    private readonly completeActivity: CompleteActivityUseCase,
    private readonly activities: ActivitiesRepository,
  ) {}

  @Post()
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("activities:write")
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: CreateActivityResponseDto })
  async create(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Body() body: CreateActivityDto,
  ): Promise<CreateActivityResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    const { activity, txid } = await this.createActivity.execute(user.orgId, user.id, body);
    return { activity, txid } as CreateActivityResponseDto;
  }

  @Patch(":id")
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("activities:write")
  @ApiBearerAuth()
  @ApiOkResponse({ type: CreateActivityResponseDto })
  async update(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Param("id") id: string,
    @Body() body: UpdateActivityDto,
  ): Promise<CreateActivityResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    const { activity, txid } = await this.activities.update(user.orgId, user.id, activityIdFactory.from(id), body);
    return { activity, txid } as CreateActivityResponseDto;
  }


  @Patch(":id/complete")
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("activities:write")
  @ApiBearerAuth()
  @ApiOkResponse({ type: CompleteActivityResponseDto })
  async complete(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Param("id") id: string,
    @Body() body: CompleteActivityDto,
  ): Promise<CompleteActivityResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    const { activity, txid } = await this.completeActivity.execute(
      user.orgId,
      user.id,
      activityIdFactory.from(id),
      body.completed,
    );
    return { activity, txid } as CompleteActivityResponseDto;
  }
}
