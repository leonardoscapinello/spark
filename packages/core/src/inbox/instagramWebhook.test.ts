import { describe, expect, it } from "vitest";
import { parseInstagramInboundMedia, parseInstagramInboundTexts } from "./instagramWebhook.js";

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

describe("parseInstagramInboundMedia", () => {
  const payload = { object: "instagram", entry: [{ id: "business", messaging: [
    { sender: { id: "person" }, timestamp: 1_780_000_000_000, message: { mid: "m1", attachments: [{ type: "image", payload: { url: "https://cdn.example.com/a.jpg" } }] } },
    { sender: { id: "business" }, message: { mid: "m2", attachments: [{ type: "image", payload: { url: "https://cdn.example.com/echo.jpg" } }], is_echo: true } },
    { sender: { id: "person" }, message: { mid: "m3", attachments: [{ type: "share", payload: {} }] } },
    { sender: { id: "person" }, message: { mid: "m4", text: "sem mídia" } },
  ] }] };
  it("extracts fetchable media urls, skipping echoes and unsupported attachment types", () => {
    expect(parseInstagramInboundMedia(payload, "business")).toEqual([{ externalId: "instagram:m1:0", senderId: "person", kind: "image", url: "https://cdn.example.com/a.jpg", occurredAt: new Date(1_780_000_000_000) }]);
  });
  it("ignores other accounts and malformed envelopes", () => {
    expect(parseInstagramInboundMedia(payload, "other")).toEqual([]);
    expect(parseInstagramInboundMedia({ object: "page", entry: [] })).toEqual([]);
  });
});
