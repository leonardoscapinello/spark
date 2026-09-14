import { sql } from "drizzle-orm";
import { index, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { SavedViewEntity } from "@spark/core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { users } from "./users.js";

export const savedViews = pgTable("saved_views", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  entityType: text("entity_type").$type<SavedViewEntity>().notNull(),
  name: text("name").notNull(),
  // Opaque wire format from core/filter's filterUrl.ts — the table doesn't
  // parse it, the same way `automations.graph` doesn't parse automation nodes.
  filters: text("filters").notNull().default(""),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
}, (table) => [
  index("saved_views_org_entity_idx").on(table.orgId, table.entityType),
  pgPolicy("saved_views_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();
