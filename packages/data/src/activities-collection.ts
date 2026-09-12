import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
/**
 * Local-first activities collection — same pattern as
 * deals-collection.ts (docs/adr/0018, docs/adr/0026). `onUpdate` only
 * covers completing/reopening (`completed`, always together with
 * `completedAt`) — it's the only mutation the API accepts today
 * (PATCH /v1/activities/:id/complete); editing another field is a future route.
 */
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { ActivitySchema, activityId, type Activity, type CreateActivityInput, type OrgId } from "@spark/core";
import { activitiesControllerCreate, activitiesControllerComplete, getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";

export function optimisticActivity(input: Omit<CreateActivityInput, "id">, orgId: OrgId): Activity {
  const now = new Date().toISOString();
  return {
    id: activityId.create(),
    orgId,
    contactId: input.contactId ?? null,
    dealId: input.dealId ?? null,
    type: input.type,
    title: input.title,
    notes: input.notes ?? null,
    scheduledAt: input.scheduledAt,
    completed: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function createActivitiesCollection() {
  return createCollection(
    electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
      id: "activities",
      schema: ActivitySchema,
      getKey: (activity) => activity.id,
      shapeOptions: {
        url: `${getSparkApiBaseUrl()}/v1/shapes/activities`,
        // Electric replicates the Postgres column (snake_case); the Zod
        // schema is camelCase (ADR-0019) — see the same comment in
        // contacts-collection.ts.
        columnMapper: snakeCamelMapper(),
        headers: {
          authorization: () => {
            const token = getSparkAuthToken();
            return token ? `Bearer ${token}` : "";
          },
        },
      },
      onInsert: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onInsert called with no pending mutation.");
        const activity = mutation.modified;

        const response = await activitiesControllerCreate({
          id: activity.id,
          contactId: activity.contactId,
          dealId: activity.dealId,
          type: activity.type,
          title: activity.title,
          notes: activity.notes,
          scheduledAt: activity.scheduledAt,
        });

        return { txid: response.txid };
      },
      onUpdate: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onUpdate called with no pending mutation.");

        const changedFields = Object.keys(mutation.changes);
        const isCompletion =
          changedFields.includes("completed") &&
          changedFields.every((field) => field === "completed" || field === "completedAt");
        if (!isCompletion) {
          throw new Error(
            `Only completing or reopening an activity is possible today — changed field(s): ${changedFields.join(", ")}.`,
          );
        }

        const response = await activitiesControllerComplete(mutation.original.id, {
          completed: mutation.modified.completed,
        });
        return { txid: response.txid };
      },
    }),
  );
}

export type ActivitiesCollection = ReturnType<typeof createActivitiesCollection>;
