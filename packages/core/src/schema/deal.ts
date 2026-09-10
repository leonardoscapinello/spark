import { z } from "zod";
import { zOrgId, zPipelineId, zStageId, zContactId, zDealId, zMoney, zTimestampServidor } from "./zodHelpers.js";

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
  dataFechamentoEsperada: zTimestampServidor.nullable(),
  /** só tem sentido quando status é "perdido" — não é imposto aqui como
   * regra cruzada de schema; a tela é quem decide se pede o campo. */
  motivoPerda: z.string().max(500).nullable(),
  criadoEm: zTimestampServidor,
  atualizadoEm: zTimestampServidor,
  excluidoEm: zTimestampServidor.nullable(),
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

/** Envelope de resposta de escrita — mesmo motivo de CreateContactResponseSchema (docs/adr/0018). */
export const CreateDealResponseSchema = z.object({
  deal: DealSchema,
  txid: z.number().int(),
});
export type CreateDealResponse = z.infer<typeof CreateDealResponseSchema>;

export const MoveDealResponseSchema = z.object({
  deal: DealSchema,
  txid: z.number().int(),
});
export type MoveDealResponse = z.infer<typeof MoveDealResponseSchema>;

/**
 * Fechar negócio como ganho ou perdido — a outra ação central do board,
 * além de mover de estágio. `motivoPerda` só faz sentido junto de
 * "perdido" — mesma escolha de não impor a regra cruzada no schema que já
 * existe em `DealSchema.motivoPerda` acima (quem decide se pede o campo é
 * a tela, não o schema). Não é união discriminada por `status`: testado e
 * confirmado que `createZodDto` (nestjs-zod@5.5.0) quebra ao gerar o
 * OpenAPI de um `z.discriminatedUnion` do zod v4 — crash incondicional,
 * sem stack útil, reproduzido até no caso mínimo, sem nenhum campo
 * cruzado. Objeto simples é o que já funciona em todo outro DTO da API.
 */
export const CloseDealInputSchema = z.object({
  status: z.enum(["ganho", "perdido"]),
  motivoPerda: z.string().max(500).nullable().optional(),
});
export type CloseDealInput = z.infer<typeof CloseDealInputSchema>;

export const CloseDealResponseSchema = z.object({
  deal: DealSchema,
  txid: z.number().int(),
});
export type CloseDealResponse = z.infer<typeof CloseDealResponseSchema>;
