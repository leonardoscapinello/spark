import { sql } from "drizzle-orm";
import { boolean, check, index, integer, numeric, pgPolicy, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { users } from "./users.js";

/** Preferência de interface por pessoa (docs: packages/core/schema/userPreference). Uma linha por (org, usuário, chave). */
export const userPreferences = pgTable(
  "user_preferences",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    /* `valueKind` diz qual coluna vale, e separa lista vazia de objeto vazio.
     * O valor escalar fica na coluna do seu tipo (ADR-0035); lista e objeto
     * ficam em `user_preference_items`. */
    valueKind: text("value_kind").notNull().default("text"),
    valueText: text("value_text"),
    valueNumber: numeric("value_number", { precision: 20, scale: 6 }),
    valueBoolean: boolean("value_boolean"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("user_preferences_user_key").on(t.orgId, t.userId, t.key),
    check("user_preferences_typed_value_check", sql`
      (${t.valueKind} = 'text' AND ${t.valueText} IS NOT NULL AND ${t.valueNumber} IS NULL AND ${t.valueBoolean} IS NULL) OR
      (${t.valueKind} = 'number' AND ${t.valueText} IS NULL AND ${t.valueNumber} IS NOT NULL AND ${t.valueBoolean} IS NULL) OR
      (${t.valueKind} = 'boolean' AND ${t.valueText} IS NULL AND ${t.valueNumber} IS NULL AND ${t.valueBoolean} IS NOT NULL) OR
      (${t.valueKind} IN ('list', 'object') AND ${t.valueText} IS NULL AND ${t.valueNumber} IS NULL AND ${t.valueBoolean} IS NULL)`),
    pgPolicy("user_preferences_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();

/** Os itens de uma preferência que é lista (ordem em `sortOrder`) ou objeto (chave em `itemKey`). */
export const userPreferenceItems = pgTable(
  "user_preference_items",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    preferenceId: uuid("preference_id").notNull().references(() => userPreferences.id, { onDelete: "cascade" }),
    /* De quem é: a shape do Electric filtra por aqui, e preferência é dado pessoal. */
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    itemKey: text("item_key"),
    sortOrder: integer("sort_order").notNull().default(0),
    valueText: text("value_text"),
    valueNumber: numeric("value_number", { precision: 20, scale: 6 }),
    valueBoolean: boolean("value_boolean"),
  },
  (t) => [
    index("user_preference_items_preference_idx").on(t.orgId, t.preferenceId, t.sortOrder),
    index("user_preference_items_user_idx").on(t.orgId, t.userId, t.preferenceId, t.sortOrder),
    uniqueIndex("user_preference_items_object_key_uidx").on(t.preferenceId, t.itemKey).where(sql`${t.itemKey} IS NOT NULL`),
    uniqueIndex("user_preference_items_list_order_uidx").on(t.preferenceId, t.sortOrder).where(sql`${t.itemKey} IS NULL`),
    pgPolicy("user_preference_items_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
