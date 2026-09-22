import { describe, expect, it } from "vitest";
import { isWithinWhatsAppSessionWindow } from "./whatsappWindow.js";

describe("isWithinWhatsAppSessionWindow", () => {
  const now = new Date("2026-09-22T12:00:00.000Z");
  it("is false when the contact never wrote in", () => {
    expect(isWithinWhatsAppSessionWindow(null, now)).toBe(false);
  });
  it("is true within 24h of the last inbound message", () => {
    expect(isWithinWhatsAppSessionWindow("2026-09-22T00:00:01.000Z", now)).toBe(true);
  });
  it("is false past 24h", () => {
    expect(isWithinWhatsAppSessionWindow("2026-09-21T11:59:00.000Z", now)).toBe(false);
  });
});
