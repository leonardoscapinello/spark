import { describe, expect, it } from "vitest";
import { parseTelegramInboundTexts } from "./telegramWebhook.js";

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
