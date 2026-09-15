import { describe, expect, it } from "vitest";
import { auditChanges } from "./auditTrail.js";

describe("auditChanges", () => {
  it("registra somente alterações reais e serializa valores para o evento", () => {
    expect(auditChanges(
      { name: "Antes", ownerId: null, expectedCloseDate: new Date("2026-09-14T12:00:00Z") },
      { name: "Depois", ownerId: null, expectedCloseDate: new Date("2026-09-15T12:00:00Z") },
      ["name", "ownerId", "expectedCloseDate"],
    )).toEqual([
      { field: "name", before: "Antes", after: "Depois" },
      { field: "expectedCloseDate", before: "2026-09-14T12:00:00.000Z", after: "2026-09-15T12:00:00.000Z" },
    ]);
  });
});
