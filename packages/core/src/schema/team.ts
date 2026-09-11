import { z } from "zod";
import { zOrgId, zServerTimestamp, zTeamId, zUserId } from "./zodHelpers.js";

export const TeamSchema = z.object({
  id: zTeamId,
  orgId: zOrgId,
  name: z.string().trim().min(1, { error: "Team name is required" }).max(100),
  description: z.string().trim().max(500).nullable(),
  memberIds: z.array(zUserId),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
  archivedAt: zServerTimestamp.nullable(),
});
export type Team = z.infer<typeof TeamSchema>;

export const CreateTeamInputSchema = z.object({
  id: zTeamId,
  name: TeamSchema.shape.name,
  description: TeamSchema.shape.description.optional(),
  memberIds: z.array(zUserId).default([]),
});
export type CreateTeamInput = z.infer<typeof CreateTeamInputSchema>;

export const UpdateTeamInputSchema = z.object({
  name: TeamSchema.shape.name,
  description: TeamSchema.shape.description,
});
export type UpdateTeamInput = z.infer<typeof UpdateTeamInputSchema>;

export const ReplaceTeamMembersInputSchema = z.object({ memberIds: z.array(zUserId) });
export type ReplaceTeamMembersInput = z.infer<typeof ReplaceTeamMembersInputSchema>;

export const SetTeamArchivedInputSchema = z.object({ archived: z.boolean() });
export type SetTeamArchivedInput = z.infer<typeof SetTeamArchivedInputSchema>;
