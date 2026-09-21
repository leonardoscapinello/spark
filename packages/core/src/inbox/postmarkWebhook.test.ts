import { describe, expect, it } from "vitest";
import { parsePostmarkInboundEmail } from "./postmarkWebhook.js";

describe("parsePostmarkInboundEmail", () => {
  it("extracts text body, subject and sender", () => {
    const payload = { From: "cliente@example.com", FromName: "Cliente Exemplo", Subject: "Dúvida", TextBody: " Olá, tudo bem? ", MessageID: "abc-123", Date: "2026-09-21T10:00:00Z" };
    expect(parsePostmarkInboundEmail(payload)).toEqual({ externalId: "email:abc-123", senderId: "cliente@example.com", senderName: "Cliente Exemplo", subject: "Dúvida", text: "Olá, tudo bem?", occurredAt: new Date("2026-09-21T10:00:00Z") });
  });
  it("falls back to a stripped html body when there is no text body", () => {
    const payload = { From: "cliente@example.com", HtmlBody: "<p>Oi <b>time</b></p>", MessageID: "abc-124" };
    expect(parsePostmarkInboundEmail(payload)?.text).toBe("Oi time");
  });
  it("rejects payloads missing sender, id or any readable body", () => {
    expect(parsePostmarkInboundEmail({ From: "a@b.com", MessageID: "x" })).toBeNull();
    expect(parsePostmarkInboundEmail({ MessageID: "x", TextBody: "oi" })).toBeNull();
    expect(parsePostmarkInboundEmail(null)).toBeNull();
  });
});
