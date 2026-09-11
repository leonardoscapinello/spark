import { index, integer, jsonb, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AutomationGraph } from "@spark/core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";

export const automations = pgTable("automations", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"),
  draftGraph: jsonb("draft_graph").$type<AutomationGraph>().notNull().default({ nodes: [], edges: [] }),
  currentPublishedVersionId: uuid("current_published_version_id"),
  publishedVersion: integer("published_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("automations_org_updated_idx").on(table.orgId, table.updatedAt),
  pgPolicy("automations_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();
