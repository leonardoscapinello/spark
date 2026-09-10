import { z } from "zod";
import { zOrgId, zActivityId, zContactId, zDealId, zTimestampServidor } from "./zodHelpers.js";

/** Paridade com o Pipedrive — o vocabulário real do produto que estamos substituindo. */
export const ActivityTypeSchema = z.enum(["tarefa", "ligacao", "reuniao", "email"]);
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

/**
 * Atividade — ligada a um contato e/ou a um negócio (pelo menos um dos
 * dois; não é imposto aqui como regra cruzada de schema, mesma escolha
 * já feita em `DealSchema.motivoPerda` — a tela é quem garante). Vive
 * como entidade própria, não como campo dentro de Contact/Deal, porque
 * um contato tem muitas.
 */
export const ActivitySchema = z.object({
  id: zActivityId,
  orgId: zOrgId,
  contactId: zContactId.nullable(),
  dealId: zDealId.nullable(),
  tipo: ActivityTypeSchema,
  titulo: z.string().min(1, { error: "Título é obrigatório" }).max(200),
  notas: z.string().max(2000).nullable(),
  dataHora: zTimestampServidor,
  concluida: z.boolean().default(false),
  concluidaEm: zTimestampServidor.nullable(),
  criadoEm: zTimestampServidor,
  atualizadoEm: zTimestampServidor,
});

export type Activity = z.infer<typeof ActivitySchema>;

// orgId nunca vem do cliente (docs/adr/0026); id vem — escrita otimista
// precisa da chave definitiva antes da resposta do servidor (docs/adr/0030).
export const CreateActivityInputSchema = ActivitySchema.omit({
  orgId: true,
  concluida: true,
  concluidaEm: true,
  criadoEm: true,
  atualizadoEm: true,
}).partial({ contactId: true, dealId: true, notas: true });
export type CreateActivityInput = z.infer<typeof CreateActivityInputSchema>;

export const CreateActivityResponseSchema = z.object({
  activity: ActivitySchema,
  txid: z.number().int(),
});
export type CreateActivityResponse = z.infer<typeof CreateActivityResponseSchema>;

/** Concluir ou reabrir — mesma rota nos dois sentidos, o corpo é que decide. */
export const CompleteActivityInputSchema = z.object({
  concluida: z.boolean(),
});
export type CompleteActivityInput = z.infer<typeof CompleteActivityInputSchema>;

export const CompleteActivityResponseSchema = z.object({
  activity: ActivitySchema,
  txid: z.number().int(),
});
export type CompleteActivityResponse = z.infer<typeof CompleteActivityResponseSchema>;
