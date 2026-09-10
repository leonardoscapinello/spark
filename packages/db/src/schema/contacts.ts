import { pgTable, pgPolicy, text, timestamp, uuid, integer, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { APP_ROLE } from "../roles.js";

/** Espelha ContactSchema (packages/core/src/schema/contact.ts). */
export const contacts = pgTable(
  "contacts",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    nome: text("nome").notNull(),
    email: text("email"),
    telefone: text("telefone"),
    score: integer("score").notNull().default(0),
    customFields: jsonb("custom_fields").notNull().default({}),
    tags: jsonb("tags").notNull().default([]),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
    excluidoEm: timestamp("excluido_em", { withTimezone: true }),
  },
  (t) => [
    pgPolicy("contacts_isolamento_por_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
