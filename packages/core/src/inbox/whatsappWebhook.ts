export interface WhatsAppInboundText {
  externalId: string;
  senderId: string;
  text: string;
  occurredAt: Date;
}

/** Only customer text messages are ingested; other message types (media, status updates) are ignored. */
export function parseWhatsAppInboundTexts(payload: unknown, phoneNumberId?: string): WhatsAppInboundText[] {
  if (!isRecord(payload) || payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) return [];
  const results: WhatsAppInboundText[] = [];
  for (const entry of payload.entry) {
    if (!isRecord(entry) || !Array.isArray(entry.changes)) continue;
    for (const change of entry.changes) {
      if (!isRecord(change) || change.field !== "messages" || !isRecord(change.value)) continue;
      const value = change.value;
      const metadata = isRecord(value.metadata) ? value.metadata : undefined;
      if (phoneNumberId && metadata?.phone_number_id !== phoneNumberId) continue;
      if (!Array.isArray(value.messages)) continue;
      for (const item of value.messages) {
        if (!isRecord(item) || item.type !== "text" || !isRecord(item.text)) continue;
        const senderId = item.from;
        const externalId = item.id;
        const text = item.text.body;
        if (typeof senderId !== "string" || !senderId || typeof externalId !== "string" || !externalId || typeof text !== "string" || !text.trim()) continue;
        const timestamp = typeof item.timestamp === "string" ? Number(item.timestamp) * 1000 : Date.now();
        const occurredAt = new Date(timestamp);
        results.push({ externalId: `whatsapp:${externalId}`, senderId, text: text.trim().slice(0, 20_000), occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt });
      }
    }
  }
  return results;
}

export type WhatsAppMediaKind = "image" | "audio" | "document" | "video" | "sticker";

export interface WhatsAppInboundMedia {
  externalId: string;
  senderId: string;
  kind: WhatsAppMediaKind;
  mediaId: string;
  mimeType: string;
  caption: string | null;
  filename: string | null;
  occurredAt: Date;
}

const MEDIA_KINDS: readonly WhatsAppMediaKind[] = ["image", "audio", "document", "video", "sticker"];

/** Same envelope as parseWhatsAppInboundTexts, but for the four media message types the Cloud API sends. */
export function parseWhatsAppInboundMedia(payload: unknown, phoneNumberId?: string): WhatsAppInboundMedia[] {
  if (!isRecord(payload) || payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) return [];
  const results: WhatsAppInboundMedia[] = [];
  for (const entry of payload.entry) {
    if (!isRecord(entry) || !Array.isArray(entry.changes)) continue;
    for (const change of entry.changes) {
      if (!isRecord(change) || change.field !== "messages" || !isRecord(change.value)) continue;
      const value = change.value;
      const metadata = isRecord(value.metadata) ? value.metadata : undefined;
      if (phoneNumberId && metadata?.phone_number_id !== phoneNumberId) continue;
      if (!Array.isArray(value.messages)) continue;
      for (const item of value.messages) {
        if (!isRecord(item) || typeof item.type !== "string" || !MEDIA_KINDS.includes(item.type as WhatsAppMediaKind)) continue;
        const kind = item.type as WhatsAppMediaKind;
        const media = item[kind];
        if (!isRecord(media)) continue;
        const senderId = item.from;
        const externalId = item.id;
        const mediaId = media.id;
        const mimeType = media.mime_type;
        if (typeof senderId !== "string" || !senderId || typeof externalId !== "string" || !externalId || typeof mediaId !== "string" || !mediaId || typeof mimeType !== "string" || !mimeType) continue;
        const timestamp = typeof item.timestamp === "string" ? Number(item.timestamp) * 1000 : Date.now();
        const occurredAt = new Date(timestamp);
        results.push({
          externalId: `whatsapp:${externalId}`,
          senderId,
          kind,
          mediaId,
          mimeType,
          caption: typeof media.caption === "string" && media.caption.trim() ? media.caption.trim().slice(0, 20_000) : null,
          filename: typeof media.filename === "string" && media.filename.trim() ? media.filename.trim() : null,
          occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
        });
      }
    }
  }
  return results;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
