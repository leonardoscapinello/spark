import { boolean, check, pgTable, pgPolicy, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { pipelines } from "./pipelines.js";
import { APP_ROLE } from "../roles.js";

/** Mirrors StageSchema (packages/core/src/schema/stage.ts). */
export const stages = pgTable(
  "stages",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => pipelines.id),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull(),
    probability: integer("probability").notNull().default(100),
    slaMinutes: integer("sla_minutes"),
    allowWon: boolean("allow_won").notNull().default(true),
    allowLost: boolean("allow_lost").notNull().default(true),
    restrictTransitions: boolean("restrict_transitions").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    check("stages_sort_order_check", sql`${t.sortOrder} >= 0`),
    check("stages_probability_check", sql`${t.probability} BETWEEN 0 AND 100`),
    check("stages_sla_minutes_check", sql`${t.slaMinutes} IS NULL OR ${t.slaMinutes} > 0`),
    pgPolicy("stages_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
