import { z } from "zod";
import { zDiscountRuleId, zMoney, zOrgId, zProductId, zProductVariantId, zServerTimestamp } from "./zodHelpers.js";
export const CurrencySchema = z.enum(["BRL", "USD"]);
export const ProductSchema = z.object({ id: zProductId, orgId: zOrgId, sku: z.string().trim().min(1).max(80), name: z.string().trim().min(1).max(200), description: z.string().max(2_000).nullable(), price: zMoney, currency: CurrencySchema, unit: z.string().trim().min(1).max(40), stock: z.number().int().nonnegative().nullable(), active: z.boolean(), tags: z.array(z.string()).default([]), createdAt: zServerTimestamp, updatedAt: zServerTimestamp, deletedAt: zServerTimestamp.nullable() });
export type Product = z.infer<typeof ProductSchema>;
export const CreateProductInputSchema = ProductSchema.omit({ orgId: true, createdAt: true, updatedAt: true, deletedAt: true }).partial({ description: true, stock: true, active: true, tags: true, currency: true, unit: true });
export type CreateProductInput = z.infer<typeof CreateProductInputSchema>;
export const UpdateProductInputSchema = CreateProductInputSchema.omit({ id: true }).partial();
export type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>;
export const ProductWriteResponseSchema = z.object({ product: ProductSchema, txid: z.number().int() });

export const ProductVariantSchema = z.object({ id: zProductVariantId, orgId: zOrgId, productId: zProductId, sku: z.string().trim().min(1).max(80), name: z.string().trim().min(1).max(160), priceAdjustment: zMoney, stock: z.number().int().nonnegative().nullable(), active: z.boolean(), createdAt: zServerTimestamp, updatedAt: zServerTimestamp });
export type ProductVariant = z.infer<typeof ProductVariantSchema>;
export const CreateProductVariantInputSchema = ProductVariantSchema.omit({ orgId: true, createdAt: true, updatedAt: true }).partial({ priceAdjustment: true, stock: true, active: true });
export type CreateProductVariantInput = z.infer<typeof CreateProductVariantInputSchema>;
export const ProductVariantWriteResponseSchema = z.object({ variant: ProductVariantSchema, txid: z.number().int() });

export const DiscountRuleSchema = z.object({ id: zDiscountRuleId, orgId: zOrgId, name: z.string().trim().min(1).max(160), type: z.enum(["percentage", "fixed_amount"]), value: z.number().int().nonnegative(), minimumSubtotal: zMoney, startsAt: zServerTimestamp.nullable(), endsAt: zServerTimestamp.nullable(), active: z.boolean(), createdAt: zServerTimestamp, updatedAt: zServerTimestamp });
export type DiscountRule = z.infer<typeof DiscountRuleSchema>;
export const CreateDiscountRuleInputSchema = DiscountRuleSchema.omit({ orgId: true, createdAt: true, updatedAt: true }).partial({ minimumSubtotal: true, startsAt: true, endsAt: true, active: true });
export type CreateDiscountRuleInput = z.infer<typeof CreateDiscountRuleInputSchema>;
export const UpdateDiscountRuleInputSchema = CreateDiscountRuleInputSchema.omit({ id: true }).partial();
export type UpdateDiscountRuleInput = z.infer<typeof UpdateDiscountRuleInputSchema>;
export const DiscountRuleWriteResponseSchema = z.object({ discountRule: DiscountRuleSchema, txid: z.number().int() });
