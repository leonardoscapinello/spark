/**
 * Money is always integer cents — never floating point.
 * See docs/adr/0019-nucleo-compartilhado.md.
 *
 * `Money` is an OPAQUE type (object with a private symbol key), not a
 * `number` branded via intersection. This matters: an intersection brand
 * (`number & { brand }`) is still structurally a number, so arithmetic
 * operators (`*`, `-`, `+`) keep compiling right through it — the brand
 * blocks only CONSTRUCTION, not USE. An object is not a number:
 * `price * 0.9` fails to compile because the operator requires a
 * number/bigint operand. Proven by `money.types-test.ts`, checked by
 * `tsc --noEmit`.
 */
const MoneyValue: unique symbol = Symbol("Money"); // the real value — must exist at runtime, not just in the type
export type Money = { readonly [MoneyValue]: number };

export class InvalidMoneyError extends Error {
  constructor(value: number) {
    super(`Invalid monetary value: ${value}. Money requires an integer (cents).`);
    this.name = "InvalidMoneyError";
  }
}

/** Builds a Money from integer cents. The only entry point for the type. */
export function money(cents: number): Money {
  if (!Number.isSafeInteger(cents)) {
    throw new InvalidMoneyError(cents);
  }
  return { [MoneyValue]: cents } as Money;
}

/** Builds a Money from a decimal string (e.g. "19.90" → 1990 cents). */
export function moneyFromDecimal(decimal: string): Money {
  const normalized = decimal.trim().replace(",", ".");
  if (!/^-?\d+(?:\.\d{0,2})?$/.test(normalized)) throw new InvalidMoneyError(NaN);
  const negative = normalized.startsWith("-");
  const [whole = "0", fraction = ""] = normalized.replace("-", "").split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return money(Number(negative ? -cents : cents));
}

export function toCents(m: Money): number {
  return m[MoneyValue];
}

export function toDecimal(m: Money): number {
  return toCents(m) / 100;
}

export function add(a: Money, b: Money): Money {
  return money(toCents(a) + toCents(b));
}

export function subtract(a: Money, b: Money): Money {
  return money(toCents(a) - toCents(b));
}

export function multiply(m: Money, factor: number): Money {
  return money(Math.round(toCents(m) * factor));
}

export function isNegative(m: Money): boolean {
  return toCents(m) < 0;
}

export function isZero(m: Money): boolean {
  return toCents(m) === 0;
}

export function compare(a: Money, b: Money): -1 | 0 | 1 {
  const diff = toCents(a) - toCents(b);
  return diff < 0 ? -1 : diff > 0 ? 1 : 0;
}

export function sum(values: readonly Money[]): Money {
  return values.reduce((acc, v) => add(acc, v), money(0));
}

export function formatBRL(m: Money): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(toDecimal(m));
}

/** Decimal text for inputs/serialization without floating-point division. */
export function moneyToDecimalString(value: Money): string {
  const cents = BigInt(toCents(value));
  const absolute = cents < 0n ? -cents : cents;
  return `${cents < 0n ? "-" : ""}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}
