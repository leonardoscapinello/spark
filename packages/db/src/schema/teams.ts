import { pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { APP_ROLE } from "../roles.js";

export const teams = pgTable("teams", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("teams_org_name_unique").on(table.orgId, sql`lower(${table.name})`),
  pgPolicy("teams_isolation_by_org", {
    for: "all",
    to: APP_ROLE,
    using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid`,
  }),
]).enableRLS();
