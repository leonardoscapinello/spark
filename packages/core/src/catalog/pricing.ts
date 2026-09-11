import { add, applyDiscount, money, toCents, type Money } from "../money/index.js";
import type { DiscountRule } from "../schema/catalog.js";
export interface CatalogPriceResult { base: Money; adjustment: Money; subtotal: Money; discount: Money; total: Money }
/** Única regra de preço do catálogo. Percentuais são guardados em basis points: 10,25% = 1025. */
export function calculateCatalogPrice(base: Money, adjustment: Money, rule?: DiscountRule | null, at = new Date()): CatalogPriceResult {
  const subtotal = add(base, adjustment); let total = subtotal;
  const applies = rule?.active && (!rule.startsAt || new Date(rule.startsAt) <= at) && (!rule.endsAt || new Date(rule.endsAt) > at) && toCents(subtotal) >= toCents(rule.minimumSubtotal);
  if (applies && rule) total = applyDiscount(subtotal, rule.type === "percentage" ? { type: "percentage", value: rule.value / 100 } : { type: "fixed_amount", value: money(rule.value) });
  return { base, adjustment, subtotal, discount: money(toCents(subtotal) - toCents(total)), total };
}
