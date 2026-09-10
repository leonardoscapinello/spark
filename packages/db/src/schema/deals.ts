import { pgTable, pgPolicy, text, timestamp, uuid, bigint } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { pipelines } from "./pipelines.js";
import { stages } from "./stages.js";
import { contacts } from "./contacts.js";
import { APP_ROLE } from "../roles.js";

/**
 * Espelha DealSchema (packages/core/src/schema/deal.ts). `status` é text,
 * não enum do Postgres — o enum já existe uma vez, no Zod (DealStatusSchema);
 * duplicar como tipo de banco é duas fontes da mesma regra podendo divergir
 * (docs/adr/0019). `valor` é bigint: Money é sempre centavos inteiros, e um
 * negócio de verdade não pode estourar o teto de ~21 milhões de reais que
 * um integer permitiria.
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
    nome: text("nome").notNull(),
    valor: bigint("valor", { mode: "number" }).notNull(),
    status: text("status").notNull().default("aberto"),
    dataFechamentoEsperada: timestamp("data_fechamento_esperada", { withTimezone: true }),
    motivoPerda: text("motivo_perda"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
    excluidoEm: timestamp("excluido_em", { withTimezone: true }),
  },
  (t) => [
    pgPolicy("deals_isolamento_por_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
