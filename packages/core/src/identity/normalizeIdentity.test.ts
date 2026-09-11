import { describe, expect, it } from "vitest";
import { normalizeIdentityValue } from "./normalizeIdentity.js";

describe("normalizeIdentityValue", () => {
  it("uses canonical email and phone representations", () => {
    expect(normalizeIdentityValue("email", " Pessoa@Example.COM ")).toBe("pessoa@example.com");
    expect(normalizeIdentityValue("whatsapp", "(11) 99999-0000")).toBe("+5511999990000");
  });

  it("normalizes social handles", () => {
    expect(normalizeIdentityValue("instagram", " @MinhaMarca ")).toBe("minhamarca");
  });
});
