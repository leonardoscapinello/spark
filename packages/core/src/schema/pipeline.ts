import { z } from "zod";
import { zOrgId, zPipelineId } from "./zodHelpers.js";

/**
 * Pipeline — o funil de vendas. `Stage` (stage.ts) pertence a um pipeline;
 * `Deal` (deal.ts) pertence a um stage. Arquivado, não excluído: negócio
 * histórico continua apontando pra um pipeline que não aceita negócio
 * novo (docs/adr/0021).
 */
export const PipelineSchema = z.object({
  id: zPipelineId,
  orgId: zOrgId,
  nome: z.string().min(1, { error: "Nome do pipeline é obrigatório" }).max(200),
  padrao: z.boolean().default(false),
  criadoEm: z.iso.datetime(),
  atualizadoEm: z.iso.datetime(),
  arquivadoEm: z.iso.datetime().nullable(),
});

export type Pipeline = z.infer<typeof PipelineSchema>;

// orgId nunca vem do cliente (docs/adr/0026); id vem — mesma regra de
// contact.ts (docs/adr/0030): escrita otimista precisa da chave definitiva
// antes da resposta do servidor.
export const CreatePipelineInputSchema = PipelineSchema.omit({
  orgId: true,
  criadoEm: true,
  atualizadoEm: true,
  arquivadoEm: true,
}).partial({ padrao: true });
export type CreatePipelineInput = z.infer<typeof CreatePipelineInputSchema>;

export const UpdatePipelineInputSchema = CreatePipelineInputSchema.omit({ id: true }).partial();
export type UpdatePipelineInput = z.infer<typeof UpdatePipelineInputSchema>;
