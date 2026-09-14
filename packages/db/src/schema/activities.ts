import { check, pgTable, pgPolicy, text, timestamp, uuid, boolean, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { users } from "./users.js";
import { contacts } from "./contacts.js";
import { deals } from "./deals.js";
import { APP_ROLE } from "../roles.js";

/** Mirrors ActivitySchema (packages/core/src/schema/activity.ts). */
export const activities = pgTable(
  "activities",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    contactId: uuid("contact_id").references(() => contacts.id),
    dealId: uuid("deal_id").references(() => deals.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    notes: text("notes"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    location: text("location"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("activities_target_check", sql`num_nonnulls(${t.contactId}, ${t.dealId}) >= 1`),
    check("activities_type_check", sql`${t.type} = ANY (ARRAY['task', 'call', 'meeting', 'email', 'lunch', 'deadline'])`),
    check("activities_duration_check", sql`${t.durationMinutes} BETWEEN 0 AND 1440`),
    check("activities_completion_check", sql`${t.completed} = (${t.completedAt} IS NOT NULL)`),
    pgPolicy("activities_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
