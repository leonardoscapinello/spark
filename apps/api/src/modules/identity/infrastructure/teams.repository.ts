import { Injectable } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { auditLogs, createDbClient, teamMembers, teams, users, withOrgContext, type SparkDb } from "@spark/db";
import type { CreateTeamInput, OrgId, Team, TeamId, UpdateTeamInput, UserId } from "@spark/core";

@Injectable()
export class TeamsRepository {
  private readonly db: SparkDb;

  constructor() {
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
  }

  async list(orgId: OrgId): Promise<Team[]> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [rows, memberships] = await Promise.all([
        tx.select().from(teams).where(eq(teams.orgId, orgId)),
        tx.select({ teamId: teamMembers.teamId, userId: teamMembers.userId }).from(teamMembers).where(eq(teamMembers.orgId, orgId)),
      ]);
      return rows.map((row) => toTeam(row, memberships.filter((item) => item.teamId === row.id).map((item) => item.userId as UserId)));
    });
  }

  async create(orgId: OrgId, actorUserId: UserId, input: CreateTeamInput): Promise<Team> {
    const memberIds = unique(input.memberIds);
    return withOrgContext(this.db, orgId, async (tx) => {
      await assertUsersBelongToOrg(tx, orgId, memberIds);
      const [row] = await tx.insert(teams).values({ id: input.id, orgId, name: input.name, description: input.description ?? null }).returning();
      if (!row) throw new Error("Team insert returned no row.");
      if (memberIds.length) await tx.insert(teamMembers).values(memberIds.map((userId) => ({ orgId, teamId: input.id, userId })));
      await tx.insert(auditLogs).values({ orgId, actorUserId, action: "team.created", targetType: "team", targetId: input.id, data: { name: input.name, memberCount: memberIds.length } });
      return toTeam(row, memberIds);
    });
  }

  async update(orgId: OrgId, actorUserId: UserId, id: TeamId, input: UpdateTeamInput): Promise<Team | null> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.update(teams).set({ name: input.name, description: input.description, updatedAt: new Date() })
        .where(and(eq(teams.orgId, orgId), eq(teams.id, id))).returning();
      if (!row) return null;
      const memberships = await tx.select({ userId: teamMembers.userId }).from(teamMembers).where(and(eq(teamMembers.orgId, orgId), eq(teamMembers.teamId, id)));
      await tx.insert(auditLogs).values({ orgId, actorUserId, action: "team.updated", targetType: "team", targetId: id, data: { name: input.name } });
      return toTeam(row, memberships.map((item) => item.userId as UserId));
    });
  }

  async replaceMembers(orgId: OrgId, actorUserId: UserId, id: TeamId, requestedMemberIds: UserId[]): Promise<Team | null> {
    const memberIds = unique(requestedMemberIds);
    return withOrgContext(this.db, orgId, async (tx) => {
      const [team] = await tx.select().from(teams).where(and(eq(teams.orgId, orgId), eq(teams.id, id))).limit(1);
      if (!team) return null;
      await assertUsersBelongToOrg(tx, orgId, memberIds);
      await tx.delete(teamMembers).where(and(eq(teamMembers.orgId, orgId), eq(teamMembers.teamId, id)));
      if (memberIds.length) await tx.insert(teamMembers).values(memberIds.map((userId) => ({ orgId, teamId: id, userId })));
      const [updated] = await tx.update(teams).set({ updatedAt: new Date() }).where(eq(teams.id, id)).returning();
      if (!updated) return null;
      await tx.insert(auditLogs).values({ orgId, actorUserId, action: "team.members_replaced", targetType: "team", targetId: id, data: { memberCount: memberIds.length } });
      return toTeam(updated, memberIds);
    });
  }

  async setArchived(orgId: OrgId, actorUserId: UserId, id: TeamId, archived: boolean): Promise<Team | null> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.update(teams).set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
        .where(and(eq(teams.orgId, orgId), eq(teams.id, id))).returning();
      if (!row) return null;
      const memberships = await tx.select({ userId: teamMembers.userId }).from(teamMembers).where(and(eq(teamMembers.orgId, orgId), eq(teamMembers.teamId, id)));
      await tx.insert(auditLogs).values({ orgId, actorUserId, action: archived ? "team.archived" : "team.restored", targetType: "team", targetId: id, data: {} });
      return toTeam(row, memberships.map((item) => item.userId as UserId));
    });
  }
}

function unique(ids: UserId[]): UserId[] {
  return [...new Set(ids)];
}

async function assertUsersBelongToOrg(tx: SparkDb, orgId: OrgId, memberIds: UserId[]): Promise<void> {
  if (!memberIds.length) return;
  const rows = await tx.select({ id: users.id }).from(users).where(and(eq(users.orgId, orgId), inArray(users.id, memberIds)));
  if (rows.length !== memberIds.length) throw new Error("One or more team members do not belong to this organization.");
}

function toTeam(row: typeof teams.$inferSelect, memberIds: UserId[]): Team {
  return {
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    description: row.description,
    memberIds,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() ?? null,
  } as Team;
}
