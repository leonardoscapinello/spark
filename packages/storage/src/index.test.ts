import { describe, expect, it } from "vitest";
import { safeObjectKey } from "./index.js";
describe("safeObjectKey", () => {
  it("forces every object under the organization prefix", () => expect(safeObjectKey("org-1", "/contacts/avatar.png")).toBe("org-1/contacts/avatar.png"));
  it("rejects traversal and platform-specific separators", () => { expect(() => safeObjectKey("org-1", "../secret.txt")).toThrow(); expect(() => safeObjectKey("org-1", "x\\y")).toThrow(); });
});
