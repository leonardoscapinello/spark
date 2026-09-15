import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { dealProductId as dealProductIdFactory } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CreateDealProductDto, DealProductWriteResponseDto, UpdateDealProductDto } from "../dto/deal-product.dto.js";
import { DealProductsRepository } from "../infrastructure/deal-products.repository.js";

/** Itens do negócio. Cada escrita devolve o valor recalculado do negócio. */
@ApiTags("crm")
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@RequireCapability("deals:write")
@Controller("v1/deal-products")
export class DealProductsController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly items: DealProductsRepository,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: DealProductWriteResponseDto })
  async add(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: CreateDealProductDto) {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.items.add(user.orgId, user.id, body) as Promise<DealProductWriteResponseDto>;
  }

  @Patch(":id")
  @ApiOkResponse({ type: DealProductWriteResponseDto })
  async change(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: UpdateDealProductDto) {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.items.change(user.orgId, user.id, dealProductIdFactory.from(id), body) as Promise<DealProductWriteResponseDto>;
  }

  @Delete(":id")
  @ApiOkResponse({ type: DealProductWriteResponseDto })
  async remove(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string) {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.items.remove(user.orgId, user.id, dealProductIdFactory.from(id)) as Promise<DealProductWriteResponseDto>;
  }
}
