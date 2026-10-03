import { Queue, type ConnectionOptions } from "bullmq";
import { sql } from "drizzle-orm";
import { createDbClient, type SparkDb } from "@spark/db";
export async function scheduleScores(db: SparkDb, queue: Queue, batchSize = 500): Promise<number> {
  await db.transaction(async tx => {
    const [rebuild] = await tx.execute<{ org_id: string; cursor: string | null }>(sql`SELECT org_id,cursor FROM score_rebuilds ORDER BY requested_at FOR UPDATE SKIP LOCKED LIMIT 1`);
    if (!rebuild) return;
    const contacts = await tx.execute<{ id: string }>(sql`SELECT id FROM contacts WHERE org_id=${rebuild.org_id} AND deleted_at IS NULL AND (${rebuild.cursor}::uuid IS NULL OR id>${rebuild.cursor}::uuid) ORDER BY id LIMIT ${batchSize}`);
    if (contacts.length) await tx.execute(sql`INSERT INTO score_jobs(org_id,contact_id) VALUES ${sql.join(contacts.map(contact => sql`(${rebuild.org_id},${contact.id})`),sql`, `)} ON CONFLICT(contact_id) DO UPDATE SET available_at=now(),attempts=0`);
    const last = contacts.at(-1);
    if (last) await tx.execute(sql`UPDATE score_rebuilds SET cursor=${last.id} WHERE org_id=${rebuild.org_id}`);
    else await tx.execute(sql`DELETE FROM score_rebuilds WHERE org_id=${rebuild.org_id}`);
  });
  const jobs = await db.transaction(async tx => {
    await tx.execute(sql`UPDATE score_jobs SET lease_id=NULL,leased_at=NULL WHERE leased_at < now()-interval '5 minutes'`);
    return tx.execute<{ org_id: string; contact_id: string; lease_id: string }>(sql`
      UPDATE score_jobs SET lease_id=gen_random_uuid(),leased_at=now(),attempts=attempts+1
      WHERE contact_id IN (SELECT contact_id FROM score_jobs WHERE available_at<=now() AND lease_id IS NULL
        AND attempts<10 ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT ${batchSize}) RETURNING org_id,contact_id,lease_id`);
  });
  if (!jobs.length) return 0;
  try {
    await queue.addBulk(jobs.map(job => ({ name: "evaluate", data: { orgId: job.org_id, contactId: job.contact_id, leaseId: job.lease_id }, opts: { jobId: job.lease_id, attempts: 5, backoff: { type: "exponential", delay: 1000 }, removeOnComplete: 1000, removeOnFail: 5000 } })));
  } catch (error) {
    for (const job of jobs) await db.execute(sql`UPDATE score_jobs SET lease_id=NULL,leased_at=NULL WHERE contact_id=${job.contact_id} AND lease_id=${job.lease_id}`);
    throw error;
  }
  return jobs.length;
}
export function startScoreScheduler(databaseUrl: string, connection: ConnectionOptions): { stop: () => Promise<void> } {
  const db = createDbClient(databaseUrl);
  const queue = new Queue("scoring", { connection });
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = async () => {
    let count = 0;
    try { count = await scheduleScores(db, queue); }
    catch (error) { process.stderr.write(`scoring scheduler: ${error instanceof Error ? error.message : String(error)}\n`); }
    if (!stopped) timer = setTimeout(() => { void run(); }, count === 500 ? 100 : 2000);
  };
  void run();
  return { stop: async () => { stopped = true; if (timer) clearTimeout(timer); await queue.close(); } };
}
