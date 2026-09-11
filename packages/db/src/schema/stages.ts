import { pgTable, pgPolicy, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
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
    probability: integer("probability").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    pgPolicy("stages_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
