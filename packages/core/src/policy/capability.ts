/**
 * Every capability is a `resource:action` pair (docs/adr/0029). The list
 * grows together with what actually exists — never ahead of a resource
 * that doesn't have a route yet (deals, automation, etc. join once they
 * ship an endpoint, not before).
 */
export const CAPABILITIES = [
  "contacts:read",
  "contacts:write",
  "companies:read",
  "companies:write",
  "users:manage",
  "permission_groups:manage",
  "audit_logs:read",
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
  "integrations:manage",
  "files:read",
  "files:write",
  "catalog:read",
  "catalog:write",
  "forms:read",
  "forms:write",
  "social:read",
  "social:write",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export function isCapability(value: string): value is Capability {
  return (CAPABILITIES as readonly string[]).includes(value);
}
