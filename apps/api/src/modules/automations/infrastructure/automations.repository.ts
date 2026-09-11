import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";
import { automationVersions, automations, createDbClient, withOrgContext, type SparkDb } from "@spark/db";
import { automationVersionId, validateAutomationGraph, type Automation, type AutomationId, type AutomationPublishResponse, type AutomationVersion, type AutomationWriteResponse, type CreateAutomationInput, type OrgId, type PublishAutomationInput, type UpdateAutomationDraftInput, type UpdateAutomationStatusInput, type UserId } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";

@Injectable()
export class AutomationsRepository {
  private readonly db: SparkDb;
  constructor(private readonly events: DomainEventWriter) { this.db = createDbClient(process.env.DATABASE_URL ?? ""); }

  create(orgId: OrgId, actorUserId: UserId, input: CreateAutomationInput): Promise<AutomationWriteResponse> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);
      const [row] = await tx.insert(automations).values({ id: input.id, orgId, name: input.name }).returning();
      if (!row) throw new Error("Automation insert returned no row.");
      await this.events.append(tx, { orgId, type: "automation.created", data: { automationId: input.id, name: input.name, actorUserId } });
      return { automation: toAutomation(row), txid };
    });
  }

  updateDraft(orgId: OrgId, actorUserId: UserId, id: AutomationId, input: UpdateAutomationDraftInput): Promise<AutomationWriteResponse> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);
      const [row] = await tx.update(automations).set({ name: input.name, draftGraph: input.draftGraph, updatedAt: new Date() }).where(and(eq(automations.id, id), eq(automations.orgId, orgId))).returning();
      if (!row) throw new NotFoundException(`Automation ${id} not found.`);
      await this.events.append(tx, { orgId, type: "automation.draft_updated", data: { automationId: id, actorUserId, nodeCount: input.draftGraph.nodes.length } });
      return { automation: toAutomation(row), txid };
    });
  }

  updateStatus(orgId: OrgId, actorUserId: UserId, id: AutomationId, input: UpdateAutomationStatusInput): Promise<AutomationWriteResponse> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const current = await tx.select().from(automations).where(and(eq(automations.id, id), eq(automations.orgId, orgId))).limit(1);
      if (!current[0]) throw new NotFoundException(`Automation ${id} not found.`);
      if (!current[0].currentPublishedVersionId && input.status === "active") throw new BadRequestException("Publish the automation before activating it.");
      const txid = await captureTxid(tx);
      const [row] = await tx.update(automations).set({ status: input.status, updatedAt: new Date() }).where(eq(automations.id, id)).returning();
      if (!row) throw new Error("Automation update returned no row.");
      await this.events.append(tx, { orgId, type: input.status === "active" ? "automation.activated" : "automation.paused", data: { automationId: id, actorUserId } });
      return { automation: toAutomation(row), txid };
    });
  }

  publish(orgId: OrgId, actorUserId: UserId, id: AutomationId, input: PublishAutomationInput): Promise<AutomationPublishResponse> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const found = await tx.select().from(automations).where(and(eq(automations.id, id), eq(automations.orgId, orgId))).limit(1);
      const current = found[0];
      if (!current) throw new NotFoundException(`Automation ${id} not found.`);
      if (input.expectedUpdatedAt && current.updatedAt.getTime() !== new Date(input.expectedUpdatedAt).getTime()) throw new ConflictException("The draft changed in another session. Reload before publishing.");
      const issues = validateAutomationGraph(current.draftGraph);
      if (issues.length) throw new BadRequestException({ message: "Automation graph is incomplete.", issues });
      const latest = await tx.select({ version: automationVersions.version }).from(automationVersions).where(and(eq(automationVersions.automationId, id), eq(automationVersions.orgId, orgId))).orderBy(desc(automationVersions.version)).limit(1);
      const versionNumber = (latest[0]?.version ?? 0) + 1;
      const versionId = automationVersionId.create();
      const txid = await captureTxid(tx);
      const [versionRow] = await tx.insert(automationVersions).values({ id: versionId, orgId, automationId: id, version: versionNumber, graph: current.draftGraph, publishedBy: actorUserId }).returning();
      const [automationRow] = await tx.update(automations).set({ status: "active", currentPublishedVersionId: versionId, publishedVersion: versionNumber, updatedAt: new Date() }).where(eq(automations.id, id)).returning();
      if (!versionRow || !automationRow) throw new Error("Automation publish returned no row.");
      await this.events.append(tx, { orgId, type: "automation.published", data: { automationId: id, versionId, version: versionNumber, actorUserId } });
      return { automation: toAutomation(automationRow), version: toVersion(versionRow), txid };
    });
  }
}

async function captureTxid(tx: SparkDb): Promise<number> {
  const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  if (!rows[0]) throw new Error("Could not obtain transaction id.");
  return Number(rows[0].txid);
}
function toAutomation(row: typeof automations.$inferSelect): Automation {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } as Automation;
}
function toVersion(row: typeof automationVersions.$inferSelect): AutomationVersion {
  return { ...row, publishedAt: row.publishedAt.toISOString() } as AutomationVersion;
}
