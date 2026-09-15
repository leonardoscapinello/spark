import { sql } from "drizzle-orm";
import { boolean, check, index, pgPolicy, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { integrationConnections } from "./integrations.js";
import { organizations } from "./organizations.js";
import { users } from "./users.js";

export const calendarEvents = pgTable("calendar_events", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  connectionId: uuid("connection_id").notNull().references(() => integrationConnections.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull(),
  calendarName: text("calendar_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  allDay: boolean("all_day").notNull().default(false),
  availability: text("availability").notNull().default("busy"),
  location: text("location"),
  status: text("status").notNull().default("confirmed"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("calendar_events_connection_external_uidx").on(t.connectionId, t.externalId),
  index("calendar_events_owner_time_idx").on(t.orgId, t.ownerId, t.startsAt, t.endsAt),
  check("calendar_events_provider_check", sql`${t.provider} = ANY (ARRAY['google_calendar', 'outlook_calendar', 'apple_calendar'])`),
  check("calendar_events_availability_check", sql`${t.availability} = ANY (ARRAY['free', 'busy'])`),
  check("calendar_events_status_check", sql`${t.status} = ANY (ARRAY['confirmed', 'tentative', 'cancelled'])`),
  check("calendar_events_interval_check", sql`${t.endsAt} >= ${t.startsAt}`),
  pgPolicy("calendar_events_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();
