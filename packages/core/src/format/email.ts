/**
 * Email is always normalized (lowercase, no whitespace) before becoming
 * the branded type. Form, import, and API all use this same validation —
 * because they all call this function (docs/adr/0019-nucleo-compartilhado.md).
 */
declare const EmailBrand: unique symbol;
export type Email = string & { readonly [EmailBrand]: "Email" };

// RFC 5322 simplified — good enough for form validation; the real proof of
// deliverability is the send (Resend) and verification (Reoon), not the regex.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class InvalidEmailError extends Error {
  constructor(value: string) {
    super(`Invalid email: "${value}"`);
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
