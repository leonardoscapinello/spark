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

export type TelegramMediaKind = "photo" | "document" | "voice" | "video";

export interface TelegramInboundMedia {
  externalId: string;
  senderId: string;
  kind: TelegramMediaKind;
  fileId: string;
  mimeType: string | null;
  filename: string | null;
  caption: string | null;
  occurredAt: Date;
}

/** Same one-update-per-request shape as parseTelegramInboundTexts. `photo` comes as an array of sizes — the last is the largest. */
export function parseTelegramInboundMedia(payload: unknown): TelegramInboundMedia[] {
  if (!isRecord(payload) || !isRecord(payload.message)) return [];
  const message = payload.message;
  if (!isRecord(message.from) || !isRecord(message.chat) || message.from.is_bot === true) return [];
  const senderId = message.chat.id;
  const externalId = message.message_id;
  if ((typeof senderId !== "string" && typeof senderId !== "number") || (typeof externalId !== "string" && typeof externalId !== "number")) return [];
  const timestamp = typeof message.date === "number" ? message.date * 1000 : Date.now();
  const occurredAt = new Date(timestamp);
  const caption = typeof message.caption === "string" && message.caption.trim() ? message.caption.trim().slice(0, 20_000) : null;
  const base = { externalId: `telegram:${externalId}`, senderId: String(senderId), caption, occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt };

  if (Array.isArray(message.photo) && message.photo.length > 0) {
    const largest = message.photo[message.photo.length - 1];
    if (isRecord(largest) && typeof largest.file_id === "string" && largest.file_id) return [{ ...base, kind: "photo", fileId: largest.file_id, mimeType: null, filename: null }];
  }
  if (isRecord(message.document) && typeof message.document.file_id === "string" && message.document.file_id) {
    return [{ ...base, kind: "document", fileId: message.document.file_id, mimeType: typeof message.document.mime_type === "string" ? message.document.mime_type : null, filename: typeof message.document.file_name === "string" ? message.document.file_name : null }];
  }
  if (isRecord(message.voice) && typeof message.voice.file_id === "string" && message.voice.file_id) {
    return [{ ...base, kind: "voice", fileId: message.voice.file_id, mimeType: typeof message.voice.mime_type === "string" ? message.voice.mime_type : null, filename: null }];
  }
  if (isRecord(message.video) && typeof message.video.file_id === "string" && message.video.file_id) {
    return [{ ...base, kind: "video", fileId: message.video.file_id, mimeType: typeof message.video.mime_type === "string" ? message.video.mime_type : null, filename: null }];
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
