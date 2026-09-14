import { z } from "zod";
import { zOrgId, zPipelineId, zServerTimestamp, zStageFieldRuleId, zStageId } from "./zodHelpers.js";

/** Obrigatório barra a passagem; importante só sinaliza (packages/core/rules/stageFieldRules). */
export const STAGE_FIELD_LEVELS = ["required", "important"] as const;
export type StageFieldLevel = (typeof STAGE_FIELD_LEVELS)[number];
export const STAGE_FIELD_LEVEL_LABELS: Record<StageFieldLevel, string> = { required: "Obrigatório", important: "Importante" };

/**
 * «Neste funil, nesta etapa, este campo é obrigatório/importante.»
 * A chave é `custom:<chave>` para campo personalizado, ou o nome do campo do
 * negócio (`contactId`, `amount`, `products`…).
 */
export const StageFieldRuleSchema = z.object({
  id: zStageFieldRuleId,
  orgId: zOrgId,
  pipelineId: zPipelineId,
  stageId: zStageId,
  fieldKey: z.string().trim().min(1).max(120),
  level: z.enum(STAGE_FIELD_LEVELS),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type StageFieldRule = z.infer<typeof StageFieldRuleSchema>;

export const CreateStageFieldRuleInputSchema = StageFieldRuleSchema.omit({ orgId: true, createdAt: true, updatedAt: true });
export type CreateStageFieldRuleInput = z.infer<typeof CreateStageFieldRuleInputSchema>;

export const StageFieldRuleWriteResponseSchema = z.object({ rule: StageFieldRuleSchema.nullable(), txid: z.number().int() });
export type StageFieldRuleWriteResponse = z.infer<typeof StageFieldRuleWriteResponseSchema>;
