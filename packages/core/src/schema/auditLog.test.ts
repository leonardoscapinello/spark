import { describe, expect, it } from "vitest";
import { auditLogId, orgId, permissionGroupId, userId } from "../identity/id.js";
import { AuditLogSchema } from "./auditLog.js";

describe("AuditLogSchema", () => {
  it("accepts only the explicit high-impact permission actions", () => {
    const value = {
      id: auditLogId.create(), orgId: orgId.create(), actorUserId: userId.create(),
      action: "permission_group.created", targetType: "permission_group", targetId: permissionGroupId.create(),
      data: { name: "Equipe comercial" }, createdAt: new Date().toISOString(),
    };
    expect(AuditLogSchema.parse(value).action).toBe("permission_group.created");
    expect(AuditLogSchema.safeParse({ ...value, action: "permission_group.deleted" }).success).toBe(false);
  });
});
