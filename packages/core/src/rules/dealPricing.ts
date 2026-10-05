import { money, toCents, type Money } from "../money/index.js";
import { DomainError } from "../errors/index.js";

/**
 * Precificação do negócio (ADR-0046). Uma regra só para servidor, telas e
 * checkout: itens únicos e recorrentes, cascata de ajustes por corrente e
 * valor total do contrato. Tudo inteiro — centavos, milésimos, pontos-base —
 * e arredondando uma vez por parcela.
 */

export const RECURRING_INTERVALS = ["month", "quarter", "semester", "year"] as const;
export type RecurringInterval = (typeof RECURRING_INTERVALS)[number];
export const RECURRING_INTERVAL_MONTHS: Record<RecurringInterval, number> = { month: 1, quarter: 3, semester: 6, year: 12 };
/** Prazo usado para avaliar assinatura sem fim quando o negócio não diz outro. */
export const DEFAULT_CONTRACT_MONTHS = 12;

export interface PricingItem {
  quantityMilli: number;
  unitAmount: Money;
  /** Desconto do item em pontos-base; ignorado quando há `discountAmount`. */
  discountBasisPoints: number;
  /** Desconto do item em valor, sobre o total da linha (preço × quantidade). */
  discountAmount?: Money | undefined;
  taxBasisPoints: number;
  /** Cobrado a cada ciclo da assinatura em vez de uma vez só. */
  recurring?: boolean | undefined;
}

export type AdjustmentValue = { type: "percent"; basisPoints: number } | { type: "amount"; amount: Money };
export type AdjustmentKind = "discount" | "coupon" | "fee";
export type PricingStream = "once" | "recurring";

export interface PricingAdjustment {
  id: string;
  kind: AdjustmentKind;
  label: string;
  value: AdjustmentValue;
  appliesTo: PricingStream;
  /** Só na corrente recorrente: vale nos N primeiros ciclos; nulo = todos. */
  cycles?: number | null | undefined;
}

export interface Subscription {
  interval: RecurringInterval;
  /** Quantos ciclos a assinatura dura; nulo = até cancelar. */
  cycles: number | null;
  /** Prazo para avaliar assinatura sem fim no valor do negócio. */
  contractMonths?: number | undefined;
}

export interface PricingStep {
  id: string;
  kind: "subtotal" | AdjustmentKind | "total";
  label: string;
  /** Com sinal: desconto e cupom negativos, taxa positiva. */
  amount: Money;
}

export interface StreamTotals {
  subtotal: Money;
  discounts: Money;
  coupons: Money;
  fees: Money;
  total: Money;
  /** A cascata na ordem em que foi aplicada, para a tela listar linha a linha. */
  steps: PricingStep[];
}

export interface ItemTotals { gross: Money; discount: Money; tax: Money; net: Money }

export interface DealPricing {
  once: StreamTotals;
  /** Primeiro ciclo da assinatura; nulo quando não há item recorrente. */
  recurring: StreamTotals | null;
  /** Ciclos usados no valor do contrato (assinatura com fim, ou o prazo de referência). */
  recurringCycles: number;
  /** Soma de todos os ciclos, respeitando ajustes que valem só nos primeiros. */
  recurringContractTotal: Money;
  /** Valor do negócio: total único + soma dos ciclos. Juros de parcelamento ficam fora. */
  contractValue: Money;
}

const clampBasisPoints = (value: number) => Math.max(0, Math.min(10_000, Math.round(value)));
const percentOf = (cents: number, basisPoints: number) => Math.round((cents * clampBasisPoints(basisPoints)) / 10_000);

/** Um item: bruto, desconto (% ou valor, nunca passa do bruto), imposto sobre o descontado. */
export function pricingItemTotals(item: PricingItem): ItemTotals {
  const gross = Math.round((toCents(item.unitAmount) * item.quantityMilli) / 1000);
  const fixed = item.discountAmount ? toCents(item.discountAmount) : 0;
  const discount = fixed > 0 ? Math.min(gross, fixed) : percentOf(gross, item.discountBasisPoints);
  const taxable = gross - discount;
  const tax = percentOf(taxable, item.taxBasisPoints);
  return { gross: money(gross), discount: money(discount), tax: money(tax), net: money(taxable + tax) };
}

/**
 * Cascata de uma corrente: subtotal → descontos (percentuais sobre o
 * subtotal, sem compor) → cupons (sobre o que sobrou) → piso em zero → taxas
 * (percentuais sobre o valor já descontado).
 */
