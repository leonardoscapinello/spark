import { jsonb, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { users } from "./users.js";
import { APP_ROLE } from "../roles.js";

/** Append-only trail for high-impact actions (ADR-0013, ADR-0029). */
export const auditLogs = pgTable("audit_logs", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  actorUserId: uuid("actor_user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  data: jsonb("data").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  pgPolicy("audit_logs_isolation_by_org", {
    for: "select",
    to: APP_ROLE,
    using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
  }),
  pgPolicy("audit_logs_insert_by_org", {
    for: "insert",
    to: APP_ROLE,
    withCheck: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
  }),
]).enableRLS();
