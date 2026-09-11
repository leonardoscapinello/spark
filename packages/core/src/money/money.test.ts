import { describe, expect, it } from "vitest";
import { toCents, moneyToDecimalString, add, formatBRL, money, moneyFromDecimal, multiply, subtract, toDecimal, sum, compare } from "./money.js";
import { applyDiscount } from "./discount.js";

describe("money", () => {
  it("builds from integer cents", () => {
    expect(toDecimal(money(1990))).toBe(19.9);
  });

  it("rejects a non-integer value", () => {
    expect(() => money(19.9)).toThrow("Money requires an integer");
  });

  it("converts from decimal (comma or dot)", () => {
    expect(toDecimal(moneyFromDecimal("19,90"))).toBe(19.9);
    expect(toDecimal(moneyFromDecimal("19.90"))).toBe(19.9);
  });

  it("adds and subtracts preserving cents", () => {
    expect(toDecimal(add(money(1000), money(250)))).toBe(12.5);
    expect(toDecimal(subtract(money(1000), money(250)))).toBe(7.5);
  });

  it("multiplies and rounds to the nearest cent", () => {
    expect(toDecimal(multiply(money(1000), 1 / 3))).toBe(3.33);
  });

  it("sums a list of values", () => {
    const total = sum([money(100), money(200), money(300)]);
    expect(toDecimal(total)).toBe(6);
  });

  it("compares two values", () => {
    expect(compare(money(100), money(200))).toBe(-1);
    expect(compare(money(200), money(100))).toBe(1);
    expect(compare(money(100), money(100))).toBe(0);
  });

  it("formats as BRL", () => {
    expect(formatBRL(money(199_90))).toMatch(/R\$\s*199,90/);
  });
});

describe("applyDiscount", () => {
  it("applies a percentage discount", () => {
    const result = applyDiscount(money(10_000), { type: "percentage", value: 10 });
    expect(toDecimal(result)).toBe(90);
  });

  it("applies a fixed-amount discount", () => {
    const result = applyDiscount(money(10_000), { type: "fixed_amount", value: money(1_500) });
    expect(toDecimal(result)).toBe(85);
  });

  it("never results in a negative value", () => {
    const result = applyDiscount(money(1_000), { type: "fixed_amount", value: money(5_000) });
    expect(toDecimal(result)).toBe(0);
  });

  it("rejects a percentage discount outside 0–100", () => {
    expect(() => applyDiscount(money(1000), { type: "percentage", value: 150 })).toThrow("between 0 and 100");
  });
});

it("converts exact cents and rejects unsafe integers or excess precision", () => {
  expect(toCents(moneyFromDecimal("100.00"))).toBe(10000);
  expect(toCents(moneyFromDecimal("0.29"))).toBe(29);
  expect(moneyToDecimalString(money(Number.MAX_SAFE_INTEGER))).toBe("90071992547409.91");
  expect(()=>money(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  expect(()=>moneyFromDecimal("90071992547409.92")).toThrow();
  expect(()=>moneyFromDecimal("1.001")).toThrow();
});
