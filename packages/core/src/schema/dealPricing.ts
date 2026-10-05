import { z } from "zod";
import { RECURRING_INTERVALS } from "../rules/dealPricing.js";
import { zCouponId, zDealAdjustmentId, zDealId, zInstallmentPolicyId, zMoney, zOrgId, zServerTimestamp } from "./zodHelpers.js";

/**
 * Entidades da precificação do negócio (ADR-0046). O cálculo mora em
 * rules/dealPricing; aqui ficam as formas que viajam entre tela, API e banco.
 */

export const RecurringIntervalSchema = z.enum(RECURRING_INTERVALS);
export const PricingStreamSchema = z.enum(["once", "recurring"]);
export const AdjustmentKindSchema = z.enum(["discount", "coupon", "fee"]);
export const AdjustmentValueTypeSchema = z.enum(["percent", "amount"]);

const basisPoints = z.number().int().min(0).max(10_000);
const cycles = z.number().int().min(1).max(600);

/**
 * Ajuste do negócio — desconto, cupom ou taxa (setup, serviço). Percentual em
 * pontos-base ou valor em centavos, conforme `valueType`. Cupom guarda a foto
 * dos valores do momento em que foi aplicado: mudar o cupom depois não
 * reescreve o que foi negociado.
 */
export const DealAdjustmentSchema = z.object({
  id: zDealAdjustmentId,
  orgId: zOrgId,
  dealId: zDealId,
  kind: AdjustmentKindSchema,
  label: z.string().trim().min(1).max(120),
  valueType: AdjustmentValueTypeSchema,
  basisPoints: basisPoints.default(0),
  amount: zMoney,
  appliesTo: PricingStreamSchema.default("once"),
  /** Corrente recorrente: vale nos N primeiros ciclos; nulo = todos. */
  cycles: cycles.nullable().default(null),
  couponId: zCouponId.nullable().default(null),
  sortOrder: z.number().int().min(0).default(0),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type DealAdjustment = z.infer<typeof DealAdjustmentSchema>;

export const CreateDealAdjustmentInputSchema = DealAdjustmentSchema.omit({ orgId: true, couponId: true, createdAt: true, updatedAt: true })
  .partial({ basisPoints: true, appliesTo: true, cycles: true, sortOrder: true });
export type CreateDealAdjustmentInput = z.infer<typeof CreateDealAdjustmentInputSchema>;
export const UpdateDealAdjustmentInputSchema = CreateDealAdjustmentInputSchema.omit({ id: true, dealId: true, kind: true }).partial();
export type UpdateDealAdjustmentInput = z.infer<typeof UpdateDealAdjustmentInputSchema>;

/** Aplicar cupom pelo código: o servidor valida e grava a foto como ajuste. */
export const ApplyCouponInputSchema = z.object({ id: zDealAdjustmentId, dealId: zDealId, code: z.string().trim().min(1).max(40) });
export type ApplyCouponInput = z.infer<typeof ApplyCouponInputSchema>;

export const DealAdjustmentWriteResponseSchema = z.object({ adjustment: DealAdjustmentSchema.nullable(), dealAmount: zMoney, txid: z.number().int() });
export type DealAdjustmentWriteResponse = z.infer<typeof DealAdjustmentWriteResponseSchema>;

/** Condições de cobrança do negócio: assinatura e parcelamento. */
export const DealTermsSchema = z.object({
  subscriptionInterval: RecurringIntervalSchema.nullable(),
  subscriptionCycles: cycles.nullable(),
  contractMonths: z.number().int().min(1).max(120),
  installmentPolicyId: zInstallmentPolicyId.nullable(),
  installments: z.number().int().min(1).max(48),
});
export type DealTerms = z.infer<typeof DealTermsSchema>;
export const UpdateDealTermsInputSchema = DealTermsSchema.partial();
export type UpdateDealTermsInput = z.infer<typeof UpdateDealTermsInputSchema>;
export const DealTermsWriteResponseSchema = z.object({ dealAmount: zMoney, txid: z.number().int() });

/**
 * Cupom pré-configurado (Configurações → Cupons). Vale no negócio hoje e no
 * checkout depois. Código único por organização, sempre normalizado.
 */
export const CouponSchema = z.object({
  id: zCouponId,
  orgId: zOrgId,
  code: z.string().trim().min(2).max(40).regex(/^[A-Z0-9_-]+$/, { error: "Use letras, números, hífen ou sublinhado, sem espaços." }),
  description: z.string().trim().max(300).nullable().default(null),
  valueType: AdjustmentValueTypeSchema,
  basisPoints: basisPoints.default(0),
  amount: zMoney,
  appliesTo: PricingStreamSchema.default("once"),
  cycles: cycles.nullable().default(null),
  minimumSubtotal: zMoney.nullable().default(null),
  startsAt: zServerTimestamp.nullable().default(null),
  endsAt: zServerTimestamp.nullable().default(null),
  maxRedemptions: z.number().int().min(1).nullable().default(null),
  active: z.boolean().default(true),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type Coupon = z.infer<typeof CouponSchema>;
export const CreateCouponInputSchema = CouponSchema.omit({ orgId: true, createdAt: true, updatedAt: true })
  .partial({ description: true, basisPoints: true, appliesTo: true, cycles: true, minimumSubtotal: true, startsAt: true, endsAt: true, maxRedemptions: true, active: true });
export type CreateCouponInput = z.infer<typeof CreateCouponInputSchema>;
export const UpdateCouponInputSchema = CreateCouponInputSchema.omit({ id: true }).partial();
export type UpdateCouponInput = z.infer<typeof UpdateCouponInputSchema>;
export const CouponWriteResponseSchema = z.object({ coupon: CouponSchema, txid: z.number().int() });

/**
 * Política de parcelamento (Configurações → Parcelamento): os juros são da
 * empresa, não do gateway. Uma pode ser a padrão dos negócios novos.
 */
export const InstallmentPolicySchema = z.object({
  id: zInstallmentPolicyId,
  orgId: zOrgId,
  name: z.string().trim().min(1).max(120),
  maxInstallments: z.number().int().min(1).max(48),
  interestFreeInstallments: z.number().int().min(1).max(48),
  monthlyInterestBasisPoints: basisPoints,
  minimumInstallment: zMoney,
  upfrontDiscountBasisPoints: basisPoints.default(0),
  isDefault: z.boolean().default(false),
  active: z.boolean().default(true),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type InstallmentPolicyRecord = z.infer<typeof InstallmentPolicySchema>;
export const CreateInstallmentPolicyInputSchema = InstallmentPolicySchema.omit({ orgId: true, createdAt: true, updatedAt: true })
  .partial({ upfrontDiscountBasisPoints: true, isDefault: true, active: true });
export type CreateInstallmentPolicyInput = z.infer<typeof CreateInstallmentPolicyInputSchema>;
export const UpdateInstallmentPolicyInputSchema = CreateInstallmentPolicyInputSchema.omit({ id: true }).partial();
export type UpdateInstallmentPolicyInput = z.infer<typeof UpdateInstallmentPolicyInputSchema>;
export const InstallmentPolicyWriteResponseSchema = z.object({ policy: InstallmentPolicySchema, txid: z.number().int() });
