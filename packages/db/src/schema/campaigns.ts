import { sql } from "drizzle-orm";
import { index, integer, pgPolicy, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { CampaignRecipientStatus, CampaignStatus } from "@spark/core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { contacts } from "./contacts.js";
import { organizations } from "./organizations.js";
import { users } from "./users.js";
import { tags } from "./tags.js";

export const audiences = pgTable("audiences", {
  id: idColumn(), orgId: uuid("org_id").notNull().references(() => organizations.id), name: text("name").notNull(),
  description: text("description"), operator: text("operator").notNull().default("all"), minimumScore: integer("minimum_score"),
  createdBy: uuid("created_by").notNull().references(() => users.id), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("audiences_org_name_idx").on(t.orgId, t.name), pgPolicy("audiences_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();

export const campaigns = pgTable("campaigns", {
  id: idColumn(), orgId: uuid("org_id").notNull().references(() => organizations.id), audienceId: uuid("audience_id").notNull().references(() => audiences.id),
  name: text("name").notNull(), subject: text("subject").notNull(), body: text("body").notNull(), status: text("status").$type<CampaignStatus>().notNull().default("draft"),
  recipientCount: integer("recipient_count").notNull().default(0), sentCount: integer("sent_count").notNull().default(0), failedCount: integer("failed_count").notNull().default(0), suppressedCount: integer("suppressed_count").notNull().default(0),
  createdBy: uuid("created_by").notNull().references(() => users.id), sentAt: timestamp("sent_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("campaigns_org_status_idx").on(t.orgId, t.status), pgPolicy("campaigns_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();

export const campaignRecipients = pgTable("campaign_recipients", {
  id: idColumn(), orgId: uuid("org_id").notNull().references(() => organizations.id), campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").notNull().references(() => contacts.id), email: text("email").notNull(), status: text("status").$type<CampaignRecipientStatus>().notNull().default("pending"),
  providerMessageId: text("provider_message_id"), error: text("error"), sentAt: timestamp("sent_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("campaign_recipients_campaign_contact_uidx").on(t.campaignId, t.contactId), index("campaign_recipients_org_status_idx").on(t.orgId, t.status), pgPolicy("campaign_recipients_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();

export const emailSuppressions = pgTable("email_suppressions", {
  id: idColumn(), orgId: uuid("org_id").notNull().references(() => organizations.id), email: text("email").notNull(), reason: text("reason").notNull(), source: text("source").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("email_suppressions_org_email_uidx").on(t.orgId, t.email), pgPolicy("email_suppressions_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();

/* As duas listas do público, como linhas (ADR-0035). A marcação aponta para o
 * catálogo, então «quais públicos usam esta marcação?» é uma junção. */
export const audienceLeadStatuses = pgTable("audience_lead_statuses", {
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  audienceId: uuid("audience_id").notNull().references(() => audiences.id, { onDelete: "cascade" }),
  leadStatus: text("lead_status").notNull(),
}, (t) => [primaryKey({ columns: [t.audienceId, t.leadStatus] }), index("audience_lead_statuses_org_idx").on(t.orgId, t.leadStatus), pgPolicy("audience_lead_statuses_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();

export const audienceTags = pgTable("audience_tags", {
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  audienceId: uuid("audience_id").notNull().references(() => audiences.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.audienceId, t.tagId] }), index("audience_tags_org_idx").on(t.orgId, t.tagId), pgPolicy("audience_tags_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();