function streamTotals(subtotal: number, adjustments: readonly PricingAdjustment[]): StreamTotals {
  const steps: PricingStep[] = [{ id: "subtotal", kind: "subtotal", label: "Subtotal", amount: money(subtotal) }];
  const amountOf = (adjustment: PricingAdjustment, base: number) => adjustment.value.type === "percent" ? percentOf(base, adjustment.value.basisPoints) : Math.max(0, toCents(adjustment.value.amount));

  let running = subtotal;
  let discounts = 0;
  for (const adjustment of adjustments.filter(a => a.kind === "discount")) {
    const cut = Math.min(running, amountOf(adjustment, subtotal));
    running -= cut; discounts += cut;
    steps.push({ id: adjustment.id, kind: "discount", label: adjustment.label, amount: money(-cut) });
  }
  let coupons = 0;
  const afterDiscounts = running;
  for (const adjustment of adjustments.filter(a => a.kind === "coupon")) {
    const cut = Math.min(running, amountOf(adjustment, afterDiscounts));
    running -= cut; coupons += cut;
    steps.push({ id: adjustment.id, kind: "coupon", label: adjustment.label, amount: money(-cut) });
  }
  let fees = 0;
  const feeBase = running;
  for (const adjustment of adjustments.filter(a => a.kind === "fee")) {
    const added = amountOf(adjustment, feeBase);
    running += added; fees += added;
    steps.push({ id: adjustment.id, kind: "fee", label: adjustment.label, amount: money(added) });
  }
  steps.push({ id: "total", kind: "total", label: "Total", amount: money(running) });
  return { subtotal: money(subtotal), discounts: money(discounts), coupons: money(coupons), fees: money(fees), total: money(running), steps };
}

/** Ciclos que entram no valor do contrato. */
export function valuedCycles(subscription: Subscription): number {
  if (subscription.cycles !== null) return Math.max(0, Math.floor(subscription.cycles));
  const months = subscription.contractMonths ?? DEFAULT_CONTRACT_MONTHS;
  return Math.max(1, Math.ceil(months / RECURRING_INTERVAL_MONTHS[subscription.interval]));
}

export function dealPricing({ items, adjustments = [], subscription = null }: { items: readonly PricingItem[]; adjustments?: readonly PricingAdjustment[]; subscription?: Subscription | null }): DealPricing {
  let onceSubtotal = 0;
  let recurringSubtotal = 0;
  let hasRecurring = false;
  for (const item of items) {
    const net = toCents(pricingItemTotals(item).net);
    if (item.recurring) { recurringSubtotal += net; hasRecurring = true; } else onceSubtotal += net;
  }
  const once = streamTotals(onceSubtotal, adjustments.filter(a => a.appliesTo === "once"));
  if (!hasRecurring) return { once, recurring: null, recurringCycles: 0, recurringContractTotal: money(0), contractValue: once.total };

  const recurringAdjustments = adjustments.filter(a => a.appliesTo === "recurring");
  const cyclesValued = valuedCycles(subscription ?? { interval: "month", cycles: null });
  const inCycle = (cycle: number) => recurringAdjustments.filter(a => a.cycles == null || cycle <= a.cycles);
  const first = streamTotals(recurringSubtotal, inCycle(1));

  /* Só muda de valor quando algum ajuste expira: soma por faixa em vez de ciclo a ciclo. */
  const breakpoints = [...new Set(recurringAdjustments.flatMap(a => a.cycles == null ? [] : [Math.floor(a.cycles)]))].filter(c => c > 0 && c < cyclesValued).sort((a, b) => a - b);
  let contract = 0;
  let from = 1;
  for (const until of [...breakpoints, cyclesValued]) {
    if (until < from) continue;
    contract += toCents(streamTotals(recurringSubtotal, inCycle(from)).total) * (until - from + 1);
    from = until + 1;
  }
  return { once, recurring: first, recurringCycles: cyclesValued, recurringContractTotal: money(contract), contractValue: money(toCents(once.total) + contract) };
}

/* ------------------------------------------------------------------ */
/* Parcelamento                                                        */
/* ------------------------------------------------------------------ */

