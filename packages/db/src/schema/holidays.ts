import { boolean, check, date, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { APP_ROLE } from "../roles.js";

export const holidays = pgTable("holidays", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("closed"),
  startTime: text("start_time"),
  breakStartTime: text("break_start_time"),
  breakEndTime: text("break_end_time"),
  endTime: text("end_time"),
  repeatsAnnually: boolean("repeats_annually").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("holidays_date_range_check", sql`${t.endDate} >= ${t.startDate}`),
  check("holidays_kind_check", sql`${t.kind} = ANY (ARRAY['closed', 'reduced'])`),
  pgPolicy("holidays_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();
