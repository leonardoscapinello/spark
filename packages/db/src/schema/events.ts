import { pgTable, pgPolicy, primaryKey, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { organizations } from "./organizations.js";
import { contacts } from "./contacts.js";
import { APP_ROLE } from "../roles.js";

/**
 * Espelha EventSchema (packages/core/src/schema/event.ts). Append-only —
 * a timeline do contato e o catálogo de gatilho de automação
 * (docs/adr/0027) nascem daqui.
 *
 * Particionada por mês em runtime (docs/adr/0021) — a declaração abaixo é
 * só para o TypeScript enxergar as colunas. O `CREATE TABLE ... PARTITION
 * BY RANGE` real está na migration 0000, editada à mão depois do
 * `drizzle-kit generate` (ver packages/db/migrations/0000_*.sql). Nenhuma
 * migration futura deve gerar `ALTER TABLE events` sem checar isso primeiro.
 */
export const events = pgTable(
  "events",
  {
    id: uuid("id").notNull().$defaultFn(() => uuidv7()),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    contactId: uuid("contact_id").references(() => contacts.id),
    tipo: text("tipo").notNull(),
    dados: jsonb("dados").notNull().default({}),
    ocorridoEm: timestamp("ocorrido_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Postgres exige que a coluna de partição (ocorrido_em) esteja em toda
    // PK/unique de uma tabela particionada — por isso a chave é composta,
    // não só `id`. Ver a migration 0000 editada à mão.
    primaryKey({ columns: [t.id, t.ocorridoEm] }),
    pgPolicy("events_isolamento_por_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
