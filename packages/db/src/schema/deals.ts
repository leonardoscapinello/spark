import { pgTable, pgPolicy, text, timestamp, uuid, bigint } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { pipelines } from "./pipelines.js";
import { stages } from "./stages.js";
import { contacts } from "./contacts.js";
import { users } from "./users.js";
import { companies } from "./companies.js";
import { APP_ROLE } from "../roles.js";

/**
 * Mirrors DealSchema (packages/core/src/schema/deal.ts). `status` is
 * text, not a Postgres enum — the enum already exists once, in Zod
 * (DealStatusSchema); duplicating it as a database type is two sources of
 * the same rule that could drift apart (docs/adr/0019). `amount` is
 * bigint: Money is always integer cents, and a real deal can't hit the
 * ceiling an integer column would allow (~21 million reais).
 */
export const deals = pgTable(
  "deals",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => pipelines.id),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => stages.id),
    contactId: uuid("contact_id").references(() => contacts.id),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    status: text("status").notNull().default("open"),
    expectedCloseDate: timestamp("expected_close_date", { withTimezone: true }),
    lossReason: text("loss_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    pgPolicy("deals_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
