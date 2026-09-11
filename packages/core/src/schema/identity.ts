import { z } from "zod";
import { zOrgId, zContactId } from "./zodHelpers.js";

/**
 * The piece the four reference tools don't have — links a channel
 * (email, WhatsApp, Instagram...) to the same contact. See
 * docs/arquitetura/visao-geral.md#identities. `UNIQUE (orgId, channel,
 * externalValue)` is what guarantees an identity belongs to exactly one
 * contact — the constraint lives in the migration, not here.
 */
export const IDENTITY_CHANNELS = ["email", "whatsapp", "instagram", "messenger", "phone"] as const;
export const IdentityChannel = z.enum(IDENTITY_CHANNELS);
export type IdentityChannel = z.infer<typeof IdentityChannel>;

export const IdentitySchema = z.object({
  id: z.uuid(),
  orgId: zOrgId,
  contactId: zContactId,
  channel: IdentityChannel,
  /** Normalized email, E.164 phone, Instagram PSID... depends on the channel. */
  externalValue: z.string().min(1),
  verified: z.boolean().default(false),
  createdAt: z.iso.datetime(),
});

export type Identity = z.infer<typeof IdentitySchema>;

// orgId never comes from the client — same rule as contact.ts (docs/adr/0026).
export const CreateIdentityInputSchema = IdentitySchema.omit({ id: true, orgId: true, createdAt: true }).partial({
  verified: true,
});
export type CreateIdentityInput = z.infer<typeof CreateIdentityInputSchema>;
