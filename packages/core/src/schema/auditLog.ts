import { z } from "zod";
import { zAuditLogId, zOrgId, zServerTimestamp, zUserId } from "./zodHelpers.js";

/** Append-only business audit record. This is deliberately separate from
 * application logs: it is customer data, not diagnostic telemetry. */
export const AuditActionSchema = z.enum([
  "permission_group.created",
  "permission_group.updated",
  "permission_group.user_assigned",
]);

export const AuditLogSchema = z.object({
  id: zAuditLogId,
  orgId: zOrgId,
  actorUserId: zUserId,
  action: AuditActionSchema,
  targetType: z.literal("permission_group"),
  targetId: z.string().uuid(),
  data: z.record(z.string(), z.unknown()).default({}),
  createdAt: zServerTimestamp,
});
export type AuditLog = z.infer<typeof AuditLogSchema>;
export type AuditAction = z.infer<typeof AuditActionSchema>;
