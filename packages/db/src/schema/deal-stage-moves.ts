import { index, pgPolicy, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { pipelines } from "./pipelines.js";
import { stages } from "./stages.js";
import { deals } from "./deals.js";
import { APP_ROLE } from "../roles.js";

/**
 * Um registro por vez que um negócio sai de uma etapa — nunca por onde
 * entrou, e nunca reescrito depois (append-only, docs/adr/0035: fato de
 * negócio tipado, não jsonb). `fromStageId` nulo é a única linha de um
 * negócio ainda na etapa em que nasceu; ela nunca conta como "saída" — é
 * a base de `calculateStageProbability` (packages/core/rules/stageWorkflow):
 * a probabilidade de avançar não pode ser preenchida na mão, só calculada
 * a partir de quem realmente saiu de cada etapa, e para onde.
 */
export const dealStageMoves = pgTable(
  "deal_stage_moves",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    pipelineId: uuid("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    fromStageId: uuid("from_stage_id").references(() => stages.id, { onDelete: "cascade" }),
    toStageId: uuid("to_stage_id").notNull().references(() => stages.id, { onDelete: "cascade" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // A pergunta que a probabilidade faz sempre é "quem saiu desta etapa,
    // e quando" — o índice segue exatamente essa forma.
    index("deal_stage_moves_from_stage_idx").on(t.orgId, t.fromStageId, t.occurredAt),
    pgPolicy("deal_stage_moves_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
