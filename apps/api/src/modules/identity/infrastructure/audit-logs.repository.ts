import { Injectable } from "@nestjs/common";
import { desc, eq, inArray } from "drizzle-orm";
import { auditLogs, createDbClient, permissionGroups, teams, users, withOrgContext, type SparkDb } from "@spark/db";
import type { AdminAuditLog, AuditAction, OrgId, UserId } from "@spark/core";

@Injectable()
export class AuditLogsRepository {
  private readonly db: SparkDb;

  constructor() {
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
  }

  async listByOrg(orgId: OrgId): Promise<AdminAuditLog[]> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const logs = await tx.select().from(auditLogs)
        .where(eq(auditLogs.orgId, orgId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(200);

      const actorIds = [...new Set(logs.map((log) => log.actorUserId))];
      const userTargetIds = logs.filter((log) => log.targetType === "user").map((log) => log.targetId);
      const groupTargetIds = logs.filter((log) => log.targetType === "permission_group").map((log) => log.targetId);
      const teamTargetIds = logs.filter((log) => log.targetType === "team").map((log) => log.targetId);
      const [actors, targetUsers, targetGroups, targetTeams] = await Promise.all([
        actorIds.length ? tx.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, actorIds)) : [],
        userTargetIds.length ? tx.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userTargetIds)) : [],
        groupTargetIds.length ? tx.select({ id: permissionGroups.id, name: permissionGroups.name }).from(permissionGroups).where(inArray(permissionGroups.id, groupTargetIds)) : [],
        teamTargetIds.length ? tx.select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, teamTargetIds)) : [],
      ]);
      const actorNames = new Map(actors.map((actor) => [actor.id, actor.name]));
      const targetNames = new Map([...targetUsers, ...targetGroups, ...targetTeams].map((target) => [target.id, target.name]));

      return logs.map((log) => ({
        id: log.id,
        orgId: log.orgId,
        actorUserId: log.actorUserId as UserId,
        actorName: actorNames.get(log.actorUserId) ?? "Usuário removido",
        action: log.action as AuditAction,
        targetType: log.targetType as "permission_group" | "user" | "team",
        targetId: log.targetId,
        targetLabel: targetNames.get(log.targetId) ?? "Registro removido",
        data: log.data as Record<string, unknown>,
        createdAt: log.createdAt.toISOString(),
      })) as AdminAuditLog[];
    });
  }
}
