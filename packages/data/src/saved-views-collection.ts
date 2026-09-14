import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { SavedViewSchema, savedViewId, type OrgId, type SavedView, type SavedViewEntity, type UserId } from "@spark/core";
import { getSparkApiBaseUrl, getSparkAuthToken, savedViewsControllerArchive, savedViewsControllerCreate } from "@spark/api-client";

/** Same shape the create endpoint needs; orgId/timestamps are only the
 * optimistic placeholder — Electric replaces them once Postgres confirms
 * the real row (mirrors optimisticContact in contacts-collection.ts). */
export function optimisticSavedView(input: { name: string; entityType: SavedViewEntity; filters: string }, orgId: OrgId, createdBy: UserId): SavedView {
  const now = new Date().toISOString();
  return {
    id: savedViewId.create(),
    orgId,
    entityType: input.entityType,
    name: input.name,
    filters: input.filters,
    createdBy,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
}

export function createSavedViewsCollection() {
  return createCollection(
    electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
      id: "saved_views",
      schema: SavedViewSchema,
      getKey: (view) => view.id,
      shapeOptions: {
        url: `${getSparkApiBaseUrl()}/v1/shapes/saved_views`,
        columnMapper: snakeCamelMapper(),
        headers: { authorization: () => { const token = getSparkAuthToken(); return token ? `Bearer ${token}` : ""; } },
      },
      onInsert: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onInsert called with no pending mutation.");
        const view = mutation.modified;
        const response = await savedViewsControllerCreate({ id: view.id, entityType: view.entityType, name: view.name, filters: view.filters });
        return { txid: response.txid };
      },
      onUpdate: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onUpdate called with no pending mutation.");
        const changedFields = Object.keys(mutation.changes);
        if (changedFields.length !== 1 || changedFields[0] !== "archivedAt") {
          throw new Error(`Unsupported saved view field(s): ${changedFields.join(", ")}.`);
        }
        const response = await savedViewsControllerArchive(mutation.original.id, { archived: mutation.modified.archivedAt !== null });
        return { txid: response.txid };
      },
    }),
  );
}

export type SavedViewsCollection = ReturnType<typeof createSavedViewsCollection>;
