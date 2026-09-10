/**
 * Telefone brasileiro, normalizado para E.164 (+55DDDNNNNNNNNN).
 * Ver docs/adr/0019-nucleo-compartilhado.md.
 */
declare const PhoneBrand: unique symbol;
export type Telefone = string & { readonly [PhoneBrand]: "Telefone" };

export class InvalidPhoneError extends Error {
  constructor(value: string) {
    super(`Telefone inválido: "${value}"`);
    this.name = "InvalidPhoneError";
  }
}

/** Aceita com ou sem +55, com ou sem DDD entre parênteses, com ou sem traço. */
export function telefone(value: string): Telefone {
  const digits = value.replace(/\D/g, "");

  // remove código do país se já vier com ele
  const semPais = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;

  // DDD (2) + número (8 fixo ou 9 celular)
  if (semPais.length !== 10 && semPais.length !== 11) {
    throw new InvalidPhoneError(value);
  }

  const ddd = semPais.slice(0, 2);
  if (Number(ddd) < 11 || Number(ddd) > 99) {
    throw new InvalidPhoneError(value);
  }

  return `+55${semPais}` as Telefone;
}

export function isValidTelefone(value: string): boolean {
  try {
    telefone(value);
    return true;
  } catch {
    return false;
  }
}

export function formatTelefone(t: Telefone): string {
  const digits = (t as string).slice(3); // remove +55
  const ddd = digits.slice(0, 2);
  const numero = digits.slice(2);
  return numero.length === 9
    ? `(${ddd}) ${numero.slice(0, 5)}-${numero.slice(5)}`
    : `(${ddd}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
}
