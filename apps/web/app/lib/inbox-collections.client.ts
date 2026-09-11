import { createConversationsCollection, createMessagesCollection, type ConversationsCollection, type MessagesCollection } from "@spark/data";

let conversations: ConversationsCollection | undefined;
let messages: MessagesCollection | undefined;

export function getConversationsCollection(): ConversationsCollection {
  conversations ??= createConversationsCollection();
  return conversations;
}

export function getMessagesCollection(): MessagesCollection {
  messages ??= createMessagesCollection();
  return messages;
}
