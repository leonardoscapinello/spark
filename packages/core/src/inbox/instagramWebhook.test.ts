import { describe, expect, it } from "vitest";
import { parseInstagramInboundTexts } from "./instagramWebhook.js";

describe("parseInstagramInboundTexts", () => {
  const payload = { object: "instagram", entry: [{ id: "business", messaging: [
    { sender: { id: "person" }, timestamp: 1_780_000_000_000, message: { mid: "m1", text: " Olá " } },
    { sender: { id: "business" }, message: { mid: "m2", text: "eco", is_echo: true } },
    { sender: { id: "person" }, message: { mid: "m3", attachments: [] } },
  ] }] };
  it("extracts customer text and skips echoes and attachments", () => {
    expect(parseInstagramInboundTexts(payload, "business")).toEqual([{ externalId: "instagram:m1", senderId: "person", text: "Olá", occurredAt: new Date(1_780_000_000_000) }]);
  });
  it("ignores other accounts and malformed envelopes", () => {
    expect(parseInstagramInboundTexts(payload, "other")).toEqual([]);
    expect(parseInstagramInboundTexts({ object: "page", entry: [] })).toEqual([]);
  });
});
