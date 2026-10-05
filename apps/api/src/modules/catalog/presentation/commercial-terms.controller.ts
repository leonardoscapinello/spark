import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { couponId, installmentPolicyId } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CommercialTermsDeleteResponseDto, CouponWriteResponseDto, CreateCouponDto, CreateInstallmentPolicyDto, InstallmentPolicyWriteResponseDto, UpdateCouponDto, UpdateInstallmentPolicyDto } from "../dto/commercial-terms.dto.js";
import { CommercialTermsRepository } from "../infrastructure/commercial-terms.repository.js";

/** Cupons e políticas de parcelamento (Configurações → Comercial). */
@ApiTags("catalog")
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@RequireCapability("catalog:write")
@Controller("v1/catalog")
export class CommercialTermsController {
  constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly terms: CommercialTermsRepository) {}

  @Post("coupons") @ApiCreatedResponse({ type: CouponWriteResponseDto })
  async createCoupon(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: CreateCouponDto) { const user = await this.currentUser.execute(claims.sub); return this.terms.createCoupon(user.orgId, body) as Promise<CouponWriteResponseDto>; }

  @Patch("coupons/:id") @ApiOkResponse({ type: CouponWriteResponseDto })
  async updateCoupon(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: UpdateCouponDto) { const user = await this.currentUser.execute(claims.sub); return this.terms.updateCoupon(user.orgId, couponId.from(id), body) as Promise<CouponWriteResponseDto>; }

  @Delete("coupons/:id") @ApiOkResponse({ type: CommercialTermsDeleteResponseDto })
  async removeCoupon(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string) { const user = await this.currentUser.execute(claims.sub); return this.terms.removeCoupon(user.orgId, couponId.from(id)); }

  @Post("installment-policies") @ApiCreatedResponse({ type: InstallmentPolicyWriteResponseDto })
  async createPolicy(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: CreateInstallmentPolicyDto) { const user = await this.currentUser.execute(claims.sub); return this.terms.createPolicy(user.orgId, body) as Promise<InstallmentPolicyWriteResponseDto>; }

  @Patch("installment-policies/:id") @ApiOkResponse({ type: InstallmentPolicyWriteResponseDto })
  async updatePolicy(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: UpdateInstallmentPolicyDto) { const user = await this.currentUser.execute(claims.sub); return this.terms.updatePolicy(user.orgId, installmentPolicyId.from(id), body) as Promise<InstallmentPolicyWriteResponseDto>; }

  @Delete("installment-policies/:id") @ApiOkResponse({ type: CommercialTermsDeleteResponseDto })
  async removePolicy(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string) { const user = await this.currentUser.execute(claims.sub); return this.terms.removePolicy(user.orgId, installmentPolicyId.from(id)); }
}
