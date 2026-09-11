import { CAPABILITIES, type Capability } from "./capability.js";

/**
 * The five groups every new organization receives (docs/adr/0029).
 * Manager vs. Agent: the real difference is `pipelines:manage` — Manager
 * configures stages and pipelines, Agent only works the deal within what
 * already exists. Per-record visibility (Agent sees only their own leads)
 * is out of scope for v1 by ADR-0029's own decision ("per-record ACL...
 * dropped for v1") — today the difference is only about capability, not
 * data scope.
 *
 * Group names stay in Portuguese — they're product content shown as-is to
 * end users in the (future) permission management screen, not code.
 */
export const DEFAULT_GROUPS: ReadonlyArray<{ name: string; capabilities: readonly Capability[] }> = [
  { name: "Proprietário", capabilities: CAPABILITIES },
  { name: "Administrador", capabilities: CAPABILITIES },
  {
    name: "Gerente",
    capabilities: [
      "contacts:read",
      "contacts:write",
      "companies:read",
      "companies:write",
      "pipelines:manage",
      "deals:read",
      "deals:write",
      "deals:move",
      "activities:read",
      "activities:write",
      "inbox:read",
      "inbox:write",
      "automations:read",
      "automations:write",
      "automations:publish",
      "integrations:read",
      "files:read",
      "files:write",
      "catalog:read",
      "catalog:write",
      "forms:read",
      "forms:write",
    ],
  },
  {
    name: "Agente",
    capabilities: [
      "contacts:read",
      "contacts:write",
      "companies:read",
      "companies:write",
      "deals:read",
      "deals:write",
      "deals:move",
      "activities:read",
      "activities:write",
      "inbox:read",
      "inbox:write",
      "automations:read",
      "automations:write",
      "integrations:read",
      "files:read",
      "files:write",
      "catalog:read",
      "forms:read",
      "forms:write",
    ],
  },
  { name: "Visualizador", capabilities: ["contacts:read", "companies:read", "deals:read", "activities:read", "inbox:read", "automations:read", "integrations:read", "files:read", "catalog:read", "forms:read"] },
];
