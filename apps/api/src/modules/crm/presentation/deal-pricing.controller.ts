import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { dealAdjustmentId as dealAdjustmentIdFactory, dealId as dealIdFactory } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { ApplyCouponDto, CreateDealAdjustmentDto, DealAdjustmentWriteResponseDto, DealTermsWriteResponseDto, UpdateDealAdjustmentDto, UpdateDealTermsDto } from "../dto/deal-pricing.dto.js";
import { DealPricingRepository } from "../infrastructure/deal-pricing.repository.js";

/** Ajustes do negócio (desconto, cupom, taxa). Cada escrita devolve o valor recalculado (ADR-0046). */
@ApiTags("crm")
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@RequireCapability("deals:write")
@Controller("v1/deal-adjustments")
export class DealAdjustmentsController {
  constructor(private readonly getCurrentUser: GetCurrentUserUseCase, private readonly pricing: DealPricingRepository) {}

  @Post()
  @ApiCreatedResponse({ type: DealAdjustmentWriteResponseDto })
  async add(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: CreateDealAdjustmentDto) {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.pricing.addAdjustment(user.orgId, user.id, body) as Promise<DealAdjustmentWriteResponseDto>;
  }

  @Post("coupon")
  @ApiCreatedResponse({ type: DealAdjustmentWriteResponseDto })
  async applyCoupon(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: ApplyCouponDto) {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.pricing.applyCoupon(user.orgId, user.id, body, new Date()) as Promise<DealAdjustmentWriteResponseDto>;
  }

  @Patch(":id")
  @ApiOkResponse({ type: DealAdjustmentWriteResponseDto })
  async change(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: UpdateDealAdjustmentDto) {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.pricing.changeAdjustment(user.orgId, user.id, dealAdjustmentIdFactory.from(id), body) as Promise<DealAdjustmentWriteResponseDto>;
  }

  @Delete(":id")
  @ApiOkResponse({ type: DealAdjustmentWriteResponseDto })
  async remove(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string) {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.pricing.removeAdjustment(user.orgId, user.id, dealAdjustmentIdFactory.from(id)) as Promise<DealAdjustmentWriteResponseDto>;
  }
}

/** Condições de cobrança do negócio: assinatura e parcelamento. */
@ApiTags("crm")
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@RequireCapability("deals:write")
@Controller("v1/deal-terms")
export class DealTermsController {
  constructor(private readonly getCurrentUser: GetCurrentUserUseCase, private readonly pricing: DealPricingRepository) {}

  @Patch(":dealId")
  @ApiOkResponse({ type: DealTermsWriteResponseDto })
  async update(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("dealId") dealId: string, @Body() body: UpdateDealTermsDto) {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.pricing.updateTerms(user.orgId, user.id, dealIdFactory.from(dealId), body) as Promise<DealTermsWriteResponseDto>;
  }
}
