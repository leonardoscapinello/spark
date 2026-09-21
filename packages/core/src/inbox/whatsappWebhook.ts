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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
