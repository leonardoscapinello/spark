import { describe, expect, it } from "vitest";
import { appendEventShapeScope } from "./event-shape-scope.js";

describe("appendEventShapeScope", () => {
  it("restringe a timeline a um único negócio", () => {
    const filters = ['"org_id" = $1'];
    const params = ["org"];
    appendEventShapeScope({ dealId: "01900000-0000-7000-8000-000000000001" }, filters, params);
    expect(filters).toEqual(['"org_id" = $1', '"deal_id" = $2']);
    expect(params).toEqual(["org", "01900000-0000-7000-8000-000000000001"]);
  });

  it("recusa timeline ampla ou com múltiplos escopos", () => {
    expect(() => appendEventShapeScope({}, [], [])).toThrow("Exactly one event scope is required");
    expect(() => appendEventShapeScope({ dealId: "01900000-0000-7000-8000-000000000001", contactId: "01900000-0000-7000-8000-000000000002" }, [], [])).toThrow("Exactly one event scope is required");
  });
});
