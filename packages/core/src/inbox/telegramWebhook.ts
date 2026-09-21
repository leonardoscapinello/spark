export interface TelegramInboundText {
  externalId: string;
  senderId: string;
  text: string;
  occurredAt: Date;
}

/** Telegram posts one update per request (no batching, no accountId to filter by — the webhook path already picks the bot). Only customer text is ingested; bot messages and non-text are ignored. */
export function parseTelegramInboundTexts(payload: unknown): TelegramInboundText[] {
  if (!isRecord(payload) || !isRecord(payload.message)) return [];
  const message = payload.message;
  if (!isRecord(message.from) || !isRecord(message.chat) || message.from.is_bot === true) return [];
  const senderId = message.chat.id;
  const externalId = message.message_id;
  const text = message.text;
  if ((typeof senderId !== "string" && typeof senderId !== "number") || (typeof externalId !== "string" && typeof externalId !== "number") || typeof text !== "string" || !text.trim()) return [];
  const timestamp = typeof message.date === "number" ? message.date * 1000 : Date.now();
  const occurredAt = new Date(timestamp);
  return [{ externalId: `telegram:${externalId}`, senderId: String(senderId), text: text.trim().slice(0, 20_000), occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt }];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
