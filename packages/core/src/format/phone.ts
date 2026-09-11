/**
 * Brazilian phone number, normalized to E.164 (+55DDDNNNNNNNNN).
 * See docs/adr/0019-nucleo-compartilhado.md.
 */
declare const PhoneBrand: unique symbol;
export type Phone = string & { readonly [PhoneBrand]: "Phone" };

export class InvalidPhoneError extends Error {
  constructor(value: string) {
    super(`Invalid phone number: "${value}"`);
    this.name = "InvalidPhoneError";
  }
}

/** Accepts with or without +55, with or without area code in parens, with or without dash. */
export function phone(value: string): Phone {
  const digits = value.replace(/\D/g, "");

  // strip country code if already present
  const withoutCountryCode = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;

  // area code (2) + number (8 landline or 9 mobile)
  if (withoutCountryCode.length !== 10 && withoutCountryCode.length !== 11) {
    throw new InvalidPhoneError(value);
  }

  const areaCode = withoutCountryCode.slice(0, 2);
  if (Number(areaCode) < 11 || Number(areaCode) > 99) {
    throw new InvalidPhoneError(value);
  }

  return `+55${withoutCountryCode}` as Phone;
}

export function isValidPhone(value: string): boolean {
  try {
    phone(value);
    return true;
  } catch {
    return false;
  }
}

export function formatPhone(p: Phone): string {
  const digits = (p as string).slice(3); // strip +55
  const areaCode = digits.slice(0, 2);
  const number = digits.slice(2);
  return number.length === 9
    ? `(${areaCode}) ${number.slice(0, 5)}-${number.slice(5)}`
    : `(${areaCode}) ${number.slice(0, 4)}-${number.slice(4)}`;
}
