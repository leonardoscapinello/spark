import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { ConversationSchema, conversationId, firstResponseDueAt, type Conversation, type CreateConversationInput, type OrgId } from "@spark/core";
import { getSparkApiBaseUrl, getSparkAuthToken, inboxControllerCreate, inboxControllerUpdate } from "@spark/api-client";

export function optimisticConversation(input: Omit<CreateConversationInput, "id">, orgId: OrgId, assigneeId: Conversation["assigneeId"]): Conversation {
  const now = new Date().toISOString();
  return { id: conversationId.create(), orgId, contactId: input.contactId, channel: input.channel, subject: input.subject, status: "open", priority: "normal", assigneeId, teamId: null, snoozedUntil: null, firstResponseDueAt: firstResponseDueAt(now, "normal"), firstRespondedAt: null, lastMessageAt: now, createdAt: now, updatedAt: now };
}

export function createConversationsCollection() {
  return createCollection(electricCollectionOptions({
    id: "conversations",
    schema: ConversationSchema,
    getKey: (conversation) => conversation.id,
    shapeOptions: { url: `${getSparkApiBaseUrl()}/v1/shapes/conversations`, columnMapper: snakeCamelMapper(), headers: { authorization: () => bearer() } },
    onInsert: async ({ transaction }) => {
      const value = transaction.mutations[0]?.modified;
      if (!value) throw new Error("Conversation insert has no mutation.");
      const response = await inboxControllerCreate({ id: value.id, contactId: value.contactId, channel: value.channel, subject: value.subject });
      return { txid: response.txid };
    },
    onUpdate: async ({ transaction }) => {
      const mutation = transaction.mutations[0];
      if (!mutation) throw new Error("Conversation update has no mutation.");
      const allowed = new Set(["status", "priority", "assigneeId", "teamId", "snoozedUntil"]);
      const changed = Object.keys(mutation.changes);
      if (!changed.length || !changed.every((field) => allowed.has(field))) throw new Error(`Unsupported conversation field(s): ${changed.join(", ")}.`);
      const response = await inboxControllerUpdate(mutation.original.id, {
        ...(changed.includes("status") ? { status: mutation.modified.status } : {}),
        ...(changed.includes("priority") ? { priority: mutation.modified.priority } : {}),
        ...(changed.includes("assigneeId") ? { assigneeId: mutation.modified.assigneeId } : {}),
        ...(changed.includes("teamId") ? { teamId: mutation.modified.teamId } : {}),
        ...(changed.includes("snoozedUntil") ? { snoozedUntil: mutation.modified.snoozedUntil } : {}),
      });
      return { txid: response.txid };
    },
  }));
}

function bearer(): string {
  const token = getSparkAuthToken();
  return token ? `Bearer ${token}` : "";
}

export type ConversationsCollection = ReturnType<typeof createConversationsCollection>;
