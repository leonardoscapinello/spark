/**
 * Email é sempre normalizado (minúsculo, sem espaço) antes de virar o tipo
 * marcado. Formulário, importação e API usam a mesma validação — porque
 * usam esta função (docs/adr/0019-nucleo-compartilhado.md).
 */
declare const EmailBrand: unique symbol;
export type Email = string & { readonly [EmailBrand]: "Email" };

// RFC 5322 simplificado — suficiente para validação de formulário; a prova
// real de entregabilidade é o envio (Resend) e a verificação (Reoon), não a regex.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class InvalidEmailError extends Error {
  constructor(value: string) {
    super(`E-mail inválido: "${value}"`);
    this.name = "InvalidEmailError";
  }
}

export function email(value: string): Email {
  const normalized = value.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalized)) {
    throw new InvalidEmailError(value);
  }
  return normalized as Email;
}

export function isValidEmail(value: string): boolean {
  try {
    email(value);
    return true;
  } catch {
    return false;
  }
}
