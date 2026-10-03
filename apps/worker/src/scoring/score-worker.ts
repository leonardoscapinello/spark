import { Worker, type ConnectionOptions } from "bullmq";
import { sql, eq, and } from "drizzle-orm";
import { createDbClient, contacts, scoreModels, scorePolicies, withOrgContext, type SparkDb } from "@spark/db";
import { DEFAULT_SCORE_MODEL, ScoreModelSchema, evaluateScore, orgId as orgIdFactory, type ScoreSignalDay } from "@spark/core";
export const SCORE_QUEUE = "scoring";
export interface ScoreJobData { orgId: string; contactId: string; leaseId: string }

export async function evaluateContactScore(db: SparkDb, job: ScoreJobData): Promise<void> {
  const orgId = orgIdFactory.from(job.orgId);
  await withOrgContext(db, orgId, async tx => {
    // Same lock order as contact writes: contact first, then its score job.
    const [contact] = await tx.select().from(contacts).where(and(eq(contacts.orgId, orgId), eq(contacts.id, job.contactId))).limit(1).for("update");
    const lock = await tx.execute(sql`SELECT contact_id FROM score_jobs WHERE org_id=${orgId} AND contact_id=${job.contactId} AND lease_id=${job.leaseId} FOR UPDATE`);
    if (!lock.length) return; // stale retry/expired lease never overwrites a newer job
    if (!contact || contact.deletedAt) {
      await tx.execute(sql`DELETE FROM score_jobs WHERE org_id=${orgId} AND contact_id=${job.contactId}`);
      return;
    }
    // Serialize first-time default creation per organization, never all tenants.
    let policies = await tx.execute<{ id: string; scope: string; definition: unknown }>(sql`SELECT m.id,m.scope,m.definition FROM score_models m JOIN score_policies p ON p.model_id=m.id AND p.org_id=m.org_id WHERE p.org_id=${orgId}`);
    if (!policies.some(policy => policy.scope === "general")) {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${orgId},0))`);
      const existing = await tx.select().from(scorePolicies).where(eq(scorePolicies.orgId, orgId));
      if (!existing.some(policy => policy.scope === "general")) {
        const [model] = await tx.insert(scoreModels).values({ orgId, scope: "general", definition: DEFAULT_SCORE_MODEL }).returning();
        if (!model) throw new Error("Could not initialize scoring model.");
        await tx.insert(scorePolicies).values({ orgId, scope: "general", modelId: model.id });
      }
      policies = await tx.execute<{ id: string; scope: string; definition: unknown }>(sql`SELECT m.id,m.scope,m.definition FROM score_models m JOIN score_policies p ON p.model_id=m.id AND p.org_id=m.org_id WHERE p.org_id=${orgId}`);
    }
    const at = new Date();
    const day = at.toISOString().slice(0,10);
    // Query only types referenced by the active models; bounded by 365 daily buckets/type.
    for (const policy of policies) {
      const model = ScoreModelSchema.parse(policy.definition);
      const signals = [...new Set(model.rules.map(rule => rule.signal))];
      const rows = await tx.execute<{ signal: string; day: string; count: number }>(sql`
        SELECT signal,day::text,count FROM score_signal_days
        WHERE org_id=${orgId} AND contact_id=${contact.id} AND scope=${policy.scope}
        AND signal IN (${sql.join(signals.map(signal => sql`${signal}`),sql`,`)})
        AND day >= ${day}::date - 365 AND day <= ${day}::date`);
      const features: ScoreSignalDay[] = rows.map(row => ({ signal: row.signal, day: row.day, count: Number(row.count) }));
      const result = evaluateScore(model, features, at);
      const contributions = JSON.stringify(result.contributions);
      await tx.execute(sql`INSERT INTO score_results(org_id,contact_id,scope,model_id,value,has_evidence,contributions,calculated_at)
        VALUES(${orgId},${contact.id},${policy.scope},${policy.id},${result.value},${result.hasEvidence},${contributions}::jsonb,${at})
        ON CONFLICT(org_id,contact_id,scope) DO UPDATE SET model_id=EXCLUDED.model_id,value=EXCLUDED.value,has_evidence=EXCLUDED.has_evidence,contributions=EXCLUDED.contributions,calculated_at=EXCLUDED.calculated_at`);
      await tx.execute(sql`INSERT INTO score_snapshots(org_id,contact_id,scope,model_id,value,has_evidence,contributions,captured_at,day)
        VALUES(${orgId},${contact.id},${policy.scope},${policy.id},${result.value},${result.hasEvidence},${contributions}::jsonb,${at},${day})
        ON CONFLICT(org_id,contact_id,scope,day) DO UPDATE SET model_id=EXCLUDED.model_id,value=EXCLUDED.value,has_evidence=EXCLUDED.has_evidence,contributions=EXCLUDED.contributions,captured_at=EXCLUDED.captured_at`);
      if (policy.scope === "general") {
        const [previous] = await tx.execute<{ value: number }>(sql`SELECT value FROM score_snapshots WHERE org_id=${orgId} AND contact_id=${contact.id} AND scope='general' AND model_id=${policy.id} AND day=${day}::date-7 AND has_evidence=true`);
        await tx.update(contacts).set({ score: result.value, scoreCalculatedAt: at, scoreHasEvidence: result.hasEvidence, scorePreviousWeek: result.hasEvidence ? previous?.value ?? null : null }).where(and(eq(contacts.id, contact.id),eq(contacts.orgId,orgId)));
      }
    }
    // Next UTC day, spread over one hour: avoid a midnight thundering herd.
    await tx.execute(sql`UPDATE score_jobs SET lease_id=NULL,leased_at=NULL,attempts=0,last_error=NULL,
      available_at=(date_trunc('day',now() AT TIME ZONE 'UTC')+interval '1 day') AT TIME ZONE 'UTC' + (abs(hashtextextended(contact_id::text,0)%3600))*interval '1 second'
      WHERE org_id=${orgId} AND contact_id=${contact.id}`);
  });
}
export function createScoreWorker(databaseUrl: string, connection: ConnectionOptions): Worker<ScoreJobData> {
  const db = createDbClient(databaseUrl);
  return new Worker<ScoreJobData>(SCORE_QUEUE, async job => {
    try { await evaluateContactScore(db, job.data); }
    catch (error) {
      await db.execute(sql`UPDATE score_jobs SET last_error=${error instanceof Error ? error.message.slice(0,500) : "Score calculation failed"} WHERE org_id=${job.data.orgId} AND contact_id=${job.data.contactId} AND lease_id=${job.data.leaseId}`);
      throw error;
    }
  }, { connection, concurrency: Number(process.env.SCORE_CONCURRENCY ?? 8) });
}
