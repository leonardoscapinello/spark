import { boolean, index, jsonb, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";

export const integrationConnections = pgTable("integration_connections", {
  id: idColumn(), orgId: uuid("org_id").notNull().references(() => organizations.id),
  provider: text("provider").notNull(), name: text("name").notNull(), status: text("status").notNull().default("not_configured"),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  credentialsConfigured: boolean("credentials_configured").notNull().default(false), credentialHint: text("credential_hint"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }), lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("integration_connections_org_provider_idx").on(table.orgId, table.provider), pgPolicy("integration_connections_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();

/** Never published to Electric. The browser can only learn the masked hint above. */
export const integrationSecrets = pgTable("integration_secrets", {
  connectionId: uuid("connection_id").primaryKey().references(() => integrationConnections.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => organizations.id), ciphertext: text("ciphertext").notNull(), iv: text("iv").notNull(), authTag: text("auth_tag").notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [pgPolicy("integration_secrets_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();
