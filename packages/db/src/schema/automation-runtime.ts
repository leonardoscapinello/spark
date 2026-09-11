import { boolean, index, integer, jsonb, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { automations } from "./automations.js";
import { automationVersions } from "./automation-versions.js";
import { contacts } from "./contacts.js";
import { organizations } from "./organizations.js";

export const automationRuns = pgTable("automation_runs", {
  id: idColumn(), orgId: uuid("org_id").notNull().references(() => organizations.id),
  automationId: uuid("automation_id").notNull().references(() => automations.id),
  versionId: uuid("version_id").notNull().references(() => automationVersions.id),
  contactId: uuid("contact_id").notNull().references(() => contacts.id),
  status: text("status").notNull().default("queued"), currentNodeId: text("current_node_id"),
  context: jsonb("context").$type<Record<string, unknown>>().notNull().default({}), error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("automation_runs_org_automation_started_idx").on(table.orgId, table.automationId, table.startedAt), index("automation_runs_org_contact_idx").on(table.orgId, table.contactId), pgPolicy("automation_runs_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();

export const automationRunSteps = pgTable("automation_run_steps", {
  id: idColumn(), orgId: uuid("org_id").notNull().references(() => organizations.id),
  runId: uuid("run_id").notNull().references(() => automationRuns.id, { onDelete: "cascade" }),
  nodeId: text("node_id").notNull(), attempt: integer("attempt").notNull().default(1), status: text("status").notNull(),
  result: jsonb("result").$type<Record<string, unknown>>().notNull().default({}),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(), finishedAt: timestamp("finished_at", { withTimezone: true }),
}, (table) => [uniqueIndex("automation_run_steps_idempotency_idx").on(table.runId, table.nodeId, table.attempt), index("automation_run_steps_org_run_idx").on(table.orgId, table.runId, table.startedAt), pgPolicy("automation_run_steps_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();

export const automationTimers = pgTable("automation_timers", {
  id: idColumn(), orgId: uuid("org_id").notNull().references(() => organizations.id),
  runId: uuid("run_id").notNull().references(() => automationRuns.id, { onDelete: "cascade" }), nodeId: text("node_id").notNull(),
  fireAt: timestamp("fire_at", { withTimezone: true }).notNull(), claimedAt: timestamp("claimed_at", { withTimezone: true }), completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [index("automation_timers_due_idx").on(table.fireAt), pgPolicy("automation_timers_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();

export const automationJobs = pgTable("automation_jobs", {
  id: idColumn(), orgId: uuid("org_id").notNull().references(() => organizations.id),
  runId: uuid("run_id").notNull().references(() => automationRuns.id, { onDelete: "cascade" }),
  nodeId: text("node_id").notNull(), availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
  resume: boolean("resume").notNull().default(false),
  claimedAt: timestamp("claimed_at", { withTimezone: true }), completedAt: timestamp("completed_at", { withTimezone: true }), attempts: integer("attempts").notNull().default(0),
}, (table) => [index("automation_jobs_available_idx").on(table.availableAt), pgPolicy("automation_jobs_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();
