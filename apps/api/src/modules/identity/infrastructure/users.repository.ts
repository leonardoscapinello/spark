import { Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { auditLogs, createAppDbClient, permissionGroups, userPermissionGroups, users, withOrgContext, type SparkDb } from "@spark/db";
import type { AdminUser, InviteUserInput, OrgId, PermissionGroupId, User, UserId } from "@spark/core";

/**
 * Resolving "which user is this JWT" is, by nature, a query that crosses
 * organizations — it's what DEFINES which organization the rest of the
 * request will operate in. That's why it uses the admin connection
 * (bypasses RLS), not app_user: there's no way to require
 * `app.current_org_id` to discover the very org_id it's looking for
 * (docs/adr/0022, docs/adr/0026). Every query AFTER this one, for the rest
 * of the request, goes through withOrgContext normally.
 */
@Injectable()
export class UsersRepository {
  private readonly db: SparkDb;

  constructor() {
    this.db = createAppDbClient();
  }

  async findBySupabaseUserId(supabaseUserId: string): Promise<User | null> {
    const [found] = await this.db
      .select()
      .from(users)
      .where(eq(users.supabaseUserId, supabaseUserId))
      .limit(1);

    if (!found) return null;

    const [row] = found.activatedAt || found.deactivatedAt
      ? [found]
      : await this.db.update(users).set({ activatedAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, found.id)).returning();
    if (!row) return null;

    return toUser(row);
  }

  async listByOrg(orgId: OrgId): Promise<AdminUser[]> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [userRows, memberships] = await Promise.all([
        tx.select().from(users).where(eq(users.orgId, orgId)),
        tx.select({ userId: userPermissionGroups.userId, groupId: userPermissionGroups.groupId })
          .from(userPermissionGroups).where(eq(userPermissionGroups.orgId, orgId)),
      ]);
      return userRows.map((row) => ({
        ...toUser(row),
        groupIds: memberships.filter((membership) => membership.userId === row.id).map((membership) => membership.groupId),
      })) as AdminUser[];
    });
  }

  async findById(orgId: OrgId, id: UserId): Promise<User | null> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.select().from(users)
        .where(and(eq(users.orgId, orgId), eq(users.id, id))).limit(1);
      return row ? toUser(row) : null;
    });
  }

  async groupExists(orgId: OrgId, groupId: PermissionGroupId): Promise<boolean> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.select({ id: permissionGroups.id }).from(permissionGroups)
        .where(and(eq(permissionGroups.orgId, orgId), eq(permissionGroups.id, groupId))).limit(1);
      return !!row;
    });
  }

  async emailExists(orgId: OrgId, email: string): Promise<boolean> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.select({ id: users.id }).from(users)
        .where(and(eq(users.orgId, orgId), eq(users.email, email))).limit(1);
      return !!row;
    });
  }

  async createInvited(orgId: OrgId, actorUserId: UserId, input: InviteUserInput, supabaseUserId: string): Promise<AdminUser> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.insert(users).values({
        id: input.id,
        orgId,
        supabaseUserId,
        name: input.name,
        email: input.email,
        invitedAt: new Date(),
      }).returning();
      if (!row) throw new Error("User insert returned no row.");
      await tx.insert(userPermissionGroups).values({ orgId, userId: input.id, groupId: input.groupId });
      await tx.insert(auditLogs).values({
        orgId,
        actorUserId,
        action: "user.invited",
        targetType: "user",
        targetId: input.id,
        data: { email: input.email, groupId: input.groupId },
      });
      return { ...toUser(row), groupIds: [input.groupId] } as AdminUser;
    });
  }

  async updateAccess(orgId: OrgId, actorUserId: UserId, targetUserId: UserId, active: boolean): Promise<AdminUser | null> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.update(users).set({
        deactivatedAt: active ? null : new Date(),
        updatedAt: new Date(),
      }).where(and(eq(users.orgId, orgId), eq(users.id, targetUserId))).returning();
      if (!row) return null;

      const memberships = await tx.select({ groupId: userPermissionGroups.groupId })
        .from(userPermissionGroups).where(eq(userPermissionGroups.userId, targetUserId));
      await tx.insert(auditLogs).values({
        orgId,
        actorUserId,
        action: "user.access_updated",
        targetType: "user",
        targetId: targetUserId,
        data: { active },
      });
      return { ...toUser(row), groupIds: memberships.map((membership) => membership.groupId) } as AdminUser;
    });
  }

  async replacePermissionGroup(orgId: OrgId, actorUserId: UserId, targetUserId: UserId, groupId: PermissionGroupId): Promise<AdminUser | null> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [user] = await tx.select().from(users)
        .where(and(eq(users.orgId, orgId), eq(users.id, targetUserId))).limit(1);
      const [group] = await tx.select({ id: permissionGroups.id }).from(permissionGroups)
        .where(and(eq(permissionGroups.orgId, orgId), eq(permissionGroups.id, groupId))).limit(1);
      if (!user || !group) return null;

      await tx.delete(userPermissionGroups).where(and(
        eq(userPermissionGroups.orgId, orgId),
        eq(userPermissionGroups.userId, targetUserId),
      ));
      await tx.insert(userPermissionGroups).values({ orgId, userId: targetUserId, groupId });
      await tx.insert(auditLogs).values({
        orgId,
        actorUserId,
        action: "user.permission_group_replaced",
        targetType: "user",
        targetId: targetUserId,
        data: { groupId },
      });
      return { ...toUser(user), groupIds: [groupId] } as AdminUser;
    });
  }
}

function toUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    orgId: row.orgId,
    supabaseUserId: row.supabaseUserId,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    invitedAt: row.invitedAt?.toISOString() ?? null,
    activatedAt: row.activatedAt?.toISOString() ?? null,
    deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
  } as User;
}
