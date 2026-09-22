import { sql } from "drizzle-orm";
import { index, integer, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { integrationConnections } from "./integrations.js";
import { organizations } from "./organizations.js";

/**
 * Catálogo de modelos aprovados pela Meta, por conexão (cada número de
 * WhatsApp tem o seu). Sincronizado sob demanda — não é nosso, é o que a
 * Cloud API já decidiu; a gente só espelha pra poder escolher na hora de
 * responder fora da janela de 24h.
 */
export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  connectionId: uuid("connection_id").notNull().references(() => integrationConnections.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  language: text("language").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull(),
  bodyText: text("body_text").notNull(),
  variableCount: integer("variable_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("whatsapp_templates_connection_name_language_uidx").on(table.connectionId, table.name, table.language),
  index("whatsapp_templates_org_connection_idx").on(table.orgId, table.connectionId),
  pgPolicy("whatsapp_templates_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();
