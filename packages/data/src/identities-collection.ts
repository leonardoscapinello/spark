import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { IdentitySchema, identityId, type ContactId, type Identity, type IdentityChannel, type OrgId } from "@spark/core";
import { contactsControllerAddIdentity, getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";
import { confirmed } from "./confirmed.js";

export function optimisticIdentity(input: { contactId: ContactId; channel: IdentityChannel; externalValue: string }, orgId: OrgId): Identity {
  return {
    id: identityId.create(),
    orgId,
    contactId: input.contactId,
    channel: input.channel,
    externalValue: input.externalValue,
    verified: false,
    createdAt: new Date().toISOString(),
  };
}

export function createIdentitiesCollection() {
  return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "identities",
    schema: IdentitySchema,
    getKey: (identity) => identity.id,
    shapeOptions: {
      url: `${getSparkApiBaseUrl()}/v1/shapes/identities`,
      columnMapper: snakeCamelMapper(),
      headers: { authorization: () => { const token = getSparkAuthToken(); return token ? `Bearer ${token}` : ""; } },
    },
    onInsert: async ({ transaction }) => {
      const mutation = transaction.mutations[0];
      if (!mutation) throw new Error("onInsert called with no pending mutation.");
      const identity = mutation.modified;
      const response = await contactsControllerAddIdentity(identity.contactId, {
        channel: identity.channel,
        externalValue: identity.externalValue,
      });
      return confirmed(response);
    },
  }));
}

export type IdentitiesCollection = ReturnType<typeof createIdentitiesCollection>;
