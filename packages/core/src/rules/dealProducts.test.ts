import { describe, it, expect } from "vitest";
import { dealProductTotals, dealProductsSummary, dealProductsTotal, formatBasisPoints, formatQuantity, parseBasisPoints, parseQuantity } from "./dealProducts.js";
import { money, toCents } from "../money/index.js";

const line = (over: Partial<Parameters<typeof dealProductTotals>[0]> = {}) =>
  ({ quantityMilli: 1000, unitAmount: money(10_000), discountBasisPoints: 0, taxBasisPoints: 0, ...over });

describe("itens do negócio", () => {
  it("conta preço × quantidade, desconto e imposto na ordem certa", () => {
    const totals = dealProductTotals(line({ quantityMilli: 2000, unitAmount: money(10_000), discountBasisPoints: 1000, taxBasisPoints: 1000 }));
    expect(toCents(totals.gross)).toBe(20_000);
    expect(toCents(totals.discount)).toBe(2_000);
    // imposto incide sobre o valor já descontado, não sobre o bruto
    expect(toCents(totals.tax)).toBe(1_800);
    expect(toCents(totals.net)).toBe(19_800);
  });

  it("aceita quantidade fracionada em milésimos", () => {
    expect(toCents(dealProductTotals(line({ quantityMilli: 1500, unitAmount: money(999) })).net)).toBe(1_499);
  });

  it("arredonda uma vez por parcela — a soma fecha com o que a tela mostra", () => {
    const totals = dealProductTotals(line({ quantityMilli: 3000, unitAmount: money(333), discountBasisPoints: 3333 }));
    expect(toCents(totals.gross)).toBe(999);
    expect(toCents(totals.discount)).toBe(333);
    expect(toCents(totals.net)).toBe(666);
  });

  it("o valor do negócio é a soma líquida dos itens", () => {
    const total = dealProductsTotal([
      line({ quantityMilli: 2000, unitAmount: money(50_000) }),
      line({ unitAmount: money(30_000), discountBasisPoints: 5000 }),
    ]);
    expect(toCents(total)).toBe(115_000);
  });

  it("negócio sem itens vale zero", () => {
    expect(toCents(dealProductsTotal([]))).toBe(0);
    expect(toCents(dealProductsSummary([]).net)).toBe(0);
  });

  it("o resumo soma cada parcela separadamente", () => {
    const summary = dealProductsSummary([
      line({ unitAmount: money(10_000), discountBasisPoints: 1000, taxBasisPoints: 1000 }),
      line({ unitAmount: money(20_000), taxBasisPoints: 1000 }),
    ]);
    expect(toCents(summary.gross)).toBe(30_000);
    expect(toCents(summary.discount)).toBe(1_000);
    expect(toCents(summary.tax)).toBe(2_900);
    expect(toCents(summary.net)).toBe(31_900);
  });

  it("lê e escreve quantidade e porcentagem no formato de quem digita", () => {
    expect(parseQuantity("1,5")).toBe(1500);
    expect(parseQuantity("2")).toBe(2000);
    expect(parseQuantity("0")).toBeNull();
    expect(parseQuantity("abc")).toBeNull();
    expect(formatQuantity(1500)).toBe("1,5");
    expect(formatQuantity(2000)).toBe("2");
    expect(parseBasisPoints("12,5")).toBe(1250);
    expect(parseBasisPoints("")).toBe(0);
    expect(parseBasisPoints("120")).toBeNull();
    expect(formatBasisPoints(1250)).toBe("12,5");
  });
});
