import { z } from "zod";
import { zOrgId, zUserId, zEmail } from "./zodHelpers.js";

/**
 * User — who logs in. Role/permission detail lives in `permission_groups`
 * (docs/adr/0029-paineis-e-grupos-de-permissao.md); this schema is only
 * the account's identity, not its authorization.
 */
export const UserSchema = z.object({
  id: zUserId,
  orgId: zOrgId,
  /** sub of the JWT issued by Supabase Auth (docs/adr/0005). Never confuse
   * with `id` — they're different identifier spaces; this is what links
   * the two (see migration 0001, packages/db). */
  supabaseUserId: z.uuid(),
  name: z.string().min(1, { error: "Name is required" }).max(200),
  email: zEmail,
  avatarUrl: z.url().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deactivatedAt: z.iso.datetime().nullable(),
});

export type User = z.infer<typeof UserSchema>;

// orgId never comes from the client — same rule as contact.ts (docs/adr/0026).
// Inviting a user is always "invite someone to MY organization," never
// "create a user in whatever organization I name."
export const CreateUserInputSchema = UserSchema.omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
  deactivatedAt: true,
}).partial({ avatarUrl: true });
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
