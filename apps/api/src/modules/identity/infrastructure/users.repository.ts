import { Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { auditLogs, createDbClient, permissionGroups, userPermissionGroups, users, withOrgContext, type SparkDb } from "@spark/db";
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
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
  }

  async findBySupabaseUserId(supabaseUserId: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.supabaseUserId, supabaseUserId))
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      orgId: row.orgId,
      supabaseUserId: row.supabaseUserId,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatarUrl,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
    } as User;
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
    deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
  } as User;
}
