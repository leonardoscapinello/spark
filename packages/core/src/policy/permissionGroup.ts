import { z } from "zod";
import { zOrgId, zPermissionGroupId, zUserId } from "../schema/zodHelpers.js";
import { CAPABILITIES } from "./capability.js";

/**
 * Group → capabilities, never a fixed role (docs/adr/0029). Every
 * organization is born with five default groups (see defaultGroups.ts)
 * and can create its own.
 */
export const PermissionGroupSchema = z.object({
  id: zPermissionGroupId,
  orgId: zOrgId,
  name: z.string().min(1, { error: "Group name is required" }).max(100),
  capabilities: z.array(z.enum(CAPABILITIES)),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type PermissionGroup = z.infer<typeof PermissionGroupSchema>;

// orgId never comes from the client — same rule as contact.ts/user.ts
// (docs/adr/0026). id is required: same reason as docs/adr/0030 — if
// groups ever enter a local-first collection, optimistic writes need the
// final key before the server responds.
export const CreatePermissionGroupInputSchema = PermissionGroupSchema.omit({
  orgId: true,
  createdAt: true,
  updatedAt: true,
});
export type CreatePermissionGroupInput = z.infer<typeof CreatePermissionGroupInputSchema>;

export const UpdatePermissionGroupInputSchema = CreatePermissionGroupInputSchema.omit({ id: true }).partial();
export type UpdatePermissionGroupInput = z.infer<typeof UpdatePermissionGroupInputSchema>;

/** The only input necessary to add a member to a group. Both identifiers
 * are verified against the current organization by the repository; an id
 * alone never grants cross-organization access (docs/adr/0026). */
export const AssignUserToPermissionGroupInputSchema = z.object({
  userId: zUserId,
});
export type AssignUserToPermissionGroupInput = z.infer<typeof AssignUserToPermissionGroupInputSchema>;
