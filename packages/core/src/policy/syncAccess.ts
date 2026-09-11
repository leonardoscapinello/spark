import type { Capability } from "./capability.js";

export const SYNC_RESOURCES = [
  "organizations",
  "contacts",
  "identities",
  "companies",
  "pipelines",
  "stages",
  "deals",
  "activities",
  "events",
  "users",
  "conversations",
  "messages",
  "automations",
  "automation_versions",
] as const;
export type SyncResource = (typeof SYNC_RESOURCES)[number];

const READ_REQUIREMENTS: Record<Exclude<SyncResource, "organizations" | "events" | "users">, readonly Capability[]> = {
  contacts: ["contacts:read"],
  identities: ["contacts:read"],
  companies: ["companies:read"],
  pipelines: ["deals:read"],
  stages: ["deals:read"],
  deals: ["deals:read"],
  activities: ["activities:read"],
  conversations: ["inbox:read"],
  messages: ["inbox:read"],
  automations: ["automations:read"],
  automation_versions: ["automations:read"],
};

const DIRECTORY_READERS: readonly Capability[] = [
  "contacts:read", "companies:read", "deals:read", "activities:read", "inbox:read", "users:manage",
];

export function canReadSyncResource(capabilities: readonly Capability[], resource: SyncResource): boolean {
  if (resource === "organizations") return true;
  if (resource === "events") return readableEventPrefixes(capabilities).length > 0;
  if (resource === "users") return DIRECTORY_READERS.some((capability) => capabilities.includes(capability));
  return READ_REQUIREMENTS[resource].some((capability) => capabilities.includes(capability));
}

/** Limits the shared event table to domains this user can actually read. */
export function readableEventPrefixes(capabilities: readonly Capability[]): string[] {
  const prefixes: string[] = [];
  if (capabilities.includes("contacts:read")) prefixes.push("contact", "identity");
  if (capabilities.includes("companies:read")) prefixes.push("company");
  if (capabilities.includes("deals:read")) prefixes.push("deal");
  if (capabilities.includes("activities:read")) prefixes.push("activity");
  if (capabilities.includes("inbox:read")) prefixes.push("conversation", "message");
  if (capabilities.includes("automations:read")) prefixes.push("automation");
  return prefixes;
}
