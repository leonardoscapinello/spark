import { z } from "zod";
import { zOrgId, zPipelineId, zStageId, zServerTimestamp } from "./zodHelpers.js";

/**
 * Stage — one column of a pipeline (pipeline.ts). `sortOrder` is the
 * visual position on the board; that field always decides position, never
 * insertion order in the database.
 *
 * Timestamps use `zServerTimestamp`, not `z.iso.datetime()` directly —
 * same reason already documented on Deal: TanStack DB's `collection.update()`
 * revalidates the whole synced row, whose timestamps are never strict ISO
 * (Electric doesn't transform). Found again here the first time Stage
 * gained an `onUpdate` (rename) — first happened on Deal, don't wait for
 * it to bite a third entity before applying the fix.
 */
export const StageSchema = z.object({
  id: zStageId,
  orgId: zOrgId,
  pipelineId: zPipelineId,
  name: z.string().min(1, { error: "Stage name is required" }).max(200),
  sortOrder: z.number().int().min(0),
  /** Probabilidade de um negócio avançar desta etapa para a próxima, 0–100
   * — calculada por `calculateStageProbability` (core/rules/stageWorkflow)
   * a partir do histórico real de movimentação, nunca preenchida na mão.
   * Etapa sem histórico começa em 100 (STAGE_PROBABILITY_DEFAULT). */
  probability: z.number().int().min(0).max(100).default(100),
  /** Operational minutes allowed in this stage; null disables SLA. */
  slaMinutes: z.number().int().min(1).nullable().default(null),
  allowWon: z.boolean().default(true),
  allowLost: z.boolean().default(true),
  /** When false every stage in this pipeline is reachable (legacy-safe default). */
  restrictTransitions: z.boolean().default(false),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
  archivedAt: zServerTimestamp.nullable(),
});

export type Stage = z.infer<typeof StageSchema>;

/** `probability` fora daqui de propósito — toda etapa nasce em
 * STAGE_PROBABILITY_DEFAULT, e só `recomputeStageProbability` (infra) volta
 * a mudar esse número depois. Aceitar um valor no create reabriria a porta
 * que o usuário pediu para fechar: preenchimento manual. */
export const CreateStageInputSchema = StageSchema.omit({
  orgId: true,
  probability: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
}).partial({ slaMinutes: true, allowWon: true, allowLost: true, restrictTransitions: true });
export type CreateStageInput = z.infer<typeof CreateStageInputSchema>;

export const UpdateStageInputSchema = CreateStageInputSchema.omit({ id: true }).partial();
export type UpdateStageInput = z.infer<typeof UpdateStageInputSchema>;

/** Write response envelope — same reason as CreateContactResponseSchema (docs/adr/0018). */
export const CreateStageResponseSchema = z.object({
  stage: StageSchema,
  txid: z.number().int(),
});
export type CreateStageResponse = z.infer<typeof CreateStageResponseSchema>;

/** Rename — a narrow, single-purpose mutation, same pattern as MoveDealInputSchema. */
export const RenameStageInputSchema = z.object({
  name: z.string().min(1, { error: "Stage name is required" }).max(200),
});
export type RenameStageInput = z.infer<typeof RenameStageInputSchema>;

export const RenameStageResponseSchema = z.object({
  stage: StageSchema,
  txid: z.number().int(),
});
export type RenameStageResponse = z.infer<typeof RenameStageResponseSchema>;

/** Arquivar esconde do quadro; nunca apaga — é a etapa de onde negócios
 * antigos ainda contam a história de quem passou por ali. */
export const ArchiveStageInputSchema = z.object({ archived: z.boolean() });
export type ArchiveStageInput = z.infer<typeof ArchiveStageInputSchema>;
export const ArchiveStageResponseSchema = z.object({ stage: StageSchema, txid: z.number().int() });
export type ArchiveStageResponse = z.infer<typeof ArchiveStageResponseSchema>;

/** A nova posição de cada etapa do funil, de uma vez — nunca uma por uma:
 * arrastar da posição 2 para a 5 desloca toda etapa entre elas. */
export const ReorderStagesInputSchema = z.object({
  pipelineId: zPipelineId,
  orderedIds: z.array(zStageId).min(1),
});
export type ReorderStagesInput = z.infer<typeof ReorderStagesInputSchema>;
export const ReorderStagesResponseSchema = z.object({ stages: z.array(StageSchema), txid: z.number().int() });
export type ReorderStagesResponse = z.infer<typeof ReorderStagesResponseSchema>;

export const ConfigureStageInputSchema = z.object({
  slaMinutes: z.number().int().min(1).nullable(),
  allowWon: z.boolean(),
  allowLost: z.boolean(),
  restrictTransitions: z.boolean(),
  allowedDestinationStageIds: z.array(zStageId),
});
export type ConfigureStageInput = z.infer<typeof ConfigureStageInputSchema>;

export const ConfigureStageResponseSchema = z.object({ stage: StageSchema, txid: z.number().int() });
export type ConfigureStageResponse = z.infer<typeof ConfigureStageResponseSchema>;
