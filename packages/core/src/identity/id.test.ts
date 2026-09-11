import { describe, expect, it } from "vitest";
import { orgId, contactId } from "./id.js";

describe("UUID v7 identifiers", () => {
  it("creates a valid new id", () => {
    const id = orgId.create();
    expect(() => orgId.from(id)).not.toThrow();
  });

  it("rejects a string that is not a UUID", () => {
    expect(() => orgId.from("not-a-uuid")).toThrow("must be a UUID v7");
  });

  it("rejects a UUID of another version (v4)", () => {
    // classic v4, not v7 — right shape, wrong version
    expect(() => orgId.from("109156be-c4fb-41ea-b1b4-efe1671c5836")).toThrow();
  });

  it("two different id types are not interchangeable at the type level", () => {
    const org = orgId.create();
    const contact = contactId.create();
    // values are distinct strings; the type system (checked by tsc) is what
    // actually enforces the separation — here we just confirm generated ids are unique.
    expect(org).not.toBe(contact);
  });
});
