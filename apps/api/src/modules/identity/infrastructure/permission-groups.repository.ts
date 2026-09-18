import { Injectable } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { auditLogs, createAppDbClient, permissionGroupCapabilities, permissionGroups, userPermissionGroups, users, withOrgContext, type SparkDb } from "@spark/db";
import { DEFAULT_GROUPS, type AuditAction, type Capability, type CreatePermissionGroupInput, type OrgId, type PermissionGroup, type PermissionGroupId, type UpdatePermissionGroupInput, type UserId } from "@spark/core";

/**
 * Admin connection, not withOrgContext — same reason as UsersRepository:
 * seedDefaultGroups runs in the middle of provisioning a new organization,
 * before there's a request "inside" it to open an RLS context
 * (docs/adr/0022, docs/adr/0026).
 *
 * As capacidades moram em `permission_group_capabilities`, uma por linha
 * (ADR-0035): é o que permite perguntar quem tem uma capacidade sem abrir
 * todos os grupos, e o que faz a chave estrangeira do grupo existir de
 * verdade. O grupo em si nunca é lido sem elas — daí todo caminho de leitura
 * passar por `withCapabilities`.
 */
@Injectable()
export class PermissionGroupsRepository {
  private readonly db: SparkDb;

  constructor() {
    this.db = createAppDbClient();
  }

  /**
   * An organization created before ADR-0029 existed never received the
   * five default groups — found while testing login on an old dev
   * account: no group at all, `hasCapability` denies everything, forever,
   * with no way to self-heal. The administrative provisioning flow calls this on the
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
      .values(DEFAULT_GROUPS.map((group) => ({ orgId, name: group.name })))
      .returning();

    const capabilityRows = rows.flatMap((row, index) =>
      (DEFAULT_GROUPS[index]?.capabilities ?? []).map((capability) => ({ orgId, groupId: row.id, capability })),
    );
    if (capabilityRows.length > 0) await this.db.insert(permissionGroupCapabilities).values(capabilityRows).onConflictDoNothing();

    return rows.map((row, index) => toPermissionGroup(row, [...(DEFAULT_GROUPS[index]?.capabilities ?? [])]));
  }

  async list(orgId: OrgId): Promise<PermissionGroup[]> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const rows = await tx.select().from(permissionGroups).where(eq(permissionGroups.orgId, orgId));
      return this.withCapabilities(tx, rows);
    });
  }

  async create(orgId: OrgId, actorUserId: UserId, input: CreatePermissionGroupInput): Promise<PermissionGroup> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.insert(permissionGroups).values({
        id: input.id,
        orgId,
        name: input.name,
      }).returning();
      if (!row) throw new Error("Permission group insert returned no row.");
      await this.replaceCapabilities(tx, orgId, row.id, input.capabilities);
      const group = toPermissionGroup(row, [...input.capabilities]);
      await this.audit(tx, orgId, actorUserId, "permission_group.created", group.id, { name: group.name, capabilities: group.capabilities });
      return group;
    });
  }

  async update(orgId: OrgId, actorUserId: UserId, id: PermissionGroupId, input: UpdatePermissionGroupInput): Promise<PermissionGroup | null> {
    return withOrgContext(this.db, orgId, async (tx) => {
      // `capabilities` não é coluna de `permission_groups`; o resto do input é.
      const { capabilities, ...columns } = input;
      const [row] = await tx.update(permissionGroups).set({ ...columns, updatedAt: new Date() })
        .where(and(eq(permissionGroups.id, id), eq(permissionGroups.orgId, orgId))).returning();
      if (!row) return null;
      if (capabilities !== undefined) await this.replaceCapabilities(tx, orgId, row.id, capabilities);
      const [group] = await this.withCapabilities(tx, [row]);
      if (!group) return null;
      await this.audit(tx, orgId, actorUserId, "permission_group.updated", group.id, input);
      return group;
    });
  }

  async assignGroup(userId: UserId, groupId: PermissionGroup["id"]): Promise<void> {
    await this.db.insert(userPermissionGroups).values({ orgId: await this.orgIdOfGroup(groupId), userId, groupId }).onConflictDoNothing();
  }

  async assignUser(orgId: OrgId, actorUserId: UserId, userId: UserId, groupId: PermissionGroupId): Promise<boolean> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [user] = await tx.select({ id: users.id }).from(users)
        .where(and(eq(users.id, userId), eq(users.orgId, orgId))).limit(1);
      const [group] = await tx.select({ id: permissionGroups.id }).from(permissionGroups)
        .where(and(eq(permissionGroups.id, groupId), eq(permissionGroups.orgId, orgId))).limit(1);
      if (!user || !group) return false;
      await tx.insert(userPermissionGroups).values({ orgId, userId, groupId }).onConflictDoNothing();
      await this.audit(tx, orgId, actorUserId, "permission_group.user_assigned", groupId, { userId });
      return true;
    });
  }

  private async audit(tx: SparkDb, orgId: OrgId, actorUserId: UserId, action: AuditAction, targetId: PermissionGroupId, data: Record<string, unknown>): Promise<void> {
    await tx.insert(auditLogs).values({ orgId, actorUserId, action, targetType: "permission_group", targetId, data });
  }

  async getUserCapabilities(userId: UserId): Promise<PermissionGroup[]> {
    const rows = await this.db
      .select({ group: permissionGroups })
      .from(userPermissionGroups)
      .innerJoin(permissionGroups, eq(userPermissionGroups.groupId, permissionGroups.id))
      .where(eq(userPermissionGroups.userId, userId));

    return this.withCapabilities(this.db, rows.map((l) => l.group));
  }

  /** Apaga e regrava: a lista do grupo é substituída inteira, nunca mesclada. */
  private async replaceCapabilities(tx: SparkDb, orgId: OrgId, groupId: string, capabilities: readonly Capability[]): Promise<void> {
    await tx.delete(permissionGroupCapabilities).where(eq(permissionGroupCapabilities.groupId, groupId));
    if (capabilities.length === 0) return;
    await tx.insert(permissionGroupCapabilities)
      .values([...new Set(capabilities)].map((capability) => ({ orgId, groupId, capability })))
      .onConflictDoNothing();
  }

  /** Uma consulta para todos os grupos da lista, não uma por grupo. */
  private async withCapabilities(tx: SparkDb, rows: readonly PermissionGroupRow[]): Promise<PermissionGroup[]> {
    if (rows.length === 0) return [];
    const granted = await tx
      .select({ groupId: permissionGroupCapabilities.groupId, capability: permissionGroupCapabilities.capability })
      .from(permissionGroupCapabilities)
      .where(inArray(permissionGroupCapabilities.groupId, rows.map((row) => row.id)));

    const byGroup = new Map<string, Capability[]>();
    for (const row of granted) {
      const list = byGroup.get(row.groupId) ?? [];
      list.push(row.capability as Capability);
      byGroup.set(row.groupId, list);
    }
    return rows.map((row) => toPermissionGroup(row, byGroup.get(row.id) ?? []));
  }

  private async orgIdOfGroup(groupId: PermissionGroup["id"]): Promise<OrgId> {
    const [row] = await this.db.select({ orgId: permissionGroups.orgId }).from(permissionGroups).where(eq(permissionGroups.id, groupId)).limit(1);
    if (!row) throw new Error(`Permission group ${groupId} not found.`);
    return row.orgId as OrgId;
  }
}

interface PermissionGroupRow {
  id: string;
  orgId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

function toPermissionGroup(row: PermissionGroupRow, capabilities: Capability[]): PermissionGroup {
  return {
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    capabilities,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } as PermissionGroup;
}
