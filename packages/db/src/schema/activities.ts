import { pgTable, pgPolicy, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { contacts } from "./contacts.js";
import { deals } from "./deals.js";
import { APP_ROLE } from "../roles.js";

/** Espelha ActivitySchema (packages/core/src/schema/activity.ts). */
export const activities = pgTable(
  "activities",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    contactId: uuid("contact_id").references(() => contacts.id),
    dealId: uuid("deal_id").references(() => deals.id),
    tipo: text("tipo").notNull(),
    titulo: text("titulo").notNull(),
    notas: text("notas"),
    dataHora: timestamp("data_hora", { withTimezone: true }).notNull(),
    concluida: boolean("concluida").notNull().default(false),
    concluidaEm: timestamp("concluida_em", { withTimezone: true }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    pgPolicy("activities_isolamento_por_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
