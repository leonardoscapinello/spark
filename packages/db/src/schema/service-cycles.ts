import { sql } from "drizzle-orm";
import { boolean, bigint, index, integer, pgPolicy, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { conversations } from "./conversations.js";
export const serviceCycles = pgTable("service_cycles", {
  id: idColumn(), orgId: uuid("org_id").notNull().references(() => organizations.id), conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
  policyId: uuid("policy_id"), policyName: text("policy_name"), policyVersion: integer("policy_version"),
  firstResponseMinutes: integer("first_response_minutes"), totalMinutes: integer("total_minutes"), warningPercent: integer("warning_percent").notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull(), closedAt: timestamp("closed_at", { withTimezone: true }), firstInboundAt: timestamp("first_inbound_at", { withTimezone: true }), firstRespondedAt: timestamp("first_responded_at", { withTimezone: true }),
}, t => [index("service_cycles_org_conversation").on(t.orgId,t.conversationId), unique("service_cycles_org_id").on(t.orgId,t.id), pgPolicy("service_cycles_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id',true)::uuid` })]).enableRLS();
export const serviceSegments = pgTable("service_segments", {
  id: idColumn(), orgId: uuid("org_id").notNull().references(() => organizations.id), conversationId: uuid("conversation_id").notNull().references(() => conversations.id), cycleId: uuid("cycle_id").notNull().references(() => serviceCycles.id),
  statusId: uuid("status_id"), statusName: text("status_name").notNull(), startedAt: timestamp("started_at", { withTimezone: true }).notNull(), endedAt: timestamp("ended_at", { withTimezone: true }),
  firstCounting: boolean("first_counting").notNull(), totalCounting: boolean("total_counting").notNull(), budgetMinutes: integer("budget_minutes"), elapsedMs: bigint("elapsed_ms", { mode: "number" }).notNull().default(0),
}, t => [index("service_segments_org_cycle").on(t.orgId,t.cycleId), pgPolicy("service_segments_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id',true)::uuid` })]).enableRLS();
