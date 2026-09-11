/**
 * CPF and CNPJ, with check digit validated (modulo 11) — not just format.
 * A document with a wrong check digit should never become the branded type.
 * See docs/adr/0019-nucleo-compartilhado.md.
 */
declare const CpfBrand: unique symbol;
export type CPF = string & { readonly [CpfBrand]: "CPF" };

declare const CnpjBrand: unique symbol;
export type CNPJ = string & { readonly [CnpjBrand]: "CNPJ" };

export class InvalidDocumentError extends Error {
  constructor(type: "CPF" | "CNPJ", value: string) {
    super(`Invalid ${type}: "${value}"`);
    this.name = "InvalidDocumentError";
  }
}

function allDigitsEqual(digits: string): boolean {
  return digits.split("").every((d) => d === digits[0]);
}

function calculateModulo11Digit(digits: string, weights: readonly number[]): number {
  const sum = digits.split("").reduce((acc, d, i) => acc + Number(d) * (weights[i] ?? 0), 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/** Validates a CPF (modulo 11 algorithm, two check digits). */
export function validateCpf(digits: string): boolean {
  if (digits.length !== 11 || allDigitsEqual(digits)) return false;

  const d1 = calculateModulo11Digit(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d1 !== Number(digits[9])) return false;

  const d2 = calculateModulo11Digit(digits.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d2 === Number(digits[10]);
}

/** Validates a CNPJ (modulo 11 algorithm, its own weights, two check digits). */
export function validateCnpj(digits: string): boolean {
  if (digits.length !== 14 || allDigitsEqual(digits)) return false;

  const d1 = calculateModulo11Digit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d1 !== Number(digits[12])) return false;

  const d2 = calculateModulo11Digit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d2 === Number(digits[13]);
}

export function cpf(value: string): CPF {
  const digits = value.replace(/\D/g, "");
  if (!validateCpf(digits)) {
    throw new InvalidDocumentError("CPF", value);
  }
  return digits as CPF;
}

export function cnpj(value: string): CNPJ {
  const digits = value.replace(/\D/g, "");
  if (!validateCnpj(digits)) {
    throw new InvalidDocumentError("CNPJ", value);
  }
  return digits as CNPJ;
}

export function isValidCpf(value: string): boolean {
  try {
    cpf(value);
    return true;
  } catch {
    return false;
  }
}

export function isValidCnpj(value: string): boolean {
  try {
    cnpj(value);
    return true;
  } catch {
    return false;
  }
}

export function formatCpf(v: CPF): string {
  const d = v as string;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatCnpj(v: CNPJ): string {
  const d = v as string;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** A contact can be identified by CPF (individual) or CNPJ (company). */
export type TaxDocument = { type: "cpf"; value: CPF } | { type: "cnpj"; value: CNPJ };

export function taxDocument(value: string): TaxDocument {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return { type: "cpf", value: cpf(value) };
  if (digits.length === 14) return { type: "cnpj", value: cnpj(value) };
  throw new InvalidDocumentError("CPF", value);
}
