import { z } from "zod";
import { zConversationId, zMessageId } from "./zodHelpers.js";

export const WIDGET_POSITIONS = ["left", "right"] as const;
export type WidgetPosition = (typeof WIDGET_POSITIONS)[number];

/** O que o embed público enxerga de um widget — nunca orgId, connectionId nem nada interno. */
export const WidgetConfigSchema = z.object({
  publicKey: z.string().min(20).max(100),
  name: z.string().trim().min(1).max(160),
  welcomeMessage: z.string().trim().min(1).max(500),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  position: z.enum(WIDGET_POSITIONS),
});
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;

/** Mensagem como o visitante do site enxerga — sem orgId/contactId/authorUserId. */
export const WidgetMessageSchema = z.object({
  id: zMessageId,
  direction: z.enum(["inbound", "outbound"]),
  body: z.string(),
  createdAt: z.string(),
});
export type WidgetMessage = z.infer<typeof WidgetMessageSchema>;

export const StartWidgetConversationInputSchema = z.object({
  visitorId: z.string().trim().min(8).max(120),
  name: z.string().trim().max(200).optional(),
  message: z.object({ id: zMessageId, body: z.string().trim().min(1).max(4_000) }),
});
export type StartWidgetConversationInput = z.infer<typeof StartWidgetConversationInputSchema>;

export const SendWidgetMessageInputSchema = z.object({
  visitorId: z.string().trim().min(8).max(120),
  id: zMessageId,
  body: z.string().trim().min(1).max(4_000),
});
export type SendWidgetMessageInput = z.infer<typeof SendWidgetMessageInputSchema>;

export const WidgetConversationStateSchema = z.object({
  conversationId: zConversationId,
  messages: z.array(WidgetMessageSchema),
});
export type WidgetConversationState = z.infer<typeof WidgetConversationStateSchema>;
