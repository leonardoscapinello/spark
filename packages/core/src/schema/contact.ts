import { z } from "zod";
import { zOrgId, zContactId, zCompanyId, zEmail, zPhone, zServerTimestamp, zUserId } from "./zodHelpers.js";

export const LEAD_STATUSES = ["new", "qualified", "nurturing", "customer", "unqualified"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/**
 * Contact — the product's center. `identities` (outside this file, in
 * packages/db) resolves the various channels back to this same record.
 * Custom fields live in `customFields`, JSONB, never per-tenant DDL
 * (docs/adr/0021-schema-estatico-campos-dinamicos.md).
 *
 * Timestamps use `zServerTimestamp`, not `z.iso.datetime()` directly —
 * same reason already documented on StageSchema: the first `onUpdate` of
 * a collection exposes that TanStack DB's `collection.update()`
 * revalidates the whole synced row, whose timestamps are never strict ISO
 * (Electric doesn't transform). Applied here on purpose, before Contact
 * had any update at all — this is already the second time this exact bug
 * has shown up (first on Deal, then Stage); no reason to wait for a
 * third occurrence.
 */
export const ContactSchema = z.object({
  id: zContactId,
  orgId: zOrgId,
  name: z.string().min(1, { error: "Name is required" }).max(200),
  email: zEmail.nullable(),
  phone: zPhone.nullable(),
  leadStatus: z.enum(LEAD_STATUSES).default("new"),
  source: z.string().trim().min(1).max(100).nullable().default(null),
  ownerId: zUserId.nullable().default(null),
  companyId: zCompanyId.nullable().default(null),
  score: z.number().int().min(0).max(100).default(0),
  customFields: z.record(z.string(), z.unknown()).default({}),
  tags: z.array(z.string()).default([]),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
  deletedAt: zServerTimestamp.nullable(),
});

export type Contact = z.infer<typeof ContactSchema>;

// orgId never comes from the client — it's decided by the server, from
// the authenticated user (docs/adr/0026). If a create DTO accepted orgId
// from the request body, a client could write to any organization just by
// changing one field in the JSON.
//
// id, on the other hand, is required and comes from the client — optimistic
// writes (TanStack DB) need the final key BEFORE the server responds, to
// insert locally without a re-render once Electric replicates it back
// (docs/adr/0030). Not the same kind of field as orgId: id isn't an
// authorization boundary, it's just the identity of the resource being created.
export const CreateContactInputSchema = ContactSchema.omit({
  orgId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).partial({ email: true, phone: true, leadStatus: true, source: true, ownerId: true, companyId: true, score: true, customFields: true, tags: true });
export type CreateContactInput = z.infer<typeof CreateContactInputSchema>;

export const UpdateContactInputSchema = CreateContactInputSchema.omit({ id: true }).partial();
export type UpdateContactInput = z.infer<typeof UpdateContactInputSchema>;

export const UpdateContactArchiveInputSchema = z.object({ archived: z.boolean() });
export type UpdateContactArchiveInput = z.infer<typeof UpdateContactArchiveInputSchema>;

/** Write response envelope — the txid is what TanStack DB uses to confirm
 * the optimistic write against what Electric replicated back
 * (docs/adr/0018, packages/data). */
export const CreateContactResponseSchema = z.object({
  contact: ContactSchema,
  txid: z.number().int(),
});
export type CreateContactResponse = z.infer<typeof CreateContactResponseSchema>;

export const UpdateContactResponseSchema = z.object({
  contact: ContactSchema,
  txid: z.number().int(),
});
export type UpdateContactResponse = z.infer<typeof UpdateContactResponseSchema>;

/** GET /v1/contacts/search — leitura pela API (ADR-0026). A tela não usa:
 * ela filtra a coleção local (CLAUDE.md regra 5). */
export const SearchContactsQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchContactsQuery = z.infer<typeof SearchContactsQuerySchema>;

export const SearchContactsResponseSchema = z.object({ contacts: z.array(ContactSchema) });
export type SearchContactsResponse = z.infer<typeof SearchContactsResponseSchema>;

export const ImportContactItemSchema = CreateContactInputSchema.pick({
  id: true,
  name: true,
  email: true,
  phone: true,
  source: true,
  tags: true,
});
export type ImportContactItem = z.infer<typeof ImportContactItemSchema>;

export const ImportContactsInputSchema = z.object({ contacts: z.array(ImportContactItemSchema).min(1).max(2000) });
export type ImportContactsInput = z.infer<typeof ImportContactsInputSchema>;

export const ImportContactsResponseSchema = z.object({
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  txid: z.number().int(),
});
export type ImportContactsResponse = z.infer<typeof ImportContactsResponseSchema>;
