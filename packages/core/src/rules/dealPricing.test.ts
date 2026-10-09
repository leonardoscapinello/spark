import { assertManualDealAmount } from "./dealPricing.js";
import { describe, expect, it } from "vitest";
import { money, toCents } from "../money/index.js";
import { DomainError } from "../errors/index.js";
import { couponRejection, dealPricing, installmentOptions, installmentQuote, normalizeCouponCode, pricingItemTotals, valuedCycles, type InstallmentPolicy, type PricingAdjustment, type PricingItem } from "./dealPricing.js";

const item = (unit: number, extra: Partial<PricingItem> = {}): PricingItem => ({ quantityMilli: 1000, unitAmount: money(unit), discountBasisPoints: 0, taxBasisPoints: 0, ...extra });
const adj = (id: string, kind: PricingAdjustment["kind"], value: PricingAdjustment["value"], appliesTo: PricingAdjustment["appliesTo"] = "once", cycles: number | null = null): PricingAdjustment => ({ id, kind, label: id, value, appliesTo, cycles });
const cents = (value: { total: ReturnType<typeof money> }) => toCents(value.total);

describe("item", () => {
  it("desconto em valor substitui o percentual e nunca passa do bruto", () => {
    expect(toCents(pricingItemTotals(item(10_000, { discountBasisPoints: 5000, discountAmount: money(1_500) })).net)).toBe(8_500);
    expect(toCents(pricingItemTotals(item(10_000, { discountAmount: money(99_999) })).net)).toBe(0);
  });
  it("imposto incide sobre o valor já descontado", () => {
    expect(pricingItemTotals(item(10_000, { discountBasisPoints: 1000, taxBasisPoints: 1000 }))).toMatchObject({ discount: money(1_000), tax: money(900), net: money(9_900) });
  });
});

describe("cascata", () => {
  it("subtotal → descontos sobre o subtotal → cupom sobre o que sobrou → taxas sobre o descontado", () => {
    const pricing = dealPricing({ items: [item(1_200_000)], adjustments: [
      adj("taxa", "fee", { type: "amount", amount: money(200_000) }),
      adj("comercial", "discount", { type: "percent", basisPoints: 1000 }),
      adj("BLACK", "coupon", { type: "percent", basisPoints: 1000 }),
      adj("servico", "fee", { type: "percent", basisPoints: 500 }),
    ] });
    // 12.000 − 1.200 = 10.800 − 1.080 = 9.720; + 2.000 + 5% de 9.720 (486) = 12.206
    expect(pricing.once).toMatchObject({ discounts: money(120_000), coupons: money(108_000), fees: money(248_600), total: money(1_220_600) });
    expect(pricing.once.steps.map(s => s.kind)).toEqual(["subtotal", "discount", "coupon", "fee", "fee", "total"]);
    expect(pricing.contractValue).toEqual(pricing.once.total);
  });
  it("percentuais de desconto não compõem; descontos param em zero", () => {
    const pricing = dealPricing({ items: [item(10_000)], adjustments: [adj("a", "discount", { type: "percent", basisPoints: 6000 }), adj("b", "discount", { type: "percent", basisPoints: 6000 }), adj("c", "coupon", { type: "amount", amount: money(5_000) })] });
    expect(pricing.once).toMatchObject({ discounts: money(10_000), coupons: money(0), total: money(0) });
  });
  it("sem itens e sem ajustes, tudo zero", () => {
    expect(dealPricing({ items: [] })).toMatchObject({ contractValue: money(0), recurring: null, recurringCycles: 0 });
  });
});

describe("assinatura", () => {
  const items = [item(200_000, { recurring: false }), item(150_000, { recurring: true })];
  it("separa único e recorrente; contrato soma os ciclos", () => {
    const pricing = dealPricing({ items, subscription: { interval: "month", cycles: 12 } });
    expect(cents(pricing.once)).toBe(200_000);
    expect(cents(pricing.recurring!)).toBe(150_000);
    expect(pricing.recurringContractTotal).toEqual(money(1_800_000));
    expect(pricing.contractValue).toEqual(money(2_000_000));
  });
  it("cupom recorrente vale só nos N primeiros ciclos", () => {
    const pricing = dealPricing({ items, subscription: { interval: "month", cycles: 12 }, adjustments: [adj("3 meses", "coupon", { type: "percent", basisPoints: 2000 }, "recurring", 3)] });
    expect(cents(pricing.recurring!)).toBe(120_000);
    // 3 × 1.200 + 9 × 1.500
    expect(pricing.recurringContractTotal).toEqual(money(3 * 120_000 + 9 * 150_000));
  });
  it("assinatura sem fim é avaliada pelo prazo de referência", () => {
    expect(valuedCycles({ interval: "month", cycles: null })).toBe(12);
    expect(valuedCycles({ interval: "quarter", cycles: null, contractMonths: 24 })).toBe(8);
    expect(valuedCycles({ interval: "year", cycles: null })).toBe(1);
    expect(dealPricing({ items, subscription: { interval: "year", cycles: null } }).recurringContractTotal).toEqual(money(150_000));
  });
  it("ajuste da corrente única não toca a recorrente", () => {
    const pricing = dealPricing({ items, subscription: { interval: "month", cycles: 1 }, adjustments: [adj("setup", "fee", { type: "amount", amount: money(50_000) })] });
    expect(cents(pricing.once)).toBe(250_000);
    expect(cents(pricing.recurring!)).toBe(150_000);
  });
});

