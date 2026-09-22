export interface InstagramInboundText {
  externalId: string;
  senderId: string;
  text: string;
  occurredAt: Date;
}

/** Only customer text DMs are ingested; echoes and unsupported attachments are ignored. */
export function parseInstagramInboundTexts(payload: unknown, accountId?: string): InstagramInboundText[] {
  if (!isRecord(payload) || payload.object !== "instagram" || !Array.isArray(payload.entry)) return [];
  const results: InstagramInboundText[] = [];
  for (const entry of payload.entry) {
    if (!isRecord(entry) || (accountId && entry.id !== accountId) || !Array.isArray(entry.messaging)) continue;
    for (const item of entry.messaging) {
      if (!isRecord(item) || !isRecord(item.sender) || !isRecord(item.message) || item.message.is_echo === true) continue;
      const senderId = item.sender.id;
      const externalId = item.message.mid;
      const text = item.message.text;
      if (typeof senderId !== "string" || !senderId || typeof externalId !== "string" || !externalId || typeof text !== "string" || !text.trim()) continue;
      const timestamp = typeof item.timestamp === "number" ? item.timestamp : Date.now();
      const occurredAt = new Date(timestamp);
      results.push({ externalId: `instagram:${externalId}`, senderId, text: text.trim().slice(0, 20_000), occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt });
    }
  }
  return results;
}

export type InstagramMediaKind = "image" | "video" | "audio";

export interface InstagramInboundMedia {
  externalId: string;
  senderId: string;
  kind: InstagramMediaKind;
  url: string;
  occurredAt: Date;
}

const MEDIA_KINDS: readonly InstagramMediaKind[] = ["image", "video", "audio"];

/** Same envelope as parseInstagramInboundTexts. Unlike WhatsApp, the attachment already carries a fetchable URL — no id→URL lookup step. */
export function parseInstagramInboundMedia(payload: unknown, accountId?: string): InstagramInboundMedia[] {
  if (!isRecord(payload) || payload.object !== "instagram" || !Array.isArray(payload.entry)) return [];
  const results: InstagramInboundMedia[] = [];
  for (const entry of payload.entry) {
    if (!isRecord(entry) || (accountId && entry.id !== accountId) || !Array.isArray(entry.messaging)) continue;
    for (const item of entry.messaging) {
      if (!isRecord(item) || !isRecord(item.sender) || !isRecord(item.message) || item.message.is_echo === true || !Array.isArray(item.message.attachments)) continue;
      const senderId = item.sender.id;
      const externalId = item.message.mid;
      if (typeof senderId !== "string" || !senderId || typeof externalId !== "string" || !externalId) continue;
      const timestamp = typeof item.timestamp === "number" ? item.timestamp : Date.now();
      const occurredAt = new Date(timestamp);
      for (const [index, attachment] of item.message.attachments.entries()) {
        if (!isRecord(attachment) || typeof attachment.type !== "string" || !MEDIA_KINDS.includes(attachment.type as InstagramMediaKind) || !isRecord(attachment.payload)) continue;
        const url = attachment.payload.url;
        if (typeof url !== "string" || !url) continue;
        results.push({ externalId: `instagram:${externalId}:${index}`, senderId, kind: attachment.type as InstagramMediaKind, url, occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt });
      }
    }
  }
  return results;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
