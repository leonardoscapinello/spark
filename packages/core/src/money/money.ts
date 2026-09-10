/**
 * Dinheiro é sempre centavos inteiros — nunca ponto flutuante.
 * Ver docs/adr/0019-nucleo-compartilhado.md.
 *
 * `Money` é um tipo OPACO (objeto com chave de symbol privado), não um
 * `number` com marca por interseção. Isso importa: um brand por interseção
 * (`number & { brand }`) ainda É estruturalmente um number, então operadores
 * aritméticos (`*`, `-`, `+`) continuam compilando por cima dele — a marca
 * bloqueia só a CONSTRUÇÃO, não o uso. Um objeto não é number: `preco * 0.9`
 * falha a compilar porque o operador exige operando number/bigint.
 * A prova disso é `money.types-test.ts`, verificada pelo `tsc --noEmit`.
 */
const MoneyValue: unique symbol = Symbol("Money"); // valor real — precisa existir em runtime, não só em tipo
export type Money = { readonly [MoneyValue]: number };

export class InvalidMoneyError extends Error {
  constructor(value: number) {
    super(`Valor monetário inválido: ${value}. Money exige inteiro (centavos).`);
    this.name = "InvalidMoneyError";
  }
}

/** Constrói um Money a partir de centavos inteiros. Único ponto de entrada do tipo. */
export function money(centavos: number): Money {
  if (!Number.isInteger(centavos)) {
    throw new InvalidMoneyError(centavos);
  }
  return { [MoneyValue]: centavos } as Money;
}

/** Constrói um Money a partir de uma string decimal (ex.: "19.90" → 1990 centavos). */
export function moneyFromDecimal(decimal: string): Money {
  const normalized = decimal.trim().replace(",", ".");
  const value = Number(normalized);
  if (Number.isNaN(value)) {
    throw new InvalidMoneyError(NaN);
  }
  return money(Math.round(value * 100));
}

export function toCentavos(m: Money): number {
  return m[MoneyValue];
}

export function toDecimal(m: Money): number {
  return toCentavos(m) / 100;
}

export function add(a: Money, b: Money): Money {
  return money(toCentavos(a) + toCentavos(b));
}

export function subtract(a: Money, b: Money): Money {
  return money(toCentavos(a) - toCentavos(b));
}

export function multiply(m: Money, factor: number): Money {
  return money(Math.round(toCentavos(m) * factor));
}

export function isNegative(m: Money): boolean {
  return toCentavos(m) < 0;
}

export function isZero(m: Money): boolean {
  return toCentavos(m) === 0;
}

export function compare(a: Money, b: Money): -1 | 0 | 1 {
  const diff = toCentavos(a) - toCentavos(b);
  return diff < 0 ? -1 : diff > 0 ? 1 : 0;
}

export function sum(values: readonly Money[]): Money {
  return values.reduce((acc, v) => add(acc, v), money(0));
}

export function formatBRL(m: Money): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(toDecimal(m));
}
