import { pgTable, pgPolicy, primaryKey, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { organizations } from "./organizations.js";
import { contacts } from "./contacts.js";
import { deals } from "./deals.js";
import { companies } from "./companies.js";
import { APP_ROLE } from "../roles.js";

/**
 * Mirrors EventSchema (packages/core/src/schema/event.ts). Append-only —
 * the contact's timeline and the automation trigger catalog
 * (docs/adr/0027) are both born here.
 *
 * Partitioned by month at runtime (docs/adr/0021) — the declaration below
 * is only so TypeScript can see the columns. The real
 * `CREATE TABLE ... PARTITION BY RANGE` lives in migration 0000, hand-edited
 * after `drizzle-kit generate` (see packages/db/migrations/0000_*.sql). No
 * future migration should generate `ALTER TABLE events` without checking that first.
 */
export const events = pgTable(
  "events",
  {
    id: uuid("id").notNull().$defaultFn(() => uuidv7()),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    data: jsonb("data").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Postgres requires the partition column (occurred_at) to be part of
    // every PK/unique on a partitioned table — that's why the key is
    // composite, not just `id`. See the hand-edited migration 0000.
    primaryKey({ columns: [t.id, t.occurredAt] }),
    pgPolicy("events_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
