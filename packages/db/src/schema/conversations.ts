import { index, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { contacts } from "./contacts.js";
import { organizations } from "./organizations.js";
import { teams } from "./teams.js";
import { users } from "./users.js";

export const conversations = pgTable("conversations", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  contactId: uuid("contact_id").notNull().references(() => contacts.id),
  channel: text("channel").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("normal"),
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
  firstResponseDueAt: timestamp("first_response_due_at", { withTimezone: true }).notNull(),
  firstRespondedAt: timestamp("first_responded_at", { withTimezone: true }),
  /** Carimbada só na transição pra "closed" — reabrir limpa de novo. Base do tempo de resolução (roadmap Fase 2). */
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("conversations_org_status_activity_idx").on(table.orgId, table.status, table.lastMessageAt),
  index("conversations_org_assignee_status_idx").on(table.orgId, table.assigneeId, table.status),
  pgPolicy("conversations_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();
