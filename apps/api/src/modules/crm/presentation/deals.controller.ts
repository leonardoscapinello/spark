import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { dealId as dealIdFactory } from "@spark/core";
import { SupabaseJwtGuard, CapabilityGuard, RequireCapability, CurrentSupabaseUser, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CreateDealUseCase } from "../application/create-deal.usecase.js";
import { MoveDealUseCase } from "../application/move-deal.usecase.js";
import { CloseDealUseCase } from "../application/close-deal.usecase.js";
import {
  CreateDealDto,
  CreateDealResponseDto,
  MoveDealDto,
  MoveDealResponseDto,
  CloseDealDto,
  CloseDealResponseDto,
  toDealDto,
} from "../dto/deal.dto.js";

@ApiTags("crm")
@Controller("v1/deals")
export class DealsController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly createDeal: CreateDealUseCase,
    private readonly moveDeal: MoveDealUseCase,
    private readonly closeDeal: CloseDealUseCase,
  ) {}

  @Post()
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("deals:write")
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: CreateDealResponseDto })
  async create(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Body() body: CreateDealDto,
  ): Promise<CreateDealResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    const { deal, txid } = await this.createDeal.execute(user.orgId, body);
    return { deal: toDealDto(deal), txid } as CreateDealResponseDto;
  }

  @Patch(":id/move")
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("deals:move")
  @ApiBearerAuth()
  @ApiOkResponse({ type: MoveDealResponseDto })
  async move(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Param("id") id: string,
    @Body() body: MoveDealDto,
  ): Promise<MoveDealResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    const { deal, txid } = await this.moveDeal.execute(user.orgId, dealIdFactory.from(id), body.stageId);
    return { deal: toDealDto(deal), txid } as MoveDealResponseDto;
  }

  @Patch(":id/close")
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("deals:move")
  @ApiBearerAuth()
  @ApiOkResponse({ type: CloseDealResponseDto })
  async close(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Param("id") id: string,
    @Body() body: CloseDealDto,
  ): Promise<CloseDealResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    const { deal, txid } = await this.closeDeal.execute(user.orgId, dealIdFactory.from(id), body);
    return { deal: toDealDto(deal), txid } as CloseDealResponseDto;
  }
}
