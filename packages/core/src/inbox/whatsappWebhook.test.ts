import { describe, expect, it } from "vitest";
import { parseWhatsAppInboundTexts } from "./whatsappWebhook.js";

describe("parseWhatsAppInboundTexts", () => {
  const payload = { object: "whatsapp_business_account", entry: [{ id: "waba", changes: [{ field: "messages", value: {
    metadata: { phone_number_id: "123" },
    messages: [
      { from: "5511999990000", id: "wamid.1", timestamp: "1780000000", type: "text", text: { body: " Olá " } },
      { from: "5511999990000", id: "wamid.2", timestamp: "1780000001", type: "image", image: { id: "media1" } },
      { from: "5511999990000", type: "text", text: { body: "sem id" } },
    ],
  } }] }] };
  it("extracts customer text and skips non-text and malformed messages", () => {
    expect(parseWhatsAppInboundTexts(payload, "123")).toEqual([{ externalId: "whatsapp:wamid.1", senderId: "5511999990000", text: "Olá", occurredAt: new Date(1_780_000_000_000) }]);
  });
  it("ignores other phone numbers and malformed envelopes", () => {
    expect(parseWhatsAppInboundTexts(payload, "other")).toEqual([]);
    expect(parseWhatsAppInboundTexts({ object: "page", entry: [] })).toEqual([]);
  });
  it("ignores status-only changes", () => {
    expect(parseWhatsAppInboundTexts({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "message_template_status_update", value: {} }] }] })).toEqual([]);
  });
});
