import { sql } from "drizzle-orm";
import { bigint, boolean, date, index, integer, numeric, pgPolicy, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { customFieldDefinitions } from "./custom-fields.js";

/** Opções de um campo de seleção, como linhas (ADR-0035). */
export const customFieldOptions = pgTable(
  "custom_field_options",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    fieldId: uuid("field_id").notNull().references(() => customFieldDefinitions.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("custom_field_options_unique").on(t.fieldId, t.value),
    pgPolicy("custom_field_options_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` }),
  ],
).enableRLS();

/**
 * Valor de um campo personalizado, **uma coluna por tipo** — é isso que devolve
 * SELECT, índice e relatório. Seleção múltipla é uma linha por opção escolhida.
 */
export const customFieldValues = pgTable(
  "custom_field_values",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    fieldId: uuid("field_id").notNull().references(() => customFieldDefinitions.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    valueText: text("value_text"),
    valueNumber: numeric("value_number", { precision: 20, scale: 6 }),
    valueMoney: bigint("value_money", { mode: "number" }),
    valueDate: date("value_date"),
    valueTimestamp: timestamp("value_timestamp", { withTimezone: true }),
    valueBoolean: boolean("value_boolean"),
    optionId: uuid("option_id").references(() => customFieldOptions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("custom_field_values_unique").on(t.fieldId, t.entityId, t.optionId),
    uniqueIndex("custom_field_values_scalar_uidx").on(t.fieldId, t.entityId).where(sql`${t.optionId} IS NULL`),
    index("custom_field_values_money_idx").on(t.orgId, t.fieldId, t.valueMoney).where(sql`${t.valueMoney} IS NOT NULL`),
    index("custom_field_values_date_idx").on(t.orgId, t.fieldId, t.valueDate).where(sql`${t.valueDate} IS NOT NULL`),
    index("custom_field_values_timestamp_idx").on(t.orgId, t.fieldId, t.valueTimestamp).where(sql`${t.valueTimestamp} IS NOT NULL`),
    index("custom_field_values_boolean_idx").on(t.orgId, t.fieldId, t.valueBoolean).where(sql`${t.valueBoolean} IS NOT NULL`),
    pgPolicy("custom_field_values_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` }),
  ],
).enableRLS();
