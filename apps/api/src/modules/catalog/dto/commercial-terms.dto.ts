import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { CouponWriteResponseSchema, CreateCouponInputSchema, CreateInstallmentPolicyInputSchema, InstallmentPolicyWriteResponseSchema, UpdateCouponInputSchema, UpdateInstallmentPolicyInputSchema } from "@spark/core";

/* O código chega como o usuário digitou; o repositório normaliza antes de validar o formato. */
export class CreateCouponDto extends createZodDto(CreateCouponInputSchema.extend({ code: z.string().trim().min(2).max(40) })) {}
export class UpdateCouponDto extends createZodDto(UpdateCouponInputSchema.extend({ code: z.string().trim().min(2).max(40).optional() })) {}
export class CouponWriteResponseDto extends createZodDto(CouponWriteResponseSchema) {}
export class CreateInstallmentPolicyDto extends createZodDto(CreateInstallmentPolicyInputSchema) {}
export class UpdateInstallmentPolicyDto extends createZodDto(UpdateInstallmentPolicyInputSchema) {}
export class InstallmentPolicyWriteResponseDto extends createZodDto(InstallmentPolicyWriteResponseSchema) {}
export class CommercialTermsDeleteResponseDto extends createZodDto(z.object({ txid: z.number().int() })) {}
