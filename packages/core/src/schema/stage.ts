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
  /** win probability associated with this stage, 0–100 — used for
   * weighted revenue forecasting (Pipedrive parity). */
  probability: z.number().int().min(0).max(100).default(0),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
  archivedAt: zServerTimestamp.nullable(),
});

export type Stage = z.infer<typeof StageSchema>;

export const CreateStageInputSchema = StageSchema.omit({
  orgId: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
}).partial({ probability: true });
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
