import { z } from "zod";
import { zDealId, zDealProductId, zMoney, zOrgId, zProductId, zProductVariantId, zServerTimestamp } from "./zodHelpers.js";

/**
 * Item de um negócio — o que está sendo vendido ali.
 *
 * O valor do negócio é a soma destes itens (rules/dealProducts), não um número
 * digitado à mão: é assim no Pipedrive e é o que faz o funil somar certo.
 *
 * O item pode vir do catálogo (`productId`) ou ser escrito na hora para aquele
 * negócio (`productId` nulo). Em qualquer um dos dois casos **o nome e o preço
 * ficam gravados aqui**: mudar o preço de tabela amanhã não reescreve o que
 * foi negociado ontem.
 */
export const DealProductSchema = z.object({
  id: zDealProductId,
  orgId: zOrgId,
  dealId: zDealId,
  /** Do catálogo, ou nulo quando o item foi escrito só para este negócio. */
  productId: zProductId.nullable(),
  variantId: zProductVariantId.nullable(),
  /** Cópia do nome no momento da venda. */
  name: z.string().trim().min(1).max(200),
  /** Milésimos de unidade: 1500 = 1,5 — inteiro, pela mesma razão do dinheiro. */
  quantityMilli: z.number().int().positive().max(1_000_000_000),
  /** Preço de uma unidade, em centavos. */
  unitAmount: zMoney,
  /** Desconto do item, em pontos-base (1250 = 12,5%). */
  discountBasisPoints: z.number().int().min(0).max(10_000).default(0),
  /** Imposto do item, em pontos-base (1750 = 17,5%). */
  taxBasisPoints: z.number().int().min(0).max(10_000).default(0),
  sortOrder: z.number().int().min(0).default(0),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type DealProduct = z.infer<typeof DealProductSchema>;

export const CreateDealProductInputSchema = DealProductSchema.omit({
  orgId: true,
  createdAt: true,
  updatedAt: true,
}).partial({ productId: true, variantId: true, discountBasisPoints: true, taxBasisPoints: true, sortOrder: true });
export type CreateDealProductInput = z.infer<typeof CreateDealProductInputSchema>;

export const UpdateDealProductInputSchema = CreateDealProductInputSchema.omit({ id: true, dealId: true }).partial();
export type UpdateDealProductInput = z.infer<typeof UpdateDealProductInputSchema>;

/** A resposta devolve o negócio junto: o valor dele mudou com o item. */
export const DealProductWriteResponseSchema = z.object({
  item: DealProductSchema.nullable(),
  dealAmount: zMoney,
  txid: z.number().int(),
});
export type DealProductWriteResponse = z.infer<typeof DealProductWriteResponseSchema>;
