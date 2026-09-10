import { pgTable, pgPolicy, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { APP_ROLE } from "../roles.js";

/** Espelha PermissionGroupSchema (packages/core/src/policy/permissionGroup.ts). */
export const permissionGroups = pgTable(
  "permission_groups",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    nome: text("nome").notNull(),
    /** array de Capacidade (packages/core/src/policy/capability.ts) —
     * jsonb pelo mesmo motivo de contacts.tags: lista simples, mesma
     * convenção do resto do schema. */
    capacidades: jsonb("capacidades").notNull().default([]),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    pgPolicy("permission_groups_isolamento_por_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
