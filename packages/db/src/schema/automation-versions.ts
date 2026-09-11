import { index, integer, jsonb, pgPolicy, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AutomationGraph } from "@spark/core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { automations } from "./automations.js";
import { organizations } from "./organizations.js";
import { users } from "./users.js";

export const automationVersions = pgTable("automation_versions", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  automationId: uuid("automation_id").notNull().references(() => automations.id, { onDelete: "restrict" }),
  version: integer("version").notNull(),
  graph: jsonb("graph").$type<AutomationGraph>().notNull(),
  publishedBy: uuid("published_by").notNull().references(() => users.id),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("automation_versions_number_unique").on(table.automationId, table.version),
  index("automation_versions_org_automation_idx").on(table.orgId, table.automationId, table.publishedAt),
  pgPolicy("automation_versions_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();
