import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";
import { automationJobs, automationRuns, automationVersions, automations, contactTags, contacts, createDbClient, tags, withOrgContext, type SparkDb } from "@spark/db";
import { automationJobId, automationRunId, automationVersionId, firstAutomationNode, validateAutomationGraph, type Automation, type AutomationId, type AutomationPublishResponse, type AutomationRun, type AutomationVersion, type AutomationWriteResponse, type CreateAutomationInput, type OrgId, type PublishAutomationInput, type StartAutomationRunInput, type StartAutomationRunResponse, type UpdateAutomationDraftInput, type UpdateAutomationStatusInput, type UserId } from "@spark/core";
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

  startRun(orgId: OrgId, actorUserId: UserId, id: AutomationId, input: StartAutomationRunInput): Promise<StartAutomationRunResponse> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [automation] = await tx.select().from(automations).where(and(eq(automations.id, id), eq(automations.orgId, orgId))).limit(1);
      if (!automation?.currentPublishedVersionId || automation.status !== "active") throw new BadRequestException("Only a published, active automation can run.");
      const [version] = await tx.select().from(automationVersions).where(and(eq(automationVersions.id, automation.currentPublishedVersionId), eq(automationVersions.orgId, orgId))).limit(1);
      if (!version) throw new NotFoundException("Published automation version not found.");
      const [contact] = await tx.select({ id: contacts.id, name: contacts.name, email: contacts.email, phone: contacts.phone, score: contacts.score, leadStatus: contacts.leadStatus }).from(contacts).where(and(eq(contacts.id, input.contactId), eq(contacts.orgId, orgId), sql`${contacts.deletedAt} IS NULL`)).limit(1);
      if (!contact) throw new BadRequestException("Contact is not available in this organization.");
      // As marcações são linhas (ADR-0035); o contexto da execução leva os nomes.
      const contactTagRows = await tx.select({ name: tags.name }).from(contactTags).innerJoin(tags, eq(contactTags.tagId, tags.id)).where(and(eq(contactTags.orgId, orgId), eq(contactTags.contactId, input.contactId)));
      const contactSnapshot = { ...contact, tags: contactTagRows.map((row) => row.name) };
      const first = firstAutomationNode(version.graph);
      if (!first) throw new BadRequestException("Published automation has no trigger.");
      const runId = automationRunId.create();
      const txid = await captureTxid(tx);
      const [row] = await tx.insert(automationRuns).values({ id: runId, orgId, automationId: id, versionId: version.id, contactId: input.contactId, status: "queued", currentNodeId: first.id, context: { ...input.context, contact: contactSnapshot } }).returning();
      await tx.insert(automationJobs).values({ id: automationJobId.create(), orgId, runId, nodeId: first.id });
      if (!row) throw new Error("Automation run insert returned no row.");
      await this.events.append(tx, { orgId, contactId: input.contactId, type: "automation.run_started", data: { automationId: id, runId, version: version.version, actorUserId } });
      return { run: toRun(row), txid };
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
function toRun(row: typeof automationRuns.$inferSelect): AutomationRun {
  return { ...row, startedAt: row.startedAt.toISOString(), completedAt: row.completedAt?.toISOString() ?? null, updatedAt: row.updatedAt.toISOString() } as AutomationRun;
}
