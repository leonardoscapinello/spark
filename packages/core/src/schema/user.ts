import { z } from "zod";
import { zOrgId, zPermissionGroupId, zUserId, zEmail } from "./zodHelpers.js";
import { CAPABILITIES } from "../policy/capability.js";

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
  invitedAt: z.iso.datetime().nullable(),
  activatedAt: z.iso.datetime().nullable(),
  deactivatedAt: z.iso.datetime().nullable(),
});

export type User = z.infer<typeof UserSchema>;

export const CurrentUserSchema = UserSchema.extend({
  capabilities: z.array(z.enum(CAPABILITIES)),
});
export type CurrentUser = z.infer<typeof CurrentUserSchema>;

// orgId never comes from the client — same rule as contact.ts (docs/adr/0026).
// Inviting a user is always "invite someone to MY organization," never
// "create a user in whatever organization I name."
export const CreateUserInputSchema = UserSchema.omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
  invitedAt: true,
  activatedAt: true,
  deactivatedAt: true,
}).partial({ avatarUrl: true });
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const AdminUserSchema = UserSchema.extend({
  groupIds: z.array(zPermissionGroupId),
});
export type AdminUser = z.infer<typeof AdminUserSchema>;

export const InviteUserInputSchema = z.object({
  id: zUserId,
  name: z.string().trim().min(1, { error: "Name is required" }).max(200),
  email: zEmail,
  groupId: zPermissionGroupId,
});
export type InviteUserInput = z.infer<typeof InviteUserInputSchema>;
