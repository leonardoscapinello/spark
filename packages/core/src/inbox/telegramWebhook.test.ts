import { describe, expect, it } from "vitest";
import { parseTelegramInboundMedia, parseTelegramInboundTexts } from "./telegramWebhook.js";

describe("parseTelegramInboundTexts", () => {
  it("extracts customer text from a single update", () => {
    const payload = { update_id: 1, message: { message_id: 42, date: 1_780_000_000, from: { id: 7, is_bot: false }, chat: { id: 7 }, text: " Olá " } };
    expect(parseTelegramInboundTexts(payload)).toEqual([{ externalId: "telegram:42", senderId: "7", text: "Olá", occurredAt: new Date(1_780_000_000_000) }]);
  });
  it("ignores bot messages, non-text updates and malformed payloads", () => {
    expect(parseTelegramInboundTexts({ update_id: 2, message: { message_id: 1, from: { id: 1, is_bot: true }, chat: { id: 1 }, text: "eco" } })).toEqual([]);
    expect(parseTelegramInboundTexts({ update_id: 3, message: { message_id: 2, from: { id: 1, is_bot: false }, chat: { id: 1 }, sticker: { file_id: "x" } } })).toEqual([]);
    expect(parseTelegramInboundTexts({ update_id: 4 })).toEqual([]);
    expect(parseTelegramInboundTexts(null)).toEqual([]);
  });
});

describe("parseTelegramInboundMedia", () => {
  it("extracts the largest photo size", () => {
    const payload = { message: { message_id: 1, date: 1_780_000_000, from: { id: 7, is_bot: false }, chat: { id: 7 }, caption: " Olha ", photo: [{ file_id: "small" }, { file_id: "big" }] } };
    expect(parseTelegramInboundMedia(payload)).toEqual([{ externalId: "telegram:1", senderId: "7", kind: "photo", fileId: "big", mimeType: null, filename: null, caption: "Olha", occurredAt: new Date(1_780_000_000_000) }]);
  });
  it("extracts a document with filename and mime type", () => {
    const payload = { message: { message_id: 2, from: { id: 7, is_bot: false }, chat: { id: 7 }, document: { file_id: "doc1", file_name: "contrato.pdf", mime_type: "application/pdf" } } };
    expect(parseTelegramInboundMedia(payload)).toEqual([{ externalId: "telegram:2", senderId: "7", kind: "document", fileId: "doc1", mimeType: "application/pdf", filename: "contrato.pdf", caption: null, occurredAt: expect.any(Date) }]);
  });
  it("ignores bot messages and text-only updates", () => {
    expect(parseTelegramInboundMedia({ message: { message_id: 3, from: { id: 1, is_bot: true }, chat: { id: 1 }, document: { file_id: "x" } } })).toEqual([]);
    expect(parseTelegramInboundMedia({ message: { message_id: 4, from: { id: 1, is_bot: false }, chat: { id: 1 }, text: "oi" } })).toEqual([]);
  });
  it("extracts a sticker without mime type or caption", () => {
    const payload = { message: { message_id: 5, from: { id: 7, is_bot: false }, chat: { id: 7 }, sticker: { file_id: "sticker1", emoji: "😀" } } };
    expect(parseTelegramInboundMedia(payload)).toEqual([{ externalId: "telegram:5", senderId: "7", kind: "sticker", fileId: "sticker1", mimeType: null, filename: null, caption: null, occurredAt: expect.any(Date) }]);
  });
});
