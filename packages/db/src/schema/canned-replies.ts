import { sql } from "drizzle-orm";
import { index, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { teams } from "./teams.js";
import { users } from "./users.js";

export const cannedReplies = pgTable("canned_replies", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  shortcut: text("shortcut").notNull(),
  body: text("body").notNull(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("canned_replies_org_shortcut_uidx").on(table.orgId, sql`lower(${table.shortcut})`),
  index("canned_replies_org_team_idx").on(table.orgId, table.teamId),
  pgPolicy("canned_replies_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();
