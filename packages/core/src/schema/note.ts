import { z } from "zod";
import { zCompanyId, zContactId, zDealId, zNoteId, zOrgId, zServerTimestamp, zUserId } from "./zodHelpers.js";

/**
 * Nota — o que foi conversado, decidido ou combinado. É o registro que o
 * Pipedrive põe no histórico do negócio (a caixa amarela da captura 001) e
 * que faltava aqui: atividade é o que **vai** acontecer, nota é o que
 * **aconteceu**.
 *
 * Presa a um negócio, uma pessoa ou uma empresa — ao menos um dos três.
 */
export const NoteSchema = z.object({
  id: zNoteId,
  orgId: zOrgId,
  dealId: zDealId.nullable(),
  contactId: zContactId.nullable(),
  companyId: zCompanyId.nullable(),
  body: z.string().trim().min(1, { error: "A nota não pode ficar vazia" }).max(10_000),
  /** Fixada aparece no topo do histórico — o contexto que ninguém pode perder. */
  pinned: z.boolean().default(false),
  authorId: zUserId,
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type Note = z.infer<typeof NoteSchema>;

export const CreateNoteInputSchema = NoteSchema.omit({ orgId: true, authorId: true, createdAt: true, updatedAt: true })
  .partial({ dealId: true, contactId: true, companyId: true, pinned: true })
  .refine((value) => Boolean(value.dealId || value.contactId || value.companyId), { error: "A nota precisa estar ligada a um negócio, pessoa ou empresa" });
export type CreateNoteInput = z.infer<typeof CreateNoteInputSchema>;

export const UpdateNoteInputSchema = z.object({ body: z.string().trim().min(1).max(10_000).optional(), pinned: z.boolean().optional() });
export type UpdateNoteInput = z.infer<typeof UpdateNoteInputSchema>;

export const NoteWriteResponseSchema = z.object({ note: NoteSchema.nullable(), txid: z.number().int() });
export type NoteWriteResponse = z.infer<typeof NoteWriteResponseSchema>;
