import { StageFieldRuleSchema, type StageFieldRule } from "@spark/core";
import type { stageFieldRules } from "@spark/db";

/** Drizzle returns Date objects; the domain and API use timestamp strings. */
export function toStageFieldRule(row: typeof stageFieldRules.$inferSelect): StageFieldRule {
  return StageFieldRuleSchema.parse({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}
