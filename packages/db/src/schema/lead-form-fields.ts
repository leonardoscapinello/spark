import { sql } from "drizzle-orm";
import { boolean, date, index, integer, numeric, pgPolicy, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { leadForms, formSubmissions } from "./lead-forms.js";

/**
 * O desenho de um formulário deixa de ser um array jsonb e passa a ser linha
 * (ADR-0035). É o que permite perguntar «quais formulários pedem telefone?» e
 * o que faz o banco recusar um campo sem rótulo.
 */
export const leadFormFields = pgTable(
  "lead_form_fields",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    formId: uuid("form_id").notNull().references(() => leadForms.id, { onDelete: "cascade" }),
    /** Chave usada na resposta; estável mesmo quando o rótulo muda. */
    key: text("key").notNull(),
    label: text("label").notNull(),
    type: text("type").notNull(),
    /** Para qual coluna do lead o valor vai: nome, e-mail, telefone, empresa — ou nenhuma. */
    mapping: text("mapping").notNull().default("none"),
    required: boolean("required").notNull().default(false),
    placeholder: text("placeholder"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("lead_form_fields_unique").on(t.formId, t.key),
    index("lead_form_fields_form_idx").on(t.orgId, t.formId, t.sortOrder),
    pgPolicy("lead_form_fields_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();

/** Opções de um campo de escolha, na ordem em que aparecem. */
export const leadFormFieldOptions = pgTable(
  "lead_form_field_options",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    fieldId: uuid("field_id").notNull().references(() => leadFormFields.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    unique("lead_form_field_options_unique").on(t.fieldId, t.value),
    pgPolicy("lead_form_field_options_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();

/**
 * A resposta de um formulário, um valor por linha e cada tipo na sua coluna.
 *
 * `fieldId` fica nulo quando o campo é apagado do formulário: a resposta que
 * alguém já deu não pode sumir junto, e `fieldKey` preserva o que foi
 * perguntado.
 */
export const formSubmissionValues = pgTable(
  "form_submission_values",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    submissionId: uuid("submission_id").notNull().references(() => formSubmissions.id, { onDelete: "cascade" }),
    fieldId: uuid("field_id").references(() => leadFormFields.id, { onDelete: "set null" }),
    fieldKey: text("field_key").notNull(),
    valueText: text("value_text"),
    valueNumber: numeric("value_number", { precision: 20, scale: 6 }),
    valueBoolean: boolean("value_boolean"),
    valueDate: date("value_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("form_submission_values_unique").on(t.submissionId, t.fieldKey),
    index("form_submission_values_submission_idx").on(t.orgId, t.submissionId),
    pgPolicy("form_submission_values_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
