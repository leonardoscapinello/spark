import { z } from "zod";
import { zOrgId, zSavedViewId, zServerTimestamp, zUserId } from "./zodHelpers.js";

/**
 * Only "contact" today — the filter engine (core/filter) only knows Contact.
 * The table and API are already generic on entityType so company/deal views
 * don't need a schema migration when that filter engine grows to match.
 */
export const SAVED_VIEW_ENTITIES = ["contact"] as const;
export type SavedViewEntity = (typeof SAVED_VIEW_ENTITIES)[number];

export const SavedViewSchema = z.object({
  id: zSavedViewId,
  orgId: zOrgId,
  entityType: z.enum(SAVED_VIEW_ENTITIES),
  name: z.string().trim().min(1).max(80),
  // Same wire format as filterUrl.ts (core/filter) — a view IS a saved URL
  // query string. Kept as an opaque string here so the schema doesn't need
  // to know the shape of ContactFilter; core/filter owns that shape.
  filters: z.string().max(4000),
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
});
export type CreateSavedViewInput = z.infer<typeof CreateSavedViewInputSchema>;
