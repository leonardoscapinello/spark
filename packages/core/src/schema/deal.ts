import { z } from "zod";
import { zOrgId, zPipelineId, zStageId, zContactId, zDealId, zMoney } from "./zodHelpers.js";

/** Paridade com o modelo do Pipedrive — é o vocabulário real do produto que estamos substituindo. */
export const DealStatusSchema = z.enum(["aberto", "ganho", "perdido"]);
export type DealStatus = z.infer<typeof DealStatusSchema>;

/**
 * Negócio — pertence a um stage de um pipeline, opcionalmente ligado a um
 * contato. `valor` é `Money` (packages/core/src/money), nunca number cru —
 * mesma regra de qualquer quantia monetária no sistema.
 */
export const DealSchema = z.object({
  id: zDealId,
  orgId: zOrgId,
  pipelineId: zPipelineId,
  stageId: zStageId,
  contactId: zContactId.nullable(),
  nome: z.string().min(1, { error: "Nome do negócio é obrigatório" }).max(200),
  valor: zMoney,
  status: DealStatusSchema.default("aberto"),
  dataFechamentoEsperada: z.iso.datetime().nullable(),
  /** só tem sentido quando status é "perdido" — não é imposto aqui como
   * regra cruzada de schema; a tela é quem decide se pede o campo. */
  motivoPerda: z.string().max(500).nullable(),
  criadoEm: z.iso.datetime(),
  atualizadoEm: z.iso.datetime(),
  excluidoEm: z.iso.datetime().nullable(),
});

export type Deal = z.infer<typeof DealSchema>;

// orgId nunca vem do cliente (docs/adr/0026); id vem — escrita otimista
// precisa da chave definitiva antes da resposta do servidor (docs/adr/0030).
export const CreateDealInputSchema = DealSchema.omit({
  orgId: true,
  criadoEm: true,
  atualizadoEm: true,
  excluidoEm: true,
}).partial({ contactId: true, status: true, dataFechamentoEsperada: true, motivoPerda: true });
export type CreateDealInput = z.infer<typeof CreateDealInputSchema>;

export const UpdateDealInputSchema = CreateDealInputSchema.omit({ id: true }).partial();
export type UpdateDealInput = z.infer<typeof UpdateDealInputSchema>;

/** Mover negócio de estágio — a ação central de "arrastar e soltar" do board. */
export const MoveDealInputSchema = z.object({
  stageId: zStageId,
});
export type MoveDealInput = z.infer<typeof MoveDealInputSchema>;
