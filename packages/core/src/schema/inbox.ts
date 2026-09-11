import { z } from "zod";
import { zContactId, zConversationId, zMessageId, zOrgId, zServerTimestamp, zTeamId, zUserId } from "./zodHelpers.js";

export const CONVERSATION_CHANNELS = ["manual", "email", "instagram", "whatsapp", "messenger"] as const;
export const CONVERSATION_STATUSES = ["open", "snoozed", "closed"] as const;
export const CONVERSATION_PRIORITIES = ["normal", "priority"] as const;
export type ConversationChannel = (typeof CONVERSATION_CHANNELS)[number];
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];
export type ConversationPriority = (typeof CONVERSATION_PRIORITIES)[number];

export const ConversationSchema = z.object({
  id: zConversationId,
  orgId: zOrgId,
  contactId: zContactId,
  channel: z.enum(CONVERSATION_CHANNELS),
  subject: z.string().trim().min(1).max(300),
  status: z.enum(CONVERSATION_STATUSES).default("open"),
  priority: z.enum(CONVERSATION_PRIORITIES).default("normal"),
  assigneeId: zUserId.nullable().default(null),
  teamId: zTeamId.nullable().default(null),
  snoozedUntil: zServerTimestamp.nullable().default(null),
  lastMessageAt: zServerTimestamp,
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const MESSAGE_DIRECTIONS = ["inbound", "outbound", "internal"] as const;
export const MESSAGE_STATUSES = ["received", "draft", "queued", "sent", "delivered", "read", "failed"] as const;
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const MessageSchema = z.object({
  id: zMessageId,
  orgId: zOrgId,
  conversationId: zConversationId,
  contactId: zContactId,
  authorUserId: zUserId.nullable(),
  direction: z.enum(MESSAGE_DIRECTIONS),
  status: z.enum(MESSAGE_STATUSES),
  body: z.string().trim().min(1).max(20_000),
  externalId: z.string().max(500).nullable(),
  createdAt: zServerTimestamp,
});
export type Message = z.infer<typeof MessageSchema>;

export const CreateConversationInputSchema = ConversationSchema.pick({ id: true, contactId: true, channel: true, subject: true });
export type CreateConversationInput = z.infer<typeof CreateConversationInputSchema>;

export const UpdateConversationInputSchema = z.object({
  status: z.enum(CONVERSATION_STATUSES).optional(),
  priority: z.enum(CONVERSATION_PRIORITIES).optional(),
  assigneeId: zUserId.nullable().optional(),
  teamId: zTeamId.nullable().optional(),
  snoozedUntil: zServerTimestamp.nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, { error: "At least one field is required" });
export type UpdateConversationInput = z.infer<typeof UpdateConversationInputSchema>;

export const AddInternalNoteInputSchema = MessageSchema.pick({ id: true, body: true });
export type AddInternalNoteInput = z.infer<typeof AddInternalNoteInputSchema>;

export const ConversationWriteResponseSchema = z.object({ conversation: ConversationSchema, txid: z.number().int() });
export const MessageWriteResponseSchema = z.object({ message: MessageSchema, conversation: ConversationSchema, txid: z.number().int() });
export type ConversationWriteResponse = z.infer<typeof ConversationWriteResponseSchema>;
export type MessageWriteResponse = z.infer<typeof MessageWriteResponseSchema>;
