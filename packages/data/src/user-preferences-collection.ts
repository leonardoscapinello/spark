import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { UserPreferenceItemSchema, UserPreferenceRowSchema, userPreferenceId, type OrgId, type UserId, type UserPreference, type UserPreferenceValue } from "@spark/core";
import { userPreferencesControllerUpsert } from "@spark/api-client";
import { confirmed } from "./confirmed.js";
import { sparkShapeOptions } from "./shape-options.js";

/** Linha otimista até o Postgres confirmar (mesmo padrão de optimisticSavedView). */
export function optimisticUserPreference(key: string, value: UserPreferenceValue, orgId: OrgId, userId: UserId): UserPreference {
  const now = new Date().toISOString();
  return { id: userPreferenceId.create(), orgId, userId, key, value, createdAt: now, updatedAt: now };
}

/**
 * Preferências do próprio usuário. A shape já chega filtrada por usuário
 * (o proxy de shapes decide org e user_id — nunca o cliente), então a
 * coleção é pequena: uma linha por chave.
 */
export function createUserPreferencesCollection() {
  return createCollection(
    electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
      id: "user_preferences",
      schema: UserPreferenceRowSchema,
      getKey: (preference) => preference.id,
      shapeOptions: sparkShapeOptions("user_preferences"),
      onInsert: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onInsert called with no pending mutation.");
        const preference = mutation.modified;
        const response = await userPreferencesControllerUpsert(preference.key, { id: preference.id, value: preference.value ?? "" });
        return confirmed(response);
      },
      onUpdate: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onUpdate called with no pending mutation.");
        const preference = mutation.modified;
        const response = await userPreferencesControllerUpsert(preference.key, { id: preference.id, value: preference.value ?? "" });
        return confirmed(response);
      },
    }),
  );
}

/** Os itens das preferências que são lista ou objeto (ADR-0035), só leitura. */
export function createUserPreferenceItemsCollection() {
  return createCollection(
    electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
      id: "user_preference_items",
      schema: UserPreferenceItemSchema,
      getKey: (item) => item.id,
      shapeOptions: sparkShapeOptions("user_preference_items"),
    }),
  );
}

export type UserPreferencesCollection = ReturnType<typeof createUserPreferencesCollection>;
export type UserPreferenceItemsCollection = ReturnType<typeof createUserPreferenceItemsCollection>;
