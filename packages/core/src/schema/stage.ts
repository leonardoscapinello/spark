import { z } from "zod";
import { zOrgId, zPipelineId, zStageId } from "./zodHelpers.js";

/**
 * Estágio — uma coluna do funil (pipeline.ts). `ordem` é a posição visual
 * no board; quem decide a posição é sempre este campo, nunca a ordem de
 * inserção no banco.
 */
export const StageSchema = z.object({
  id: zStageId,
  orgId: zOrgId,
  pipelineId: zPipelineId,
  nome: z.string().min(1, { error: "Nome do estágio é obrigatório" }).max(200),
  ordem: z.number().int().min(0),
  /** probabilidade de fechamento associada a este estágio, 0–100 — usada
   * pra previsão de receita ponderada (paridade com Pipedrive). */
  probabilidade: z.number().int().min(0).max(100).default(0),
  criadoEm: z.iso.datetime(),
  atualizadoEm: z.iso.datetime(),
  arquivadoEm: z.iso.datetime().nullable(),
});

export type Stage = z.infer<typeof StageSchema>;

export const CreateStageInputSchema = StageSchema.omit({
  orgId: true,
  criadoEm: true,
  atualizadoEm: true,
  arquivadoEm: true,
}).partial({ probabilidade: true });
export type CreateStageInput = z.infer<typeof CreateStageInputSchema>;

export const UpdateStageInputSchema = CreateStageInputSchema.omit({ id: true }).partial();
export type UpdateStageInput = z.infer<typeof UpdateStageInputSchema>;

/** Envelope de resposta de escrita — mesmo motivo de CreateContactResponseSchema (docs/adr/0018). */
export const CreateStageResponseSchema = z.object({
  stage: StageSchema,
  txid: z.number().int(),
});
export type CreateStageResponse = z.infer<typeof CreateStageResponseSchema>;

/** Renomear — mutação estreita de propósito único, mesmo padrão de MoveDealInputSchema. */
export const RenameStageInputSchema = z.object({
  nome: z.string().min(1, { error: "Nome do estágio é obrigatório" }).max(200),
});
export type RenameStageInput = z.infer<typeof RenameStageInputSchema>;

export const RenameStageResponseSchema = z.object({
  stage: StageSchema,
  txid: z.number().int(),
});
export type RenameStageResponse = z.infer<typeof RenameStageResponseSchema>;
