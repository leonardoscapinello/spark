import { pgPolicy, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { pipelines } from "./pipelines.js";
import { stages } from "./stages.js";
import { APP_ROLE } from "../roles.js";

export const stageTransitions = pgTable("stage_transitions", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  pipelineId: uuid("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
  fromStageId: uuid("from_stage_id").notNull().references(() => stages.id, { onDelete: "cascade" }),
  toStageId: uuid("to_stage_id").notNull().references(() => stages.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("stage_transitions_from_to").on(t.orgId, t.fromStageId, t.toStageId),
  pgPolicy("stage_transitions_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();
