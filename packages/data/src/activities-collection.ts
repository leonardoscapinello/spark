import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { sparkShapeOptions } from "./shape-options.js";
/**
 * Local-first activities collection — same pattern as
 * deals-collection.ts (docs/adr/0018, docs/adr/0026). `onUpdate` only
 * covers completing/reopening (`completed`, always together with
 * `completedAt`) — it's the only mutation the API accepts today
 * (PATCH /v1/activities/:id/complete); editing another field is a future route.
 */
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { ActivitySchema, activityId, type Activity, type CreateActivityInput, type OrgId } from "@spark/core";
import { activitiesControllerCreate, activitiesControllerComplete, activitiesControllerUpdate } from "@spark/api-client";
import { confirmed } from "./confirmed.js";

export function optimisticActivity(input: Omit<CreateActivityInput, "id">, orgId: OrgId): Activity {
  const now = new Date().toISOString();
  return {
    id: activityId.create(),
    orgId,
    contactId: input.contactId ?? null,
    dealId: input.dealId ?? null,
    type: input.type,
    title: input.title,
    description: input.description ?? null,
    notes: input.notes ?? null,
    scheduledAt: input.scheduledAt,
    durationMinutes: input.durationMinutes ?? 30,
    location: input.location ?? null,
    videoCallUrl: input.videoCallUrl ?? null,
    priority: input.priority ?? "none",
    availability: input.availability ?? "free",
    ownerId: input.ownerId ?? null,
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
      shapeOptions: sparkShapeOptions("activities"),
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
          description: activity.description,
          notes: activity.notes,
          scheduledAt: activity.scheduledAt,
          durationMinutes: activity.durationMinutes,
          location: activity.location,
          videoCallUrl: activity.videoCallUrl,
          priority: activity.priority,
          availability: activity.availability,
          ownerId: activity.ownerId,
        });

        return confirmed(response);
      },
      onUpdate: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onUpdate called with no pending mutation.");

        const changedFields = Object.keys(mutation.changes);
        // Concluir/reabrir tem rota própria (grava completedAt e o evento certo);
        // qualquer outra mudança é uma edição da atividade.
        const isCompletion = changedFields.every((field) => field === "completed" || field === "completedAt");
        if (isCompletion) {
          const response = await activitiesControllerComplete(mutation.original.id, { completed: mutation.modified.completed });
          return confirmed(response);
        }

        const next = mutation.modified;
        const response = await activitiesControllerUpdate(mutation.original.id, {
          type: next.type,
          title: next.title,
          description: next.description,
          notes: next.notes,
          scheduledAt: next.scheduledAt,
          durationMinutes: next.durationMinutes,
          location: next.location,
          videoCallUrl: next.videoCallUrl,
          priority: next.priority,
          availability: next.availability,
          ownerId: next.ownerId,
          contactId: next.contactId,
          dealId: next.dealId,
        });
        return confirmed(response);
      },
    }),
  );
}

export type ActivitiesCollection = ReturnType<typeof createActivitiesCollection>;
