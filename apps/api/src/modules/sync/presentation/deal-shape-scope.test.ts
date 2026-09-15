import { describe, expect, it } from "vitest";
import { appendDealShapeScope } from "./deal-shape-scope.js";

const id = "00000000-0000-7000-8000-000000000001";

describe("deal shape scope", () => {
  it("narrows the detail to one deal without removing tenant isolation", () => {
    const filters = ['"org_id" = $1'];
    const params = ["authenticated-org"];
    appendDealShapeScope({ dealId: id, where: "true", orgId: "another-org" }, filters, params);
    expect(filters).toEqual(['"org_id" = $1', '"deleted_at" IS NULL', '"id" = $2']);
    expect(params).toEqual(["authenticated-org", id]);
  });

  it("preserves board filters and parameter order", () => {
    const filters = ['"org_id" = $1'];
    const params = ["authenticated-org"];
    appendDealShapeScope({ pipelineId: id, status: "open" }, filters, params);
    expect(filters).toEqual(['"org_id" = $1', '"deleted_at" IS NULL', '"pipeline_id" = $2', '"status" = $3']);
    expect(params).toEqual(["authenticated-org", id, "open"]);
  });

  it.each([{ dealId: "' OR true --" }, { pipelineId: "invalid" }, { status: "all" }])("rejects invalid scope %j", (query) => {
    expect(() => appendDealShapeScope(query, [], [])).toThrow();
  });
});
