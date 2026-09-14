import { sql } from "drizzle-orm";
import { boolean, index, numeric, pgPolicy, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { integrationConnections } from "./integrations.js";

/**
 * A configuração de uma conexão, uma chave por linha e cada tipo na sua coluna
 * (ADR-0035). Segredo continua em `integration_secrets`, cifrado — aqui só
 * mora o que é configuração visível: identificador de conta, servidor, porta.
 */
export const integrationConnectionSettings = pgTable(
  "integration_connection_settings",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    connectionId: uuid("connection_id").notNull().references(() => integrationConnections.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    valueText: text("value_text"),
    valueNumber: numeric("value_number", { precision: 20, scale: 6 }),
    valueBoolean: boolean("value_boolean"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("integration_connection_settings_unique").on(t.connectionId, t.key),
    index("integration_connection_settings_connection_idx").on(t.orgId, t.connectionId),
    pgPolicy("integration_connection_settings_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
