import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { createDbClient, permissionGroups, userPermissionGroups, type SparkDb } from "@spark/db";
import { DEFAULT_GROUPS, type Capability, type OrgId, type PermissionGroup, type UserId } from "@spark/core";

/**
 * Admin connection, not withOrgContext — same reason as UsersRepository:
 * seedDefaultGroups runs in the middle of provisioning a new organization,
 * before there's a request "inside" it to open an RLS context
 * (docs/adr/0022, docs/adr/0026).
 */
@Injectable()
export class PermissionGroupsRepository {
  private readonly db: SparkDb;

  constructor() {
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
  }

  /**
   * An organization created before ADR-0029 existed never received the
   * five default groups — found while testing login on an old dev
   * account: no group at all, `hasCapability` denies everything, forever,
   * with no way to self-heal. `dev-login.controller.ts` calls this on the
   * EXISTING-user path before deciding whether to seed — without this
   * check, `seedDefaultGroups` (an INSERT with no check) would duplicate
   * the five groups on every new login.
   */
  async orgHasGroups(orgId: OrgId): Promise<boolean> {
    const [row] = await this.db.select({ id: permissionGroups.id }).from(permissionGroups).where(eq(permissionGroups.orgId, orgId)).limit(1);
    return !!row;
  }

  /** Called once, when the organization is created (docs/adr/0029). */
  async seedDefaultGroups(orgId: OrgId): Promise<PermissionGroup[]> {
    const rows = await this.db
      .insert(permissionGroups)
      .values(DEFAULT_GROUPS.map((group) => ({ orgId, name: group.name, capabilities: [...group.capabilities] })))
      .returning();

    return rows.map(toPermissionGroup);
  }

  async assignGroup(userId: UserId, groupId: PermissionGroup["id"]): Promise<void> {
    await this.db.insert(userPermissionGroups).values({ orgId: await this.orgIdOfGroup(groupId), userId, groupId });
  }

  async getUserCapabilities(userId: UserId): Promise<PermissionGroup[]> {
    const rows = await this.db
      .select({ group: permissionGroups })
      .from(userPermissionGroups)
      .innerJoin(permissionGroups, eq(userPermissionGroups.groupId, permissionGroups.id))
      .where(eq(userPermissionGroups.userId, userId));

    return rows.map((l) => toPermissionGroup(l.group));
  }

  private async orgIdOfGroup(groupId: PermissionGroup["id"]): Promise<OrgId> {
    const [row] = await this.db.select({ orgId: permissionGroups.orgId }).from(permissionGroups).where(eq(permissionGroups.id, groupId)).limit(1);
    if (!row) throw new Error(`Permission group ${groupId} not found.`);
    return row.orgId as OrgId;
  }
}

function toPermissionGroup(row: {
  id: string;
  orgId: string;
  name: string;
  capabilities: unknown;
  createdAt: Date;
  updatedAt: Date;
}): PermissionGroup {
  return {
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    capabilities: row.capabilities as Capability[],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } as PermissionGroup;
}
