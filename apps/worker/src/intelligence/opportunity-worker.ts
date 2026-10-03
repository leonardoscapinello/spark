import { sql } from "drizzle-orm";
import { createDbClient, type SparkDb } from "@spark/db";
import { estimateOpportunity, type OpportunityFeatures } from "@spark/core";

/** Postgres owns the durable queue. Row locks allow independent worker replicas.
 * No external provider is called while a transaction is open. */
export async function evaluateNextOpportunity(db: SparkDb): Promise<boolean> {
  let candidate: { deal_id: string; org_id: string } | undefined;
  try {
    return await db.transaction(async tx => {
      // Same lock order as deal writes: deal, then job. SKIP LOCKED never blocks the CRM.
      const [deal] = await tx.execute<{ id: string; org_id: string; pipeline_id: string; contact_id: string | null; company_id: string | null; created_at: Date; status: string; deleted_at: Date | null; is_archived: boolean }>(sql`SELECT d.* FROM opportunity_jobs j JOIN deals d ON d.id=j.deal_id AND d.org_id=j.org_id WHERE j.available_at<=now() AND j.attempts<10 ORDER BY j.available_at LIMIT 1 FOR UPDATE OF d SKIP LOCKED`);
      if (!deal) return false;
      candidate = { deal_id: deal.id, org_id: deal.org_id };
      const locked = await tx.execute(sql`SELECT deal_id FROM opportunity_jobs WHERE deal_id=${deal.id} AND available_at<=now() AND attempts<10 FOR UPDATE SKIP LOCKED`);
      if (!locked.length) return false;
      if (deal.deleted_at || deal.is_archived || deal.status!=='open') {
        await tx.execute(sql`UPDATE deals SET probability_basis_points=NULL,probability_calculated_at=NULL,probability_version=NULL,probability_sample_size=NULL WHERE id=${deal.id}`);
        await tx.execute(sql`DELETE FROM opportunity_jobs WHERE deal_id=${deal.id}`);
        return true;
      }
      await tx.execute(sql`INSERT INTO opportunity_baselines(org_id,pipeline_id) VALUES(${deal.org_id},${deal.pipeline_id}) ON CONFLICT DO NOTHING`);
      const [cached] = await tx.execute<{ won: number; lost: number; calculated_at: Date | null }>(sql`SELECT won,lost,calculated_at FROM opportunity_baselines WHERE org_id=${deal.org_id} AND pipeline_id=${deal.pipeline_id} FOR UPDATE`);
      const at = new Date();
      if (!cached?.calculated_at || at.getTime()-new Date(cached.calculated_at).getTime()>86400000) {
        // One aggregate per pipeline per refresh, not one full-table scan per lead.
        await tx.execute(sql`UPDATE opportunity_baselines SET
          won=(SELECT count(*) FROM deals WHERE org_id=${deal.org_id} AND pipeline_id=${deal.pipeline_id} AND deleted_at IS NULL AND status='won'),
          lost=(SELECT count(*) FROM deals WHERE org_id=${deal.org_id} AND pipeline_id=${deal.pipeline_id} AND deleted_at IS NULL AND status='lost'),
          calculated_at=now() WHERE pipeline_id=${deal.pipeline_id} AND org_id=${deal.org_id}`);
      }
      const [baseline] = await tx.execute<{ won: number; lost: number }>(sql`SELECT won,lost FROM opportunity_baselines WHERE org_id=${deal.org_id} AND pipeline_id=${deal.pipeline_id}`);
      const [person] = await tx.execute<{ score: number; score_has_evidence: boolean; score_calculated_at: Date | null }>(sql`SELECT score,score_has_evidence,score_calculated_at FROM contacts WHERE org_id=${deal.org_id} AND id=${deal.contact_id} AND deleted_at IS NULL`);
      // Exclude the focal person from the company aggregate to avoid counting their score twice.
      const [company] = await tx.execute<{ score: number | null }>(sql`SELECT avg(c.score) AS score FROM contacts c WHERE c.org_id=${deal.org_id} AND c.deleted_at IS NULL AND c.id IS DISTINCT FROM ${deal.contact_id}::uuid AND c.score_has_evidence AND c.score_calculated_at>=now()-interval '2 days'
        AND c.id IN (SELECT id FROM contacts WHERE org_id=${deal.org_id} AND company_id=${deal.company_id}
          UNION SELECT contact_id FROM contact_companies WHERE org_id=${deal.org_id} AND company_id=${deal.company_id})`);
      const [history] = await tx.execute<{ person_won: number; person_lost: number; company_won: number; company_lost: number }>(sql`SELECT
        count(*) FILTER(WHERE contact_id=${deal.contact_id} AND status='won') AS person_won,
        count(*) FILTER(WHERE contact_id=${deal.contact_id} AND status='lost') AS person_lost,
        count(*) FILTER(WHERE company_id=${deal.company_id} AND contact_id IS DISTINCT FROM ${deal.contact_id}::uuid AND status='won') AS company_won,
        count(*) FILTER(WHERE company_id=${deal.company_id} AND contact_id IS DISTINCT FROM ${deal.contact_id}::uuid AND status='lost') AS company_lost
        FROM deals WHERE org_id=${deal.org_id} AND id<>${deal.id} AND deleted_at IS NULL AND status IN ('won','lost') AND (contact_id=${deal.contact_id} OR company_id=${deal.company_id})`);
      const [activities] = await tx.execute<{ overdue: number; completed: number }>(sql`SELECT count(*) FILTER(WHERE NOT completed AND scheduled_at<now()) AS overdue,
        count(*) FILTER(WHERE completed AND completed_at>=now()-interval '30 days') AS completed
        FROM activities WHERE org_id=${deal.org_id} AND (deal_id=${deal.id} OR (deal_id IS NULL AND contact_id=${deal.contact_id}))`);
      const features: OpportunityFeatures = {
        pipeline: { won: Number(baseline?.won ?? 0), lost: Number(baseline?.lost ?? 0) },
        person: { won: Number(history?.person_won ?? 0), lost: Number(history?.person_lost ?? 0) },
        company: { won: Number(history?.company_won ?? 0), lost: Number(history?.company_lost ?? 0) },
        personScore: person?.score_has_evidence && person.score_calculated_at && at.getTime()-new Date(person.score_calculated_at).getTime()<=172800000 ? Number(person.score) : null,
        companyScore: company?.score == null ? null : Number(company.score),
        ageDays: Math.max(0,(at.getTime()-new Date(deal.created_at).getTime())/86400000),
        // No reliable closed-at cohort yet: do not invent cycle or response times.
        typicalWonDays: null,
        overdueFollowUps: Number(activities?.overdue ?? 0), completedFollowUps: Number(activities?.completed ?? 0),
      };
      const result = estimateOpportunity(features);
      await tx.execute(sql`UPDATE deals SET probability_basis_points=${result.basisPoints},probability_calculated_at=${at},probability_version=${result.version},probability_sample_size=${result.sampleSize} WHERE id=${deal.id} AND org_id=${deal.org_id}`);
      // First prediction of each UTC day is immutable, preserving pre-outcome evidence.
      await tx.execute(sql`INSERT INTO opportunity_predictions(org_id,deal_id,day,calculated_at,version,basis_points,evidence)
        VALUES(${deal.org_id},${deal.id},${at.toISOString().slice(0,10)},${at},${result.version},${result.basisPoints},${JSON.stringify(result)}::jsonb) ON CONFLICT DO NOTHING`);
      await tx.execute(sql`UPDATE opportunity_jobs SET available_at=now()+interval '1 day',attempts=0,last_error=NULL WHERE deal_id=${deal.id}`);
      return true;
    });
  } catch (error) {
    if (candidate) await db.execute(sql`UPDATE opportunity_jobs SET attempts=attempts+1,last_error=${error instanceof Error ? error.message.slice(0,500) : "Prediction failed"},available_at=now()+interval '1 minute' WHERE deal_id=${candidate.deal_id} AND org_id=${candidate.org_id}`);
    throw error;
  }
}
export function startOpportunityWorker(databaseUrl: string): { stop: () => void } {
  const db = createDbClient(databaseUrl);
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = async () => {
    let worked = false;
    try { worked = await evaluateNextOpportunity(db); }
    catch (error) { process.stderr.write(`opportunity worker: ${error instanceof Error ? error.message : String(error)}\n`); }
    if (!stopped) timer = setTimeout(() => { void run(); }, worked ? 10 : 1000);
  };
  void run();
  return { stop: () => { stopped=true; if (timer) clearTimeout(timer); } };
}
