import { pgTable, pgPolicy, text, timestamp, uuid, integer, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { users } from "./users.js";
import { companies } from "./companies.js";
import { APP_ROLE } from "../roles.js";

/** Mirrors ContactSchema (packages/core/src/schema/contact.ts). */
export const contacts = pgTable(
  "contacts",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    leadStatus: text("lead_status").notNull().default("new"),
    source: text("source"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    score: integer("score").notNull().default(0),
    customFields: jsonb("custom_fields").notNull().default({}),
    tags: jsonb("tags").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    pgPolicy("contacts_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
