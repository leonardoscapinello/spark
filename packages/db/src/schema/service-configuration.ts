import { sql } from "drizzle-orm";
import { boolean, index, integer, pgPolicy, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
export const serviceCategories = pgTable("service_categories", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  archived: boolean("archived").notNull(),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("service_categories_org_idx").on(t.orgId), unique("service_categories_org_id_unique").on(t.orgId, t.id), pgPolicy("service_categories_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();
export const serviceStatuses = pgTable("service_statuses", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  archived: boolean("archived").notNull(),
  color: text("color").notNull(),
  operationalType: text("operational_type").notNull(),
  pauseFirstResponse: boolean("pause_first_response").notNull(),
  pauseTotal: boolean("pause_total").notNull(),
  resumeOnInbound: boolean("resume_on_inbound").notNull(),
  budgetMinutes: integer("budget_minutes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("service_statuses_org_idx").on(t.orgId), unique("service_statuses_org_id_unique").on(t.orgId, t.id), pgPolicy("service_statuses_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();
export const serviceLevels = pgTable("service_levels", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  archived: boolean("archived").notNull(),
  kind: text("kind").notNull(),
  color: text("color").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("service_levels_org_idx").on(t.orgId), unique("service_levels_org_id_unique").on(t.orgId, t.id), pgPolicy("service_levels_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();
export const priorityMatrix = pgTable("priority_matrix", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  impactId: uuid("impact_id").notNull(),
  urgencyId: uuid("urgency_id").notNull(),
  priorityId: uuid("priority_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("priority_matrix_org_idx").on(t.orgId), unique("priority_matrix_org_id_unique").on(t.orgId, t.id), pgPolicy("priority_matrix_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();
export const slaPolicies = pgTable("sla_policies", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  archived: boolean("archived").notNull(),
  categoryId: uuid("category_id"),
  priorityId: uuid("priority_id"),
  firstResponseMinutes: integer("first_response_minutes").notNull(),
  totalMinutes: integer("total_minutes").notNull(),
  warningPercent: integer("warning_percent").notNull(),
  version: integer("version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("sla_policies_org_idx").on(t.orgId), unique("sla_policies_org_id_unique").on(t.orgId, t.id), pgPolicy("sla_policies_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();
