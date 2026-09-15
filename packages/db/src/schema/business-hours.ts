import { boolean, check, integer, pgPolicy, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { APP_ROLE } from "../roles.js";

export const businessHours = pgTable("business_hours", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  startTime: text("start_time").notNull(),
  breakStartTime: text("break_start_time"),
  breakEndTime: text("break_end_time"),
  endTime: text("end_time").notNull(),
  timeZone: text("time_zone").notNull().default("America/Sao_Paulo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("business_hours_org_weekday").on(t.orgId, t.weekday),
  check("business_hours_weekday_check", sql`${t.weekday} BETWEEN 0 AND 6`),
  check("business_hours_range_check", sql`${t.startTime} < ${t.endTime}`),
  pgPolicy("business_hours_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();
