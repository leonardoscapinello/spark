import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { dealId as dealIdFactory } from "@spark/core";
import { SupabaseJwtGuard, CapabilityGuard, RequireCapability, CurrentSupabaseUser, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CreateDealUseCase } from "../application/create-deal.usecase.js";
import { MoveDealUseCase } from "../application/move-deal.usecase.js";
import { CloseDealUseCase } from "../application/close-deal.usecase.js";
import { ReopenDealUseCase } from "../application/reopen-deal.usecase.js";
import { EditDealUseCase } from "../application/edit-deal.usecase.js";
import {
  CreateDealDto,
  CreateDealResponseDto,
  MoveDealDto,
  MoveDealResponseDto,
  CloseDealDto,
  CloseDealResponseDto,
  ReopenDealResponseDto,
  EditDealDto,
  EditDealResponseDto,
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
    private readonly reopenDeal: ReopenDealUseCase,
    private readonly editDeal: EditDealUseCase,
  ) {}

  @Patch(":id")
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("deals:write")
  @ApiBearerAuth()
  @ApiOkResponse({ type: EditDealResponseDto })
  async edit(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Param("id") id: string,
    @Body() body: EditDealDto,
  ): Promise<EditDealResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    const { deal, txid } = await this.editDeal.execute(user.orgId, dealIdFactory.from(id), body);
    return { deal: toDealDto(deal), txid } as EditDealResponseDto;
  }

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

  @Patch(":id/reopen")
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("deals:move")
  @ApiBearerAuth()
  @ApiOkResponse({ type: ReopenDealResponseDto })
  async reopen(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Param("id") id: string,
  ): Promise<ReopenDealResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    const { deal, txid } = await this.reopenDeal.execute(user.orgId, dealIdFactory.from(id));
    return { deal: toDealDto(deal), txid } as ReopenDealResponseDto;
  }
}
