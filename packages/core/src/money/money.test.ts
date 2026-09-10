import { describe, expect, it } from "vitest";
import { add, formatBRL, money, moneyFromDecimal, multiply, subtract, toDecimal, sum, compare } from "./money.js";
import { aplicarDesconto } from "./discount.js";

describe("money", () => {
  it("constrói a partir de centavos inteiros", () => {
    expect(toDecimal(money(1990))).toBe(19.9);
  });

  it("rejeita valor não inteiro", () => {
    expect(() => money(19.9)).toThrow("Money exige inteiro");
  });

  it("converte de decimal (vírgula ou ponto)", () => {
    expect(toDecimal(moneyFromDecimal("19,90"))).toBe(19.9);
    expect(toDecimal(moneyFromDecimal("19.90"))).toBe(19.9);
  });

  it("soma e subtrai preservando centavos", () => {
    expect(toDecimal(add(money(1000), money(250)))).toBe(12.5);
    expect(toDecimal(subtract(money(1000), money(250)))).toBe(7.5);
  });

  it("multiplica e arredonda para o centavo mais próximo", () => {
    expect(toDecimal(multiply(money(1000), 1 / 3))).toBe(3.33);
  });

  it("soma uma lista de valores", () => {
    const total = sum([money(100), money(200), money(300)]);
    expect(toDecimal(total)).toBe(6);
  });

  it("compara dois valores", () => {
    expect(compare(money(100), money(200))).toBe(-1);
    expect(compare(money(200), money(100))).toBe(1);
    expect(compare(money(100), money(100))).toBe(0);
  });

  it("formata em BRL", () => {
    expect(formatBRL(money(199_90))).toMatch(/R\$\s*199,90/);
  });
});

describe("aplicarDesconto", () => {
  it("aplica desconto percentual", () => {
    const resultado = aplicarDesconto(money(10_000), { tipo: "percentual", valor: 10 });
    expect(toDecimal(resultado)).toBe(90);
  });

  it("aplica desconto de valor fixo", () => {
    const resultado = aplicarDesconto(money(10_000), { tipo: "valor_fixo", valor: money(1_500) });
    expect(toDecimal(resultado)).toBe(85);
  });

  it("nunca resulta em valor negativo", () => {
    const resultado = aplicarDesconto(money(1_000), { tipo: "valor_fixo", valor: money(5_000) });
    expect(toDecimal(resultado)).toBe(0);
  });

  it("rejeita desconto percentual fora de 0–100", () => {
    expect(() => aplicarDesconto(money(1000), { tipo: "percentual", valor: 150 })).toThrow(
      "entre 0 e 100",
    );
  });
});
