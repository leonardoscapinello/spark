/**
 * CPF e CNPJ, com dígito verificador validado (módulo 11) — não só formato.
 * Um documento com dígito errado nunca deve virar o tipo marcado.
 * Ver docs/adr/0019-nucleo-compartilhado.md.
 */
declare const CpfBrand: unique symbol;
export type CPF = string & { readonly [CpfBrand]: "CPF" };

declare const CnpjBrand: unique symbol;
export type CNPJ = string & { readonly [CnpjBrand]: "CNPJ" };

export class InvalidDocumentError extends Error {
  constructor(tipo: "CPF" | "CNPJ", value: string) {
    super(`${tipo} inválido: "${value}"`);
    this.name = "InvalidDocumentError";
  }
}

function todosDigitosIguais(digits: string): boolean {
  return digits.split("").every((d) => d === digits[0]);
}

function calcularDigitoModulo11(digits: string, pesos: readonly number[]): number {
  const soma = digits
    .split("")
    .reduce((acc, d, i) => acc + Number(d) * (pesos[i] ?? 0), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** Valida CPF (algoritmo módulo 11, dois dígitos verificadores). */
export function validarCpf(digits: string): boolean {
  if (digits.length !== 11 || todosDigitosIguais(digits)) return false;

  const d1 = calcularDigitoModulo11(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d1 !== Number(digits[9])) return false;

  const d2 = calcularDigitoModulo11(digits.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d2 === Number(digits[10]);
}

/** Valida CNPJ (algoritmo módulo 11, pesos próprios, dois dígitos verificadores). */
export function validarCnpj(digits: string): boolean {
  if (digits.length !== 14 || todosDigitosIguais(digits)) return false;

  const d1 = calcularDigitoModulo11(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d1 !== Number(digits[12])) return false;

  const d2 = calcularDigitoModulo11(
    digits.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return d2 === Number(digits[13]);
}

export function cpf(value: string): CPF {
  const digits = value.replace(/\D/g, "");
  if (!validarCpf(digits)) {
    throw new InvalidDocumentError("CPF", value);
  }
  return digits as CPF;
}

export function cnpj(value: string): CNPJ {
  const digits = value.replace(/\D/g, "");
  if (!validarCnpj(digits)) {
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

/** Um contato pode ser identificado por CPF (pessoa física) ou CNPJ (empresa). */
export type Documento = { tipo: "cpf"; valor: CPF } | { tipo: "cnpj"; valor: CNPJ };

export function documento(value: string): Documento {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return { tipo: "cpf", valor: cpf(value) };
  if (digits.length === 14) return { tipo: "cnpj", valor: cnpj(value) };
  throw new InvalidDocumentError("CPF", value);
}
