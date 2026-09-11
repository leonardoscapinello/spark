import { email } from "../format/email.js";
import { phone } from "../format/phone.js";
import type { IdentityChannel } from "../schema/identity.js";

/** Canonical value used by channel matching and database uniqueness. */
export function normalizeIdentityValue(channel: IdentityChannel, value: string): string {
  if (channel === "email") return email(value);
  if (channel === "phone" || channel === "whatsapp") return phone(value);

  const normalized = value.trim().replace(/^@/, "").toLowerCase();
  if (!normalized) throw new Error("Identity value is required.");
  return normalized;
}
