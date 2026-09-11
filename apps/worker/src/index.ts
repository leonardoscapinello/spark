import { Worker, type ConnectionOptions, type Job } from "bullmq";
import { and, desc, eq } from "drizzle-orm";
import { automationJobs, automationRuns, automationRunSteps, automationTimers, automationVersions, contacts, createDbClient, events, withOrgContext, type SparkDb } from "@spark/db";
import { automationJobId, automationStepId, automationTimerId, contactId as contactIdFactory, eventId, orgId as orgIdFactory, resolveAutomationTransition, automationWaitMilliseconds, type AutomationNode, type ContactId, type OrgId } from "@spark/core";

export const APP_NAME = "@spark/worker" as const;
export const AUTOMATION_QUEUE = "automation";
interface AutomationJobData { jobId: string; orgId: string; runId: string; nodeId: string; resume?: boolean }

export async function executeAutomationJob(db: SparkDb, data: AutomationJobData): Promise<void> {
  const orgId = orgIdFactory.from(data.orgId);
  await withOrgContext(db, orgId, async (tx) => {
    const [jobRow] = await tx.select().from(automationJobs).where(and(eq(automationJobs.id, automationJobId.from(data.jobId)), eq(automationJobs.orgId, orgId))).limit(1);
    if (!jobRow || jobRow.completedAt) return;
    const [run] = await tx.select().from(automationRuns).where(and(eq(automationRuns.id, data.runId), eq(automationRuns.orgId, orgId))).limit(1);
    if (!run || ["completed", "failed", "cancelled"].includes(run.status)) { await tx.update(automationJobs).set({ completedAt: new Date() }).where(eq(automationJobs.id, jobRow.id)); return; }
    const [version] = await tx.select().from(automationVersions).where(and(eq(automationVersions.id, run.versionId), eq(automationVersions.orgId, orgId))).limit(1);
    const node = version?.graph.nodes.find((item) => item.id === data.nodeId);
    if (!version || !node) throw new Error(`Automation node ${data.nodeId} no longer exists in immutable version.`);
    const latest = await tx.select({ attempt: automationRunSteps.attempt }).from(automationRunSteps).where(and(eq(automationRunSteps.runId, run.id), eq(automationRunSteps.nodeId, node.id))).orderBy(desc(automationRunSteps.attempt)).limit(1);
    const attempt = (latest[0]?.attempt ?? 0) + 1;
    const stepId = automationStepId.create();
    await tx.insert(automationRunSteps).values({ id: stepId, orgId, runId: run.id, nodeId: node.id, attempt, status: "running" });
    await tx.update(automationRuns).set({ status: "running", currentNodeId: node.id, updatedAt: new Date() }).where(eq(automationRuns.id, run.id));

    if (node.type === "wait" && !jobRow.resume) {
      const delay = automationWaitMilliseconds(node.data.config);
      const fireAt = new Date(Date.now() + delay);
      await tx.insert(automationTimers).values({ id: automationTimerId.create(), orgId, runId: run.id, nodeId: node.id, fireAt });
      await tx.update(automationRunSteps).set({ status: "waiting", result: { fireAt: fireAt.toISOString() }, finishedAt: new Date() }).where(eq(automationRunSteps.id, stepId));
      await tx.update(automationRuns).set({ status: "waiting", updatedAt: new Date() }).where(eq(automationRuns.id, run.id));
      await tx.update(automationJobs).set({ completedAt: new Date() }).where(eq(automationJobs.id, jobRow.id));
      return;
    }

    const result = node.type === "action" ? await executeAction(tx, orgId, contactIdFactory.from(run.contactId), node) : {};
    const transition = resolveAutomationTransition(version.graph, node, run.context);
    const completedAt = new Date();
    await tx.update(automationRunSteps).set({ status: "completed", result: { ...result, ...transition.result }, finishedAt: completedAt }).where(eq(automationRunSteps.id, stepId));
    await tx.update(automationJobs).set({ completedAt }).where(eq(automationJobs.id, jobRow.id));
    if (!transition.nextNodeIds.length) {
      await tx.update(automationRuns).set({ status: "completed", currentNodeId: null, completedAt, updatedAt: completedAt }).where(eq(automationRuns.id, run.id));
      await tx.insert(events).values({ id: eventId.create(), orgId, contactId: run.contactId, type: "automation.run_completed", data: { automationId: run.automationId, runId: run.id } });
      return;
    }
    await tx.insert(automationJobs).values(transition.nextNodeIds.map((nodeId) => ({ id: automationJobId.create(), orgId, runId: run.id, nodeId })));
    await tx.update(automationRuns).set({ status: "queued", currentNodeId: transition.nextNodeIds[0] ?? null, updatedAt: completedAt }).where(eq(automationRuns.id, run.id));
  });
}

