import { createZodDto } from "nestjs-zod";
import { CreateDiscountRuleInputSchema, CreateProductInputSchema, CreateProductVariantInputSchema, DiscountRuleWriteResponseSchema, ProductVariantWriteResponseSchema, ProductWriteResponseSchema, UpdateDiscountRuleInputSchema, UpdateProductInputSchema } from "@spark/core";
export class CreateProductDto extends createZodDto(CreateProductInputSchema) {}
export class UpdateProductDto extends createZodDto(UpdateProductInputSchema) {}
export class ProductWriteResponseDto extends createZodDto(ProductWriteResponseSchema) {}
export class CreateProductVariantDto extends createZodDto(CreateProductVariantInputSchema) {}
export class ProductVariantWriteResponseDto extends createZodDto(ProductVariantWriteResponseSchema) {}
export class CreateDiscountRuleDto extends createZodDto(CreateDiscountRuleInputSchema) {}
export class UpdateDiscountRuleDto extends createZodDto(UpdateDiscountRuleInputSchema) {}
export class DiscountRuleWriteResponseDto extends createZodDto(DiscountRuleWriteResponseSchema) {}
