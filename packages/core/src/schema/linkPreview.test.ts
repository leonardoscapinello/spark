import { describe, expect, it } from "vitest";
import { linkPreviewNeedsRefresh, normalizeLinkPreviewUrl } from "./linkPreview.js";

describe("link preview", () => {
  it("normaliza a URL e remove fragmento que não muda a página", () => {
    expect(normalizeLinkPreviewUrl(" https://Example.com/path#section ")).toBe("https://example.com/path");
  });

  it("recusa protocolos e credenciais que não podem ser buscados", () => {
    expect(() => normalizeLinkPreviewUrl("file:///etc/passwd")).toThrow();
    expect(() => normalizeLinkPreviewUrl("https://user:secret@example.com")).toThrow();
  });

  it("vence exatamente na data de expiração", () => {
    expect(linkPreviewNeedsRefresh({ expiresAt: "2026-09-14T12:00:00.000Z" }, new Date("2026-09-14T12:00:00.000Z"))).toBe(true);
  });
});
