import { z } from "zod";
import { zOrgId, zSavedViewId, zServerTimestamp, zUserId } from "./zodHelpers.js";

/**
 * Only "contact" today — the filter engine (core/filter) only knows Contact.
 * The table and API are already generic on entityType so company/deal views
 * don't need a schema migration when that filter engine grows to match.
 */
export const SAVED_VIEW_ENTITIES = ["contact"] as const;
export type SavedViewEntity = (typeof SAVED_VIEW_ENTITIES)[number];

/** «Só eu» ou «toda a organização», como no Pipedrive. A shape só entrega a
 * visão privada a quem a criou (apps/api sync decide isso no servidor). */
export const SAVED_VIEW_VISIBILITIES = ["private", "org"] as const;
export type SavedViewVisibility = (typeof SAVED_VIEW_VISIBILITIES)[number];

export const SavedViewSchema = z.object({
  id: zSavedViewId,
  orgId: zOrgId,
  entityType: z.enum(SAVED_VIEW_ENTITIES),
  name: z.string().trim().min(1).max(80),
  // Same wire format as filterUrl.ts (core/filter) — a view IS a saved URL
  // query string. Kept as an opaque string here so the schema doesn't need
  // to know the shape of ContactFilter; core/filter owns that shape.
  filters: z.string().max(4000),
  visibility: z.enum(SAVED_VIEW_VISIBILITIES),
  createdBy: zUserId,
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
  archivedAt: zServerTimestamp.nullable(),
});
export type SavedView = z.infer<typeof SavedViewSchema>;

export const CreateSavedViewInputSchema = z.object({
  id: zSavedViewId,
  entityType: z.enum(SAVED_VIEW_ENTITIES),
  name: z.string().trim().min(1).max(80),
  filters: z.string().max(4000).default(""),
  visibility: z.enum(SAVED_VIEW_VISIBILITIES).default("org"),
});
export type CreateSavedViewInput = z.infer<typeof CreateSavedViewInputSchema>;

export const ArchiveSavedViewInputSchema = z.object({ archived: z.boolean() });
export type ArchiveSavedViewInput = z.infer<typeof ArchiveSavedViewInputSchema>;

export const SavedViewWriteResponseSchema = z.object({ view: SavedViewSchema, txid: z.number().int() });
export type SavedViewWriteResponse = z.infer<typeof SavedViewWriteResponseSchema>;
