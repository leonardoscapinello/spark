import type { Conversation } from "../schema/inbox.js";

/** Uma entrada por pessoa; os registros por canal continuam sendo rotas de entrega. */
export function personThreads(conversations: readonly Conversation[]): Conversation[] {
  const latest = new Map<Conversation["contactId"], Conversation>();
  for (const conversation of conversations) {
    const current = latest.get(conversation.contactId);
    if (!current || conversation.lastMessageAt > current.lastMessageAt) latest.set(conversation.contactId, conversation);
  }
  return [...latest.values()];
}
