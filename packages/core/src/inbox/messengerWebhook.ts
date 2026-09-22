export interface MessengerInboundText {
  externalId: string;
  senderId: string;
  text: string;
  occurredAt: Date;
}

/** Only customer text DMs are ingested; echoes and unsupported attachments are ignored. */
export function parseMessengerInboundTexts(payload: unknown, pageId?: string): MessengerInboundText[] {
  if (!isRecord(payload) || payload.object !== "page" || !Array.isArray(payload.entry)) return [];
  const results: MessengerInboundText[] = [];
  for (const entry of payload.entry) {
    if (!isRecord(entry) || (pageId && entry.id !== pageId) || !Array.isArray(entry.messaging)) continue;
    for (const item of entry.messaging) {
      if (!isRecord(item) || !isRecord(item.sender) || !isRecord(item.message) || item.message.is_echo === true) continue;
      const senderId = item.sender.id;
      const externalId = item.message.mid;
      const text = item.message.text;
      if (typeof senderId !== "string" || !senderId || typeof externalId !== "string" || !externalId || typeof text !== "string" || !text.trim()) continue;
      const timestamp = typeof item.timestamp === "number" ? item.timestamp : Date.now();
      const occurredAt = new Date(timestamp);
      results.push({ externalId: `messenger:${externalId}`, senderId, text: text.trim().slice(0, 20_000), occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt });
    }
  }
  return results;
}

export type MessengerMediaKind = "image" | "video" | "audio" | "file";

export interface MessengerInboundMedia {
  externalId: string;
  senderId: string;
  kind: MessengerMediaKind;
  url: string;
  occurredAt: Date;
}

const MEDIA_KINDS: readonly MessengerMediaKind[] = ["image", "video", "audio", "file"];

/** Same envelope as parseMessengerInboundTexts. Like Instagram (same Meta Send API), the attachment already carries a fetchable URL. */
export function parseMessengerInboundMedia(payload: unknown, pageId?: string): MessengerInboundMedia[] {
  if (!isRecord(payload) || payload.object !== "page" || !Array.isArray(payload.entry)) return [];
  const results: MessengerInboundMedia[] = [];
  for (const entry of payload.entry) {
    if (!isRecord(entry) || (pageId && entry.id !== pageId) || !Array.isArray(entry.messaging)) continue;
    for (const item of entry.messaging) {
      if (!isRecord(item) || !isRecord(item.sender) || !isRecord(item.message) || item.message.is_echo === true || !Array.isArray(item.message.attachments)) continue;
      const senderId = item.sender.id;
      const externalId = item.message.mid;
      if (typeof senderId !== "string" || !senderId || typeof externalId !== "string" || !externalId) continue;
      const timestamp = typeof item.timestamp === "number" ? item.timestamp : Date.now();
      const occurredAt = new Date(timestamp);
      for (const [index, attachment] of item.message.attachments.entries()) {
        if (!isRecord(attachment) || typeof attachment.type !== "string" || !MEDIA_KINDS.includes(attachment.type as MessengerMediaKind) || !isRecord(attachment.payload)) continue;
        const url = attachment.payload.url;
        if (typeof url !== "string" || !url) continue;
        results.push({ externalId: `messenger:${externalId}:${index}`, senderId, kind: attachment.type as MessengerMediaKind, url, occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt });
      }
    }
  }
  return results;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
