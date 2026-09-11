import { CAPABILITIES, type Capability } from "./capability.js";

/**
 * The single permission check in the whole system (docs/adr/0029). Deny by
 * default: a user with no group, or whose groups don't list the
 * capability, is denied — never an implicit allow.
 */
export function hasCapability(
  groups: readonly { capabilities: readonly Capability[] }[],
  capability: Capability,
): boolean {
  return groups.some((group) => group.capabilities.includes(capability));
}

export function effectiveCapabilities(
  groups: readonly { capabilities: readonly Capability[] }[],
): Capability[] {
  return CAPABILITIES.filter((capability) => hasCapability(groups, capability));
}