async function executeAction(tx: SparkDb, orgId: OrgId, contactId: ContactId, node: AutomationNode): Promise<Record<string, unknown>> {
  const operation = node.data.config.operation;
  const value = node.data.config.value;
  const [contact] = await tx.select().from(contacts).where(and(eq(contacts.id, contactId), eq(contacts.orgId, orgId))).limit(1);
  if (!contact) throw new Error("Automation contact not found.");
  const contactTags = Array.isArray(contact.tags) ? contact.tags.filter((tag): tag is string => typeof tag === "string") : [];
  if (operation === "contact.add_tag" && typeof value === "string") {
    const tags = Array.from(new Set([...contactTags, value]));
    await tx.update(contacts).set({ tags, updatedAt: new Date() }).where(eq(contacts.id, contact.id));
    await tx.insert(events).values({ id: eventId.create(), orgId, contactId: contact.id, type: "contact.updated", data: { automation: true, addedTag: value } });
    return { operation, addedTag: value };
  }
  if (operation === "contact.remove_tag" && typeof value === "string") {
    const tags = contactTags.filter((tag) => tag !== value);
    await tx.update(contacts).set({ tags, updatedAt: new Date() }).where(eq(contacts.id, contact.id));
    return { operation, removedTag: value };
  }
  if (operation === "contact.set_status" && typeof value === "string" && ["new", "qualified", "nurturing", "customer", "unqualified"].includes(value)) {
    await tx.update(contacts).set({ leadStatus: value, updatedAt: new Date() }).where(eq(contacts.id, contact.id));
    return { operation, status: value };
  }
  if (operation === "contact.add_score" && typeof value === "number") {
    const score = Math.max(0, Math.min(100, contact.score + value));
    await tx.update(contacts).set({ score, updatedAt: new Date() }).where(eq(contacts.id, contact.id));
    return { operation, score };
  }
  return { operation: typeof operation === "string" ? operation : "noop" };
}

export function createAutomationWorker(): Worker<AutomationJobData> {
  const db = createDbClient(required("DATABASE_URL"));
  return new Worker<AutomationJobData>(AUTOMATION_QUEUE, async (job: Job<AutomationJobData>) => {
    try { await executeAutomationJob(db, job.data); }
    catch (error) { await failRun(db, job.data, error); throw error; }
  }, { connection: redisConnection(required("REDIS_URL")), concurrency: Number(process.env.AUTOMATION_CONCURRENCY ?? 20) });
}

async function failRun(db: SparkDb, data: AutomationJobData, error: unknown): Promise<void> {
  const orgId = orgIdFactory.from(data.orgId); const message = error instanceof Error ? error.message : "Unknown automation error";
  await withOrgContext(db, orgId, async (tx) => {
    const now = new Date();
    await tx.update(automationRuns).set({ status: "failed", error: message, completedAt: now, updatedAt: now }).where(eq(automationRuns.id, data.runId));
    await tx.insert(events).values({ id: eventId.create(), orgId, type: "automation.run_failed", data: { runId: data.runId, nodeId: data.nodeId, error: message } });
  });
}
function required(name: string): string { const value = process.env[name]; if (!value) throw new Error(`${name} is required.`); return value; }
function redisConnection(value: string): ConnectionOptions { const url = new URL(value); return { host: url.hostname, port: Number(url.port || 6379), ...(url.username ? { username: decodeURIComponent(url.username) } : {}), ...(url.password ? { password: decodeURIComponent(url.password) } : {}), ...(url.protocol === "rediss:" ? { tls: {} } : {}) }; }

if (process.env.NODE_ENV !== "test" && process.env.REDIS_URL && process.env.DATABASE_URL) createAutomationWorker();
