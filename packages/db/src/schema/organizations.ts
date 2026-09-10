import { pgTable, pgPolicy, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { APP_ROLE } from "../roles.js";

/**
 * Espelha OrganizationSchema (packages/core/src/schema/organization.ts).
 * Organização é o próprio tenant — não tem orgId, a política de RLS compara
 * com o próprio `id` (docs/adr/0022-um-so-banco-postgres.md).
 */
export const organizations = pgTable(
  "organizations",
  {
    id: idColumn(),
    nome: text("nome").notNull(),
    slug: text("slug").notNull().unique(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
    arquivadoEm: timestamp("arquivado_em", { withTimezone: true }),
  },
  (t) => [
    pgPolicy("organizations_isolamento", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.id} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