describe("parcelamento", () => {
  const policy: InstallmentPolicy = { maxInstallments: 12, interestFreeInstallments: 3, monthlyInterestBasisPoints: 199, minimumInstallment: money(5_000), upfrontDiscountBasisPoints: 500 };
  it("à vista leva o desconto à vista", () => {
    expect(installmentQuote(money(100_000), policy, 1)).toMatchObject({ upfrontDiscount: money(5_000), total: money(95_000), interest: money(0), interestFree: true });
  });
  it("sem juros divide e a primeira parcela absorve os centavos", () => {
    expect(installmentQuote(money(100_000), policy, 3)).toMatchObject({ installmentAmount: money(33_333), firstInstallment: money(33_334), total: money(100_000), interestFree: true });
  });
  it("acima do limite sem juros, Tabela Price", () => {
    // PMT = 1000 × 0,0199 / (1 − 1,0199^−4) = 262,32 → 4 × 262,32 = 1.049,28
    expect(installmentQuote(money(100_000), policy, 4)).toMatchObject({ installmentAmount: money(26_232), total: money(104_928), interest: money(4_928), interestFree: false });
  });
  it("fora da faixa ou abaixo da parcela mínima é recusado", () => {
    expect(() => installmentQuote(money(100_000), policy, 13)).toThrow(DomainError);
    expect(() => installmentQuote(money(10_000), policy, 3)).toThrow(DomainError);
  });
  it("opções param na primeira parcela abaixo do mínimo", () => {
    expect(installmentOptions(money(20_000), policy).map(o => o.installments)).toEqual([1, 2, 3, 4]);
  });
});

describe("cupom", () => {
  const coupon = { code: "BLACK", active: true, startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-11-30T23:59:59Z", minimumSubtotal: money(10_000), maxRedemptions: 100 };
  const at = (iso: string) => new Date(iso);
  it("normaliza o código", () => { expect(normalizeCouponCode(" black friday ")).toBe("BLACKFRIDAY"); });
  it("vale na janela, acima do mínimo e com usos", () => {
    expect(couponRejection(coupon, { subtotal: money(10_000), now: at("2026-11-10T12:00:00Z"), redemptions: 99 })).toBeNull();
  });
  it("diz por que não vale", () => {
    expect(couponRejection({ ...coupon, active: false }, { subtotal: money(10_000), now: at("2026-11-10T12:00:00Z"), redemptions: 0 })).toBe("inactive");
    expect(couponRejection(coupon, { subtotal: money(10_000), now: at("2026-10-31T12:00:00Z"), redemptions: 0 })).toBe("not_started");
    expect(couponRejection(coupon, { subtotal: money(10_000), now: at("2026-12-01T00:00:00Z"), redemptions: 0 })).toBe("expired");
    expect(couponRejection(coupon, { subtotal: money(9_999), now: at("2026-11-10T12:00:00Z"), redemptions: 0 })).toBe("below_minimum");
    expect(couponRejection(coupon, { subtotal: money(10_000), now: at("2026-11-10T12:00:00Z"), redemptions: 100 })).toBe("exhausted");
  });
});

 describe("limites das opções de parcelamento", () => {
  const policy: InstallmentPolicy = { maxInstallments: 3, interestFreeInstallments: 2, monthlyInterestBasisPoints: 10000, minimumInstallment: money(6000), upfrontDiscountBasisPoints: 0 };
  it("continua após uma opção abaixo do mínimo quando juros tornam a seguinte válida", () => {
    expect(installmentOptions(money(10000), policy).map(option => option.installments)).toEqual([1, 3]);
  });
  it("recusa quantidade fracionária e não finita sem arredondar silenciosamente", () => {
    for (const n of [1.5, NaN, Infinity]) expect(() => installmentQuote(money(10000), policy, n)).toThrow(DomainError);
  });
});

describe("valor manual do negócio", () => {
  it("permite valor manual sem itens e rejeita sobrescrever o total calculado", () => {
    expect(() => assertManualDealAmount(0)).not.toThrow();
    expect(() => assertManualDealAmount(1)).toThrow("calculado pelos itens");
  });
});
