import { BadRequestException, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { auditLogs, createAppDbClient, withOrgContext, serviceCategories, serviceStatuses, serviceLevels, priorityMatrix, slaPolicies, type SparkDb } from "@spark/db";
import { ServiceCategorySchema, ServiceStatusSchema, ServiceLevelSchema, PriorityMatrixSchema, SlaPolicySchema, validateServiceConfiguration, type OrgId, type UserId, type SaveServiceConfiguration, type ServiceConfiguration } from "@spark/core";

export async function readServiceConfiguration(tx: SparkDb, orgId: OrgId): Promise<ServiceConfiguration> {
  const [categories, statuses, levels, matrix, policies] = await Promise.all([
    tx.select().from(serviceCategories).where(eq(serviceCategories.orgId, orgId)),
    tx.select().from(serviceStatuses).where(eq(serviceStatuses.orgId, orgId)),
    tx.select().from(serviceLevels).where(eq(serviceLevels.orgId, orgId)),
    tx.select().from(priorityMatrix).where(eq(priorityMatrix.orgId, orgId)),
    tx.select().from(slaPolicies).where(eq(slaPolicies.orgId, orgId)),
  ]);
  const dates = <T extends { createdAt: Date; updatedAt: Date }>(row: T) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  return { categories: categories.map(row => ServiceCategorySchema.parse(dates(row))), statuses: statuses.map(row => ServiceStatusSchema.parse(dates(row))), levels: levels.map(row => ServiceLevelSchema.parse(dates(row))), matrix: matrix.map(row => PriorityMatrixSchema.parse(dates(row))), policies: policies.map(row => SlaPolicySchema.parse(dates(row))) };
}
@Injectable()
export class ServiceConfigurationRepository {
  private readonly db = createAppDbClient();
  save(orgId: OrgId, actorUserId: UserId, input: SaveServiceConfiguration) {
    return withOrgContext(this.db, orgId, async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`service-config:${orgId}`}, 0))`);
      const current = await readServiceConfiguration(tx, orgId);
      const now = new Date();
      const base = { orgId, createdAt: now.toISOString(), updatedAt: now.toISOString() };
      const replace = <T extends { id: string }>(rows: readonly T[], row: T): T[] => [...rows.filter(r => r.id !== row.id), row];
      const next = { ...current };
      switch (input.kind) {
        case "category": next.categories = replace(current.categories, ServiceCategorySchema.parse({ ...input, ...base })); break;
        case "status": next.statuses = replace(current.statuses, ServiceStatusSchema.parse({ ...input, ...base })); break;
        case "level": next.levels = replace(current.levels, ServiceLevelSchema.parse({ ...input, ...base, kind: input.levelKind })); break;
        case "matrix": next.matrix = replace(current.matrix, PriorityMatrixSchema.parse({ ...input, ...base })); break;
        case "policy": next.policies = replace(current.policies, SlaPolicySchema.parse({ ...input, ...base, version: (current.policies.find(p => p.id === input.id)?.version ?? 0) + 1 })); break;
      }
      try { validateServiceConfiguration(next); } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Configuração inválida."); }
      switch (input.kind) {
        case "category": { const { kind: _kind, ...row } = input; await tx.insert(serviceCategories).values({ ...row, orgId }).onConflictDoUpdate({ target: serviceCategories.id, set: { ...row, updatedAt: now }, setWhere: eq(serviceCategories.orgId, orgId) }); break; }
        case "status": { const { kind: _kind, ...row } = input; await tx.insert(serviceStatuses).values({ ...row, orgId }).onConflictDoUpdate({ target: serviceStatuses.id, set: { ...row, updatedAt: now }, setWhere: eq(serviceStatuses.orgId, orgId) }); break; }
        case "level": { const { kind: _kind, levelKind, ...rest } = input; const row = { ...rest, kind: levelKind }; await tx.insert(serviceLevels).values({ ...row, orgId }).onConflictDoUpdate({ target: serviceLevels.id, set: { ...row, updatedAt: now }, setWhere: eq(serviceLevels.orgId, orgId) }); break; }
        case "matrix": { const { kind: _kind, ...row } = input; await tx.insert(priorityMatrix).values({ ...row, orgId }).onConflictDoUpdate({ target: priorityMatrix.id, set: { ...row, updatedAt: now }, setWhere: eq(priorityMatrix.orgId, orgId) }); break; }
        case "policy": { const { kind: _kind, ...rest } = input; const row = { ...rest, version: (current.policies.find(p => p.id === input.id)?.version ?? 0) + 1 }; await tx.insert(slaPolicies).values({ ...row, orgId }).onConflictDoUpdate({ target: slaPolicies.id, set: { ...row, updatedAt: now }, setWhere: eq(slaPolicies.orgId, orgId) }); break; }
      }
      await tx.insert(auditLogs).values({ orgId, actorUserId, action: "service_configuration.saved", targetType: input.kind, targetId: input.id, data: input });
      const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
      return { txid: Number(rows[0]?.txid) };
    });
  }
}
