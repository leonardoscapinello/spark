import { describe, expect, it } from "vitest";
import { readableCustomFieldEntities } from "./customFields.js";
import { canReadSyncResource } from "./syncAccess.js";
describe("custom field access", () => {
  it("limits values to the modules the person can read", () => {
    expect(readableCustomFieldEntities(["inbox:read"])).toEqual(["conversation", "service_cycle"]);
    expect(readableCustomFieldEntities(["campaigns:read", "contacts:read"])).toEqual(["contact", "campaign"]);
    expect(readableCustomFieldEntities(["users:manage"])).toEqual(["user"]);
  });
  it("permits configuration without granting access to record values", () => {
    expect(canReadSyncResource(["settings:manage"], "custom_field_groups")).toBe(true);
    expect(canReadSyncResource(["settings:manage"], "custom_field_values")).toBe(false);
    expect(readableCustomFieldEntities(["settings:manage"])).toEqual([]);
  });
});
