import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { StageFieldRuleSchema, stageFieldRuleId, type CreateStageFieldRuleInput, type OrgId, type StageFieldRule } from "@spark/core";
import { stageFieldRulesControllerSave, stageFieldRulesControllerRemove } from "@spark/api-client";
import { sparkShapeOptions } from "./shape-options.js";
import { confirmed } from "./confirmed.js";

export function optimisticStageFieldRule(input: Omit<CreateStageFieldRuleInput, "id">, orgId: OrgId): StageFieldRule {
  const now = new Date().toISOString();
  return { id: stageFieldRuleId.create(), orgId, ...input, createdAt: now, updatedAt: now };
}

/** Regras de campo por etapa — pequenas e lidas por toda tela de negócio. */
export function createStageFieldRulesCollection() {
  return createCollection(
    electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
      id: "stage_field_rules",
      schema: StageFieldRuleSchema,
      getKey: (rule) => rule.id,
      shapeOptions: sparkShapeOptions("stage_field_rules"),
      onInsert: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onInsert called with no pending mutation.");
        const rule = mutation.modified;
        const response = await stageFieldRulesControllerSave({ id: rule.id, pipelineId: rule.pipelineId, stageId: rule.stageId, fieldKey: rule.fieldKey, level: rule.level });
        return confirmed(response);
      },
      onUpdate: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onUpdate called with no pending mutation.");
        const rule = mutation.modified;
        const response = await stageFieldRulesControllerSave({ id: rule.id, pipelineId: rule.pipelineId, stageId: rule.stageId, fieldKey: rule.fieldKey, level: rule.level });
        return confirmed(response);
      },
      onDelete: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onDelete called with no pending mutation.");
        const response = await stageFieldRulesControllerRemove(mutation.original.id);
        return confirmed(response);
      },
    }),
  );
}

export type StageFieldRulesCollection = ReturnType<typeof createStageFieldRulesCollection>;
