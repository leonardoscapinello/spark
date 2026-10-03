import { z } from "zod";

const outcomes = z.object({ won: z.number().int().nonnegative(), lost: z.number().int().nonnegative() });
export const OpportunityFeaturesSchema = z.object({
  pipeline: outcomes,
  person: outcomes,
  company: outcomes,
  personScore: z.number().min(0).max(1000).nullable(),
  companyScore: z.number().min(0).max(1000).nullable(),
  ageDays: z.number().nonnegative(),
  typicalWonDays: z.number().positive().nullable(),
  overdueFollowUps: z.number().int().nonnegative(),
  completedFollowUps: z.number().int().nonnegative(),
});
export type OpportunityFeatures = z.infer<typeof OpportunityFeaturesSchema>;
export const OPPORTUNITY_MODEL_VERSION = "opportunity-bayes-v1";

/** An empirical prior with explicitly heuristic adjustments, not a calibrated forecast.
 * Company/person outcomes exclude the opportunity being evaluated. Missing is neutral.
 * Only the pipeline prior adapts to observed outcomes in v1; coefficients are versioned. */
export function estimateOpportunity(input: OpportunityFeatures) {
  const features = OpportunityFeaturesSchema.parse(input);
  const total = features.pipeline.won + features.pipeline.lost;
  const baseline = (features.pipeline.won + 5) / (total + 20);
  const factors: { key: string; label: string; logOdds: number }[] = [];
  const add = (key: string, label: string, logOdds: number) => factors.push({ key, label, logOdds });
  if (features.personScore !== null) add("personScore", "Interesse da pessoa", (features.personScore / 1000 - 0.5) * 1.2);
  if (features.companyScore !== null) add("companyScore", "Interesse dos contatos da empresa", (features.companyScore / 1000 - 0.5) * 0.6);
  for (const [key, label, counts] of [["person", "Histórico da pessoa", features.person], ["company", "Histórico da empresa", features.company]] as const) {
    const n = counts.won + counts.lost;
    if (n) add(key, label, ((counts.won + baseline * 10) / (n + 10) - baseline) * 1.5);
  }
  if (features.typicalWonDays !== null && features.ageDays > features.typicalWonDays) {
    add("age", "Tempo acima do ciclo de vendas observado", -Math.min(0.8, (features.ageDays / features.typicalWonDays - 1) * 0.2));
  }
  if (features.overdueFollowUps) add("overdue", "Atividades atrasadas", -Math.min(0.6, features.overdueFollowUps * 0.15));
  if (features.completedFollowUps) add("completed", "Atividades concluídas nos últimos 30 dias", Math.min(0.2, features.completedFollowUps * 0.05));
  const logOdds = Math.log(baseline / (1 - baseline)) + factors.reduce((sum, factor) => sum + factor.logOdds, 0);
  const basisPoints = Math.round(Math.max(0.01, Math.min(0.99, 1 / (1 + Math.exp(-logOdds)))) * 10000);
  return { basisPoints, version: OPPORTUNITY_MODEL_VERSION, calibrated: false as const, sampleSize: total, baseline, features, factors };
}

/** Provider output is evidence, never a score, policy, SQL or executable instruction.
 * Adapters for OpenAI/Anthropic/Gemini implement this port outside core.
 * The host binds tenant, contact and source IDs; a provider cannot choose them. */
export const IntelligenceEvidenceSchema = z.object({
  schemaVersion: z.literal(1),
  observations: z.array(z.object({
    kind: z.enum(["purchase_intent", "objection", "timing", "response_quality"]),
    value: z.enum(["positive", "neutral", "negative", "unknown"]),
    confidence: z.number().min(0).max(1),
    sourceIds: z.array(z.string().min(1)).min(1).max(20),
  })).max(30),
});
export interface IntelligenceProvider {
  readonly id: string;
  extract(input: { sources: readonly { id: string; text: string }[]; timeoutMs: number }): Promise<unknown>;
}
export function validateIntelligenceEvidence(raw: unknown, allowedSourceIds: readonly string[]) {
  const evidence = IntelligenceEvidenceSchema.parse(raw);
  const allowed = new Set(allowedSourceIds);
  if (evidence.observations.some(observation => observation.sourceIds.some(id => !allowed.has(id)))) throw new Error("Evidence references an unknown source.");
  return evidence;
}
