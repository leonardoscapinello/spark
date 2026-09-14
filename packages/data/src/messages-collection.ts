import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { MessageSchema, messageId, type ContactId, type ConversationId, type Message, type OrgId, type UserId } from "@spark/core";
import { getSparkApiBaseUrl, getSparkAuthToken, inboxControllerNote } from "@spark/api-client";
import { confirmed } from "./confirmed.js";

export function optimisticInternalNote(input: { conversationId: ConversationId; contactId: ContactId; authorUserId: UserId; body: string }, orgId: OrgId): Message {
  const now = new Date().toISOString();
  return { id: messageId.create(), orgId, conversationId: input.conversationId, contactId: input.contactId, authorUserId: input.authorUserId, direction: "internal", status: "sent", body: input.body, externalId: null, createdAt: now, updatedAt: now, deletedAt: null };
}

export function createMessagesCollection() {
  return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "messages",
    schema: MessageSchema,
    getKey: (message) => message.id,
    shapeOptions: { url: `${getSparkApiBaseUrl()}/v1/shapes/messages`, columnMapper: snakeCamelMapper(), headers: { authorization: () => bearer() } },
    onInsert: async ({ transaction }) => {
      const value = transaction.mutations[0]?.modified;
      if (!value || value.direction !== "internal") throw new Error("Only internal notes can be created directly.");
      const response = await inboxControllerNote(value.conversationId, { id: value.id, body: value.body });
      return confirmed(response);
    },
  }));
}

function bearer(): string {
  const token = getSparkAuthToken();
  return token ? `Bearer ${token}` : "";
}

export type MessagesCollection = ReturnType<typeof createMessagesCollection>;
