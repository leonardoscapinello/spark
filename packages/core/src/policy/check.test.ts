import { describe, expect, it } from "vitest";
import { effectiveCapabilities, hasCapability } from "./check.js";
import { DEFAULT_GROUPS } from "./defaultGroups.js";

describe("hasCapability — the system's single permission check (docs/adr/0029)", () => {
  it("grants when some group the user belongs to has the capability", () => {
    const groups = [{ capabilities: ["contacts:read"] as const }];
    expect(hasCapability(groups, "contacts:read")).toBe(true);
  });

  it("flattens effective capabilities in canonical order without duplicates", () => {
    expect(effectiveCapabilities([
      { capabilities: ["contacts:read", "users:manage"] },
      { capabilities: ["contacts:read", "deals:read"] },
    ])).toEqual(["contacts:read", "users:manage", "deals:read"]);
  });

  it("denies when no group has the capability", () => {
    const groups = [{ capabilities: ["contacts:read"] as const }];
    expect(hasCapability(groups, "contacts:write")).toBe(false);
  });

  it("denies by default when the user has no group at all", () => {
    expect(hasCapability([], "contacts:read")).toBe(false);
  });

  it("grants if ANY of the user's several groups has the capability", () => {
    const groups = [{ capabilities: ["contacts:read"] as const }, { capabilities: ["permission_groups:manage"] as const }];
    expect(hasCapability(groups, "permission_groups:manage")).toBe(true);
  });
});

describe("DEFAULT_GROUPS — the five groups every new organization receives", () => {
  it("are exactly five, with a unique name each", () => {
    expect(DEFAULT_GROUPS).toHaveLength(5);
    expect(new Set(DEFAULT_GROUPS.map((g) => g.name)).size).toBe(5);
  });

  it("Proprietário and Administrador have every existing capability", () => {
    const owner = DEFAULT_GROUPS.find((g) => g.name === "Proprietário");
    const admin = DEFAULT_GROUPS.find((g) => g.name === "Administrador");
    expect(hasCapability(owner ? [owner] : [], "permission_groups:manage")).toBe(true);
    expect(hasCapability(admin ? [admin] : [], "permission_groups:manage")).toBe(true);
  });

  it("Visualizador never has a write capability", () => {
    const viewer = DEFAULT_GROUPS.find((g) => g.name === "Visualizador");
    expect(hasCapability(viewer ? [viewer] : [], "contacts:write")).toBe(false);
  });
});
