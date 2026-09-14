import type { Capability } from "./capability.js";

export const SYNC_RESOURCES = [
  "organizations",
  "contacts",
  "identities",
  "companies",
  "pipelines",
  "stages",
  "stage_field_rules",
  "deals",
  "deal_products",
  "activities",
  "notes",
  "events",
  "users",
  "conversations",
  "messages",
  "automations",
  "automation_versions",
  "automation_runs",
  "automation_run_steps",
  "integration_connections",
  "files",
  "products",
  "product_variants",
  "discount_rules",
  "lead_forms",
  "form_submissions",
  "social_channels",
  "social_posts",
  "audiences",
  "campaigns",
  "campaign_recipients",
  "custom_field_definitions",
  "pages",
  "page_versions",
  "canned_replies",
  "teams",
  "saved_views",
  "user_preferences",
] as const;
export type SyncResource = (typeof SYNC_RESOURCES)[number];

const READ_REQUIREMENTS: Record<
  Exclude<SyncResource, "organizations" | "events" | "users" | "user_preferences">,
  readonly Capability[]
> = {
  contacts: ["contacts:read"],
  identities: ["contacts:read"],
  companies: ["companies:read"],
  pipelines: ["deals:read"],
  stages: ["deals:read"],
  stage_field_rules: ["deals:read"],
  deals: ["deals:read"],
  deal_products: ["deals:read"],
  activities: ["activities:read"],
  notes: ["contacts:read", "deals:read"],
  conversations: ["inbox:read"],
  messages: ["inbox:read"],
  automations: ["automations:read"],
  automation_versions: ["automations:read"],
  automation_runs: ["automations:read"],
  automation_run_steps: ["automations:read"],
  integration_connections: ["integrations:read"],
  files: ["files:read"],
  products: ["catalog:read"],
  product_variants: ["catalog:read"],
  discount_rules: ["catalog:read"],
  lead_forms: ["forms:read"],
  form_submissions: ["forms:read"],
  social_channels: ["social:read"],
  social_posts: ["social:read"],
  audiences: ["campaigns:read"],
  campaigns: ["campaigns:read"],
  campaign_recipients: ["campaigns:read"],
  custom_field_definitions: ["contacts:read", "companies:read", "deals:read"],
  pages: ["pages:read"],
  page_versions: ["pages:read"],
  canned_replies: ["inbox:read"],
  teams: ["inbox:read", "users:manage"],
  saved_views: ["contacts:read"],
};

const DIRECTORY_READERS: readonly Capability[] = [
  "contacts:read",
  "companies:read",
  "deals:read",
  "activities:read",
  "inbox:read",
  "integrations:read",
  "files:read",
  "catalog:read",
  "forms:read",
  "social:read",
  "campaigns:read",
  "settings:manage",
  "pages:read",
  "users:manage",
];

export function canReadSyncResource(
  capabilities: readonly Capability[],
  resource: SyncResource,
): boolean {
  if (resource === "organizations") return true;
  // Preferência é do próprio usuário — a shape já vem filtrada por user_id no servidor.
  if (resource === "user_preferences") return true;
  if (resource === "events") return readableEventPrefixes(capabilities).length > 0;
  if (resource === "users")
    return DIRECTORY_READERS.some((capability) => capabilities.includes(capability));
  return READ_REQUIREMENTS[resource].some((capability) => capabilities.includes(capability));
}

/** Limits the shared event table to domains this user can actually read. */
export function readableEventPrefixes(capabilities: readonly Capability[]): string[] {
  const prefixes: string[] = [];
  if (capabilities.includes("contacts:read")) prefixes.push("contact", "identity");
  if (capabilities.includes("companies:read")) prefixes.push("company");
  if (capabilities.includes("deals:read")) prefixes.push("deal");
  if (capabilities.includes("activities:read")) prefixes.push("activity");
  if (capabilities.includes("inbox:read")) prefixes.push("conversation", "message", "canned_reply");
  if (capabilities.includes("automations:read")) prefixes.push("automation");
  if (capabilities.includes("integrations:read")) prefixes.push("integration");
  if (capabilities.includes("files:read")) prefixes.push("file");
  if (capabilities.includes("catalog:read")) prefixes.push("product", "discount_rule");
  if (capabilities.includes("forms:read")) prefixes.push("form");
  if (capabilities.includes("social:read")) prefixes.push("social");
  if (capabilities.includes("campaigns:read")) prefixes.push("campaign", "audience");
  if (capabilities.includes("settings:manage")) prefixes.push("custom_field");
  if (capabilities.includes("pages:read")) prefixes.push("page");
  return prefixes;
}
