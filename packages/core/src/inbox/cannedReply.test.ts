import { describe, expect, it } from "vitest";
import { normalizeCannedReplyShortcut } from "./cannedReply.js";

describe("normalizeCannedReplyShortcut", () => {
  it("normaliza o atalho digitado pela equipe", () => expect(normalizeCannedReplyShortcut(" /Boas Vindas ")).toBe("boas-vindas"));
  it("recusa pontuação que conflita com o comando", () => expect(() => normalizeCannedReplyShortcut("oi!" )).toThrow());
});
