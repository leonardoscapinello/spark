import { describe, expect, it } from "vitest";
import { appendDealFollowerShapeScope } from "./deal-follower-shape-scope.js";

describe("appendDealFollowerShapeScope", () => {
  it("limits the shape to exactly one deal", () => {
    const filters = ['"org_id" = $1'];
    const params = ["org"];
    appendDealFollowerShapeScope({ dealId: "01900000-0000-7000-8000-000000000001" }, filters, params);
    expect(filters).toEqual(['"org_id" = $1', '"deal_id" = $2']);
    expect(params).toEqual(["org", "01900000-0000-7000-8000-000000000001"]);
  });

  it("rejects missing and invalid deal identifiers", () => {
    expect(() => appendDealFollowerShapeScope({}, [], [])).toThrow("Invalid dealId");
    expect(() => appendDealFollowerShapeScope({ dealId: "all" }, [], [])).toThrow("Invalid dealId");
  });
});
