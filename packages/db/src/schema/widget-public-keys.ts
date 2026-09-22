import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
import { integrationConnections } from "./integrations.js";

/**
 * Roteamento público publicKey → org/conexão, igual `lead_form_public_keys` —
 * sem RLS de propósito: o embed no site do cliente não tem org_id pra
 * setar antes de saber quem é. O publicKey em si (gerado, não adivinhável)
 * é o único controle de acesso aqui.
 */
export const widgetPublicKeys = pgTable("widget_public_keys", {
  publicKey: text("public_key").primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  connectionId: uuid("connection_id").notNull().references(() => integrationConnections.id, { onDelete: "cascade" }),
});
