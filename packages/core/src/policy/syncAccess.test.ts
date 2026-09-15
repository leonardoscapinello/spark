import { describe, expect, it } from "vitest";
import { canReadSyncResource, readableEventPrefixes } from "./syncAccess.js";

describe("sync access", () => {
  it("denies a business collection without its read capability", () => {
    expect(canReadSyncResource(["contacts:read"], "contacts")).toBe(true);
    expect(canReadSyncResource(["contacts:read"], "deals")).toBe(false);
    expect(canReadSyncResource([], "users")).toBe(false);
  });

  it("only exposes timeline domains granted to the user", () => {
    expect(readableEventPrefixes(["contacts:read", "activities:read"])).toEqual(["contact", "identity", "note", "activity"]);
  });
});
