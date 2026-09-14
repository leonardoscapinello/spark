import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { pipelines } from "./pipelines.js";
import { stages } from "./stages.js";

/**
 * «Neste funil, nesta etapa, este campo é obrigatório/importante»
 * (packages/core/rules/stageFieldRules). A chave única garante uma regra por
 * campo em cada etapa — o mesmo campo pode ter nível diferente em outra etapa.
 */
export const stageFieldRules = pgTable(
  "stage_field_rules",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    pipelineId: uuid("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
    stageId: uuid("stage_id").notNull().references(() => stages.id, { onDelete: "cascade" }),
    fieldKey: text("field_key").notNull(),
    level: text("level").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("stage_field_rules_stage_field").on(t.orgId, t.stageId, t.fieldKey),
    pgPolicy("stage_field_rules_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
