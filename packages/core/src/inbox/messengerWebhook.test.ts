import { describe, expect, it } from "vitest";
import { parseMessengerInboundMedia, parseMessengerInboundTexts } from "./messengerWebhook.js";

describe("parseMessengerInboundTexts", () => {
  const payload = { object: "page", entry: [{ id: "page", messaging: [
    { sender: { id: "person" }, timestamp: 1_780_000_000_000, message: { mid: "m1", text: " Olá " } },
    { sender: { id: "page" }, message: { mid: "m2", text: "eco", is_echo: true } },
    { sender: { id: "person" }, message: { mid: "m3", attachments: [] } },
  ] }] };
  it("extracts customer text and skips echoes and attachments", () => {
    expect(parseMessengerInboundTexts(payload, "page")).toEqual([{ externalId: "messenger:m1", senderId: "person", text: "Olá", occurredAt: new Date(1_780_000_000_000) }]);
  });
  it("ignores other pages and malformed envelopes", () => {
    expect(parseMessengerInboundTexts(payload, "other")).toEqual([]);
    expect(parseMessengerInboundTexts({ object: "instagram", entry: [] })).toEqual([]);
  });
});

describe("parseMessengerInboundMedia", () => {
  const payload = { object: "page", entry: [{ id: "page", messaging: [
    { sender: { id: "person" }, timestamp: 1_780_000_000_000, message: { mid: "m1", attachments: [{ type: "file", payload: { url: "https://cdn.example.com/a.pdf" } }] } },
    { sender: { id: "page" }, message: { mid: "m2", attachments: [{ type: "image", payload: { url: "https://cdn.example.com/echo.jpg" } }], is_echo: true } },
    { sender: { id: "person" }, message: { mid: "m3", text: "sem mídia" } },
  ] }] };
  it("extracts fetchable media urls, skipping echoes and text-only messages", () => {
    expect(parseMessengerInboundMedia(payload, "page")).toEqual([{ externalId: "messenger:m1:0", senderId: "person", kind: "file", url: "https://cdn.example.com/a.pdf", occurredAt: new Date(1_780_000_000_000) }]);
  });
  it("ignores other pages and malformed envelopes", () => {
    expect(parseMessengerInboundMedia(payload, "other")).toEqual([]);
    expect(parseMessengerInboundMedia({ object: "instagram", entry: [] })).toEqual([]);
  });
});
