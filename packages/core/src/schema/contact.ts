import { z } from "zod";
import { zOrgId, zContactId, zEmail, zTelefone } from "./zodHelpers.js";

/**
 * Contato — o centro do produto. `identities` (fora deste arquivo, em
 * packages/db) resolve os vários canais para este mesmo registro.
 * Campo customizado vive em `customFields`, JSONB, nunca DDL por tenant
 * (docs/adr/0021-schema-estatico-campos-dinamicos.md).
 */
export const ContactSchema = z.object({
  id: zContactId,
  orgId: zOrgId,
  nome: z.string().min(1, { error: "Nome é obrigatório" }).max(200),
  email: zEmail.nullable(),
  telefone: zTelefone.nullable(),
  score: z.number().int().min(0).max(100).default(0),
  customFields: z.record(z.string(), z.unknown()).default({}),
  tags: z.array(z.string()).default([]),
  criadoEm: z.iso.datetime(),
  atualizadoEm: z.iso.datetime(),
  excluidoEm: z.iso.datetime().nullable(),
});

export type Contact = z.infer<typeof ContactSchema>;

// orgId nunca vem do cliente — quem decide é o servidor, a partir do
// usuário autenticado (docs/adr/0026). Se um DTO de criação aceitasse
// orgId do corpo da requisição, o cliente poderia escrever em qualquer
// organização só mudando um campo do JSON.
//
// id, ao contrário, é obrigatório e vem do cliente — escrita otimista
// (TanStack DB) precisa da chave final ANTES da resposta do servidor,
// pra inserir localmente sem re-render quando o Electric replicar de
// volta (docs/adr/0030). Não é o mesmo tipo de campo que orgId: id não é
// fronteira de autorização, é só identidade do recurso sendo criado.
export const CreateContactInputSchema = ContactSchema.omit({
  orgId: true,
  criadoEm: true,
  atualizadoEm: true,
  excluidoEm: true,
}).partial({ email: true, telefone: true, score: true, customFields: true, tags: true });
export type CreateContactInput = z.infer<typeof CreateContactInputSchema>;

export const UpdateContactInputSchema = CreateContactInputSchema.partial();
export type UpdateContactInput = z.infer<typeof UpdateContactInputSchema>;

/** Envelope de resposta de escrita — o txid é o que o TanStack DB usa pra
 * confirmar a escrita otimista contra o que o Electric replicou de volta
 * (docs/adr/0018, packages/data). */
export const CreateContactResponseSchema = z.object({
  contact: ContactSchema,
  txid: z.number().int(),
});
export type CreateContactResponse = z.infer<typeof CreateContactResponseSchema>;