export interface InstallmentPolicy {
  maxInstallments: number;
  /** Até quantas parcelas sem juros (1 = só à vista sem juros). */
  interestFreeInstallments: number;
  /** Juros mensais compostos (Tabela Price) acima do limite sem juros. */
  monthlyInterestBasisPoints: number;
  /** Parcela mínima; opções abaixo dela não são oferecidas. */
  minimumInstallment: Money;
  /** Desconto para pagamento à vista (1 parcela). */
  upfrontDiscountBasisPoints: number;
}

export interface InstallmentQuote {
  installments: number;
  /** Valor antes do parcelamento (já com desconto à vista, se 1x). */
  principal: Money;
  upfrontDiscount: Money;
  /** Valor de cada parcela a partir da segunda. */
  installmentAmount: Money;
  /** A primeira parcela absorve a diferença de centavos. */
  firstInstallment: Money;
  total: Money;
  interest: Money;
  interestFree: boolean;
}

/** Uma condição: n parcelas para um valor. Juros pela Tabela Price, arredondando a parcela uma vez. */
export function installmentQuote(amount: Money, policy: InstallmentPolicy, installments: number): InstallmentQuote {
  const n = Math.floor(installments);
  if (n < 1 || n > policy.maxInstallments) throw new DomainError("VALIDATION_FAILED", `Parcelamento aceita de 1 a ${policy.maxInstallments} parcelas.`, { installments });
  const base = Math.max(0, toCents(amount));
  const upfrontDiscount = n === 1 ? percentOf(base, policy.upfrontDiscountBasisPoints) : 0;
  const principal = base - upfrontDiscount;
  const interestFree = n <= Math.max(1, policy.interestFreeInstallments) || policy.monthlyInterestBasisPoints <= 0;

  let installment: number;
  let total: number;
  if (interestFree) {
    installment = Math.floor(principal / n);
    total = principal;
  } else {
    const rate = policy.monthlyInterestBasisPoints / 10_000;
    installment = Math.round((principal * rate) / (1 - (1 + rate) ** -n));
    total = installment * n;
  }
  const first = total - installment * (n - 1);
  if (n > 1 && installment < toCents(policy.minimumInstallment)) throw new DomainError("VALIDATION_FAILED", "A parcela ficaria abaixo do mínimo permitido.", { installments: n, installment });
  return { installments: n, principal: money(principal), upfrontDiscount: money(upfrontDiscount), installmentAmount: money(installment), firstInstallment: money(first), total: money(total), interest: money(total - principal), interestFree };
}

/** Todas as condições oferecíveis: de 1 até o máximo, sem as que ficariam abaixo da parcela mínima. */
export function installmentOptions(amount: Money, policy: InstallmentPolicy): InstallmentQuote[] {
  const options: InstallmentQuote[] = [];
  for (let n = 1; n <= policy.maxInstallments; n++) {
    try { options.push(installmentQuote(amount, policy, n)); } catch { break; }
  }
  return options;
}

/* ------------------------------------------------------------------ */
/* Cupons                                                              */
/* ------------------------------------------------------------------ */

export interface CouponRule {
  code: string;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  minimumSubtotal: Money | null;
  maxRedemptions: number | null;
}

export type CouponRejection = "inactive" | "not_started" | "expired" | "below_minimum" | "exhausted";

export const COUPON_REJECTION_MESSAGE: Record<CouponRejection, string> = {
  inactive: "Este cupom está desativado.",
  not_started: "Este cupom ainda não começou a valer.",
  expired: "Este cupom expirou.",
  below_minimum: "O subtotal não atinge o mínimo deste cupom.",
  exhausted: "Este cupom atingiu o limite de usos.",
};

/** Código como o usuário digita vira a chave do cadastro: sem espaços, maiúsculo. */
export function normalizeCouponCode(code: string): string {
  return code.trim().replace(/\s+/g, "").toLocaleUpperCase("pt-BR");
}

/** Se o cupom vale agora para este subtotal. Tempo e usos entram por parâmetro. */
export function couponRejection(coupon: CouponRule, { subtotal, now, redemptions }: { subtotal: Money; now: Date; redemptions: number }): CouponRejection | null {
  if (!coupon.active) return "inactive";
  if (coupon.startsAt && now.getTime() < Date.parse(coupon.startsAt)) return "not_started";
  if (coupon.endsAt && now.getTime() > Date.parse(coupon.endsAt)) return "expired";
  if (coupon.minimumSubtotal && toCents(subtotal) < toCents(coupon.minimumSubtotal)) return "below_minimum";
  if (coupon.maxRedemptions !== null && redemptions >= coupon.maxRedemptions) return "exhausted";
  return null;
}
