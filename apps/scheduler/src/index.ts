import { Queue, type ConnectionOptions } from "bullmq";
import { eq, sql } from "drizzle-orm";
import { automationJobs, automationTimers, createDbClient, ensureEventPartitions, type SparkDb } from "@spark/db";
import { automationJobId } from "@spark/core";

export const APP_NAME = "@spark/scheduler" as const;
export const AUTOMATION_QUEUE = "automation";
interface ClaimedJob extends Record<string, unknown> { id: string; org_id: string; run_id: string; node_id: string; resume: boolean }

export async function scheduleDueAutomationWork(db: SparkDb, queue: Queue, batchSize = 500): Promise<number> {
  await materializeDueTimers(db, batchSize);
  const claimed = await db.transaction(async (tx) => {
    await tx.execute(sql`UPDATE automation_jobs SET claimed_at = NULL WHERE completed_at IS NULL AND claimed_at < now() - interval '5 minutes'`);
    return tx.execute<ClaimedJob>(sql`
      UPDATE automation_jobs SET claimed_at = now(), attempts = attempts + 1
      WHERE id IN (
        SELECT id FROM automation_jobs
        WHERE available_at <= now() AND claimed_at IS NULL AND completed_at IS NULL
        ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT ${batchSize}
      ) RETURNING id, org_id, run_id, node_id, resume
    `);
  });
  let enqueued = 0;
  for (const item of claimed) {
    try {
      await queue.add("execute", { jobId: item.id, orgId: item.org_id, runId: item.run_id, nodeId: item.node_id, resume: item.resume }, { jobId: item.id, attempts: 5, backoff: { type: "exponential", delay: 1_000 }, removeOnComplete: 1_000, removeOnFail: 5_000 });
      enqueued += 1;
    } catch (error) {
      await db.update(automationJobs).set({ claimedAt: null }).where(eq(automationJobs.id, item.id));
      throw error;
    }
  }
  return enqueued;
}

async function materializeDueTimers(db: SparkDb, batchSize: number): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`UPDATE automation_timers SET claimed_at = NULL WHERE completed_at IS NULL AND claimed_at < now() - interval '5 minutes'`);
    const timers = await tx.execute<{ id: string; org_id: string; run_id: string; node_id: string }>(sql`
      UPDATE automation_timers SET claimed_at = now()
      WHERE id IN (
        SELECT id FROM automation_timers WHERE fire_at <= now() AND claimed_at IS NULL AND completed_at IS NULL
        ORDER BY fire_at FOR UPDATE SKIP LOCKED LIMIT ${batchSize}
      ) RETURNING id, org_id, run_id, node_id
    `);
    if (!timers.length) return;
    await tx.insert(automationJobs).values(timers.map((timer) => ({ id: automationJobId.create(), orgId: timer.org_id, runId: timer.run_id, nodeId: timer.node_id, resume: true })));
    for (const timer of timers) await tx.update(automationTimers).set({ completedAt: new Date() }).where(eq(automationTimers.id, timer.id));
  });
}

export function startAutomationScheduler(): { queue: Queue; stop: () => Promise<void> } {
  const db = createDbClient(required("DATABASE_URL"));
  const queue = new Queue(AUTOMATION_QUEUE, { connection: redisConnection(required("REDIS_URL")) });
  const interval = setInterval(() => { void scheduleDueAutomationWork(db, queue).catch((error: unknown) => process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)); }, Number(process.env.SCHEDULER_INTERVAL_MS ?? 2_000));
  void scheduleDueAutomationWork(db, queue);
  return { queue, stop: async () => { clearInterval(interval); await queue.close(); } };
}
/**
 * events é particionada por mês; sem partição para o mês, todo write de
 * negócio que registra evento falha (ver packages/db/src/eventPartitions.ts).
 * Roda na subida e uma vez por dia — a rotina é idempotente, e três meses
 * de horizonte dão folga para o scheduler ficar fora do ar sem consequência.
 */
export function startEventPartitionMaintenance(db: SparkDb): { stop: () => void } {
  const run = () => ensureEventPartitions(db).catch((error: unknown) => process.stderr.write(`event partitions: ${error instanceof Error ? error.message : String(error)}\n`));
  const interval = setInterval(() => { void run(); }, Number(process.env.EVENT_PARTITIONS_INTERVAL_MS ?? 24 * 60 * 60 * 1_000));
  void run();
  return { stop: () => clearInterval(interval) };
}
function required(name: string): string { const value = process.env[name]; if (!value) throw new Error(`${name} is required.`); return value; }
function redisConnection(value: string): ConnectionOptions { const url = new URL(value); return { host: url.hostname, port: Number(url.port || 6379), ...(url.username ? { username: decodeURIComponent(url.username) } : {}), ...(url.password ? { password: decodeURIComponent(url.password) } : {}), ...(url.protocol === "rediss:" ? { tls: {} } : {}) }; }
if (process.env.NODE_ENV !== "test" && process.env.REDIS_URL && process.env.DATABASE_URL) startAutomationScheduler();
if (process.env.NODE_ENV !== "test" && process.env.DATABASE_URL) startEventPartitionMaintenance(createDbClient(process.env.DATABASE_URL));
