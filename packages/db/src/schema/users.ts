import { pgTable, pgPolicy, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { APP_ROLE } from "../roles.js";

/** Espelha UserSchema (packages/core/src/schema/user.ts). */
export const users = pgTable(
  "users",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    /** sub do JWT da Supabase Auth — liga este usuário local à identidade
     * autenticada (docs/adr/0005, apps/api/src/auth). */
    supabaseUserId: uuid("supabase_user_id").notNull().unique(),
    nome: text("nome").notNull(),
    email: text("email").notNull(),
    avatarUrl: text("avatar_url"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
    desativadoEm: timestamp("desativado_em", { withTimezone: true }),
  },
  (t) => [
    pgPolicy("users_isolamento_por_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
