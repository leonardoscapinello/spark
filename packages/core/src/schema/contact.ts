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

export const CreateContactInputSchema = ContactSchema.omit({
  id: true,
  criadoEm: true,
  atualizadoEm: true,
  excluidoEm: true,
}).partial({ email: true, telefone: true, score: true, customFields: true, tags: true });
export type CreateContactInput = z.infer<typeof CreateContactInputSchema>;

export const UpdateContactInputSchema = CreateContactInputSchema.partial().omit({ orgId: true });
export type UpdateContactInput = z.infer<typeof UpdateContactInputSchema>;
