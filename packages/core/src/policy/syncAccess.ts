import type { Capability } from "./capability.js";

export const SYNC_RESOURCES = [
  "organizations",
  "service_categories",
  "service_statuses",
  "service_levels",
  "priority_matrix",
  "sla_policies",

  "organization_themes",
  "contacts",
  "score_snapshots",
  "contact_companies",
  "identities",
  "companies",
  "pipelines",
  "stages",
  "stage_field_rules",
  "stage_transitions",
  "business_hours",
  "holidays",
  "deals",
  "deal_followers",
  "deal_products",
  "deal_adjustments",
  "coupons",
  "installment_policies",
  "activities",
  "calendar_events",
  "notes",
  "events",
  "users",
  "service_cycles",
  "service_segments",
  "service_cycle_hours",
  "service_cycle_holidays",
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
  "lead_form_fields",
  "lead_form_field_options",
  "form_submissions",
  "form_submission_values",
  "social_channels",
  "social_posts",
  "audiences",
  "audience_lead_statuses",
  "audience_tags",
  "campaigns",
  "campaign_recipients",
  "tags",
  "contact_tags",
  "deal_tags",
  "company_tags",
  "product_tags",
  "custom_field_options",
  "custom_field_values",
  "custom_field_definitions",
  "custom_field_groups",
  "pages",
  "page_versions",
  "canned_replies",
  "teams",
  "saved_views",
  "user_preferences",
  "user_preference_items",
  "link_previews",
  "company_registrations",
  "company_registration_activities",
  "company_registration_members",
  "company_registration_tax_regimes",
  "whatsapp_templates",
] as const;
export type SyncResource = (typeof SYNC_RESOURCES)[number];

const READ_REQUIREMENTS: Record<
  Exclude<SyncResource, "organizations" | "organization_themes" | "events" | "users" | "user_preferences" | "user_preference_items" | "link_previews" | "company_registrations" | "company_registration_activities" | "company_registration_members" | "company_registration_tax_regimes">,
  readonly Capability[]
> = {
  service_categories: ["inbox:read", "settings:manage"],
  service_statuses: ["inbox:read", "settings:manage"],
  service_levels: ["inbox:read", "settings:manage"],
  priority_matrix: ["inbox:read", "settings:manage"],
  sla_policies: ["inbox:read", "settings:manage"],
  contacts: ["contacts:read"],
  score_snapshots: ["contacts:read"],
  contact_companies: ["contacts:read", "companies:read", "deals:read"],
  identities: ["contacts:read"],
  companies: ["companies:read"],
  pipelines: ["deals:read"],
  stages: ["deals:read"],
  stage_field_rules: ["deals:read"],
  stage_transitions: ["deals:read"],
  business_hours: ["deals:read", "activities:read", "inbox:read", "pipelines:manage"],
  holidays: ["deals:read", "activities:read", "inbox:read", "pipelines:manage"],
  deals: ["deals:read"],
  deal_followers: ["deals:read"],
  deal_products: ["deals:read"],
  deal_adjustments: ["deals:read"],
  // Códigos de cupom são do comercial e do checkout: quem vende aplica pelo
  // código (o servidor valida); a lista inteira é de quem configura o catálogo.
  coupons: ["catalog:read"],
  installment_policies: ["deals:read", "catalog:read"],
  activities: ["activities:read"],
  calendar_events: ["activities:read"],
  notes: ["contacts:read", "deals:read"],
  service_cycles: ["inbox:read"],
  service_segments: ["inbox:read"],
  service_cycle_hours: ["inbox:read"],
  service_cycle_holidays: ["inbox:read"],
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
  lead_form_fields: ["forms:read"],
  lead_form_field_options: ["forms:read"],
  form_submissions: ["forms:read"],
  form_submission_values: ["forms:read"],
  social_channels: ["social:read"],
  social_posts: ["social:read"],
  audiences: ["campaigns:read"],
  audience_lead_statuses: ["campaigns:read"],
  audience_tags: ["campaigns:read"],
  campaigns: ["campaigns:read"],
  campaign_recipients: ["campaigns:read"],
  tags: ["contacts:read", "companies:read", "catalog:read", "deals:read"],
  deal_tags: ["deals:read"],
  contact_tags: ["contacts:read"],
  company_tags: ["companies:read"],
  product_tags: ["catalog:read"],
  custom_field_options: ["contacts:read", "companies:read", "deals:read", "inbox:read", "activities:read", "users:manage", "campaigns:read", "settings:manage"],
  custom_field_values: ["contacts:read", "companies:read", "deals:read", "inbox:read", "activities:read", "users:manage", "campaigns:read"],
  custom_field_definitions: ["contacts:read", "companies:read", "deals:read", "inbox:read", "activities:read", "users:manage", "campaigns:read", "settings:manage"],
  custom_field_groups: ["contacts:read", "companies:read", "deals:read", "inbox:read", "activities:read", "users:manage", "campaigns:read", "settings:manage"],
  pages: ["pages:read"],
  page_versions: ["pages:read"],
  canned_replies: ["inbox:read"],
  teams: ["inbox:read", "users:manage"],
  saved_views: ["contacts:read"],
  whatsapp_templates: ["inbox:read"],
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
  if (resource === "organization_themes") return true;
  // Preferência é do próprio usuário — a shape já vem filtrada por user_id no servidor.
  if (resource === "user_preferences" || resource === "user_preference_items") return true;
  if (resource === "events") return readableEventPrefixes(capabilities).length > 0;
  if (resource === "users")
    return DIRECTORY_READERS.some((capability) => capabilities.includes(capability));
  if (resource === "link_previews")
    return DIRECTORY_READERS.some((capability) => capabilities.includes(capability));
  /* O cadastro da Receita é dado público sobre empresas: quem enxerga o
   * diretório da organização enxerga o registro que ela consultou. */
  if (resource === "company_registrations" || resource === "company_registration_activities"
    || resource === "company_registration_members" || resource === "company_registration_tax_regimes")
    return DIRECTORY_READERS.some((capability) => capabilities.includes(capability));
  return READ_REQUIREMENTS[resource].some((capability) => capabilities.includes(capability));
}

/** Limits the shared event table to domains this user can actually read. */
export function readableEventPrefixes(capabilities: readonly Capability[]): string[] {
  const prefixes: string[] = [];
  if (capabilities.includes("contacts:read")) prefixes.push("contact", "identity", "note");
  if (capabilities.includes("companies:read")) prefixes.push("company");
  if (capabilities.includes("deals:read")) prefixes.push("deal", "note");
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
  return [...new Set(prefixes)];
}
