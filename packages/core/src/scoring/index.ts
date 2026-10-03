import { z } from "zod";
import { zServerTimestamp } from "../schema/zodHelpers.js";

export const SCORE_MAX = 1000;
export const ScoreRuleSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(160),
  signal: z.string().min(1).max(100),
  points: z.number().int().min(-1000).max(1000),
  cap: z.number().int().min(1).max(1000),
  maxPerDay: z.number().int().min(1).max(100),
  halfLifeDays: z.number().min(1).max(365),
  windowDays: z.number().int().min(1).max(365),
});
export const ScoreModelSchema = z.object({
  kind: z.literal("rules-v1"),
  name: z.string().min(1).max(160),
  objective: z.string().min(1).max(500),
  horizonDays: z.number().int().min(1).max(365),
  rules: z.array(ScoreRuleSchema).min(1).max(64),
}).superRefine((model, ctx) => {
  if (new Set(model.rules.map(rule => rule.id)).size !== model.rules.length) ctx.addIssue({ code: "custom", message: "Rule IDs must be unique." });
});
export type ScoreModel = z.infer<typeof ScoreModelSchema>;
export interface ScoreSignalDay { signal: string; day: string; count: number }
export interface ScoreContribution { ruleId: string; label: string; signal: string; points: number; feature: number }
export interface ScoreResult { value: number; hasEvidence: boolean; contributions: ScoreContribution[]; evaluatedAt: string }

/** Pure, deterministic evaluator. No network, randomness or hidden clock.
 * Features are capped daily counts with exponential recency decay.
 * Weights are hypotheses; this index is NOT a calibrated probability. */
export function evaluateScore(model: ScoreModel, days: readonly ScoreSignalDay[], at: Date): ScoreResult {
  if (!Number.isFinite(at.getTime())) throw new Error("Invalid evaluation date.");
  const today = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
  const buckets = new Map<string, Map<string, number>>();
  for (const day of days) {
    if (!Number.isFinite(day.count) || day.count <= 0) continue;
    const time = Date.parse(day.day + "T00:00:00Z");
    if (!Number.isFinite(time) || time > today) continue;
    const signal = buckets.get(day.signal) ?? new Map<string, number>();
    signal.set(day.day, (signal.get(day.day) ?? 0) + day.count);
    buckets.set(day.signal, signal);
  }
  const contributions = model.rules.map(rule => {
    let feature = 0;
    for (const [day, count] of buckets.get(rule.signal) ?? []) {
      const age = (today - Date.parse(day + "T00:00:00Z")) / 86400000;
      if (age >= rule.windowDays) continue;
      feature += Math.min(count, rule.maxPerDay) * Math.pow(2, -age / rule.halfLifeDays);
    }
    const points = Math.sign(rule.points) * Math.min(rule.cap, Math.abs(rule.points) * feature);
    return { ruleId: rule.id, label: rule.label, signal: rule.signal, feature, points };
  });
  return { value: Math.round(Math.max(0, Math.min(SCORE_MAX, contributions.reduce((sum, rule) => sum + rule.points, 0)))), hasEvidence: contributions.some(rule => rule.feature > 0), contributions, evaluatedAt: at.toISOString() };
}

/** Conservative initial model. Explicitly versioned and replaceable per tenant.
 * Sending campaigns/creating contacts is NOT evidence of prospect intent.
 * Won/lost events remain outcomes for future training, not input leakage. */
export const DEFAULT_SCORE_MODEL: ScoreModel = {
  kind: "rules-v1", name: "Interesse comercial inicial", objective: "Priorizar interesse comercial recente; índice não calibrado", horizonDays: 30,
  rules: [
    { id: "form", label: "Formulário enviado", signal: "form.submitted", points: 80, cap: 160, maxPerDay: 1, halfLifeDays: 14, windowDays: 60 },
    { id: "reply", label: "Mensagem recebida", signal: "message.received", points: 70, cap: 280, maxPerDay: 2, halfLifeDays: 14, windowDays: 60 },
    { id: "meeting", label: "Atividade concluída", signal: "activity.completed", points: 60, cap: 180, maxPerDay: 1, halfLifeDays: 21, windowDays: 90 },
    { id: "proposal", label: "Proposta solicitada", signal: "intent.proposal_requested", points: 250, cap: 250, maxPerDay: 1, halfLifeDays: 14, windowDays: 60 },
    { id: "checkout", label: "Compra iniciada", signal: "intent.checkout_started", points: 350, cap: 350, maxPerDay: 1, halfLifeDays: 7, windowDays: 30 },
    { id: "declined", label: "Desinteresse declarado", signal: "intent.declined", points: -300, cap: 600, maxPerDay: 1, halfLifeDays: 30, windowDays: 90 },
    { id: "adjustment", label: "Contribuição de automação", signal: "automation.score_positive", points: 1, cap: 100, maxPerDay: 100, halfLifeDays: 14, windowDays: 30 },
    { id: "adjustment-negative", label: "Redução por automação", signal: "automation.score_negative", points: -1, cap: 100, maxPerDay: 100, halfLifeDays: 14, windowDays: 30 },
  ],
};
export const PublishScoreModelSchema = z.object({ scope: z.string().regex(/^[a-zA-Z0-9_.-]{1,80}$/).default("general"), model: ScoreModelSchema });
export const RecordScoreSignalSchema = z.object({
  contactId: z.uuid(), key: z.string().min(1).max(200), signal: z.string().min(1).max(100),
  scope: z.string().regex(/^[a-zA-Z0-9_.-]{1,80}$/).default("general"),
  occurredAt: z.iso.datetime(),
});

export const ScoreSnapshotSchema = z.object({
 id: z.uuid(), orgId: z.uuid(), contactId: z.uuid(), scope: z.string(), modelId: z.uuid(),
 value: z.number().int().min(0).max(1000), hasEvidence: z.boolean(), day: z.string(), capturedAt: zServerTimestamp,
 contributions: z.array(z.object({ ruleId: z.string(), label: z.string(), signal: z.string(), points: z.number(), feature: z.number() })),
});
