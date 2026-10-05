import { createZodDto } from "nestjs-zod";
import { ApplyCouponInputSchema, CreateDealAdjustmentInputSchema, DealAdjustmentWriteResponseSchema, DealTermsWriteResponseSchema, UpdateDealAdjustmentInputSchema, UpdateDealTermsInputSchema } from "@spark/core";

export class CreateDealAdjustmentDto extends createZodDto(CreateDealAdjustmentInputSchema) {}
export class UpdateDealAdjustmentDto extends createZodDto(UpdateDealAdjustmentInputSchema) {}
export class ApplyCouponDto extends createZodDto(ApplyCouponInputSchema) {}
export class DealAdjustmentWriteResponseDto extends createZodDto(DealAdjustmentWriteResponseSchema) {}
export class UpdateDealTermsDto extends createZodDto(UpdateDealTermsInputSchema) {}
export class DealTermsWriteResponseDto extends createZodDto(DealTermsWriteResponseSchema) {}
