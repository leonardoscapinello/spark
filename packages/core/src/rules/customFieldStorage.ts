import type { CustomFieldDefinition, CustomFieldType } from "../schema/customField.js";

/**
 * Como um valor de campo personalizado ocupa as colunas de
 * `custom_field_values` — e como volta de lá (ADR-0035).
 *
 * O banco tem uma coluna por tipo de dado: texto é texto, número é número,
 * dinheiro é centavo inteiro, data é data. Esta é a tradução entre o valor que
 * a aplicação usa e a linha que o Postgres guarda, num lugar só, para que a
 * API e a tela não inventem cada uma a sua.
 */

/** A coluna onde cada tipo de campo guarda o seu valor. */
export const CUSTOM_FIELD_COLUMN: Record<CustomFieldType, StorageColumn> = {
  text: "valueText",
  paragraph: "valueText",
  phone: "valueText",
  url: "valueText",
  number: "valueNumber",
  currency: "valueMoney",
  date: "valueDate",
  datetime: "valueTimestamp",
  boolean: "valueBoolean",
  single_select: "optionId",
  multi_select: "optionId",
};

export type StorageColumn = "valueText" | "valueNumber" | "valueMoney" | "valueDate" | "valueTimestamp" | "valueBoolean" | "optionId";

export interface CustomFieldValueRow {
  valueText?: string | null;
  valueNumber?: number | null;
  valueMoney?: number | null;
  valueDate?: string | null;
  valueTimestamp?: string | null;
  valueBoolean?: boolean | null;
  optionId?: string | null;
}

/** O campo guarda uma linha por opção escolhida, em vez de uma só. */
export function isMultiValued(type: CustomFieldType): boolean {
  return type === "multi_select";
}

/**
 * Valor normalizado (o que `normalizeCustomFieldValue` devolve) → as linhas a
 * gravar. Uma lista para seleção múltipla; uma linha, ou nenhuma, para o resto.
 *
 * `resolveOptionId` traduz o valor escolhido no id da opção; devolver
 * `undefined` significa «essa opção não existe mais», e a linha é descartada em
 * vez de gravar referência quebrada.
 */
export function toCustomFieldRows(
  field: Pick<CustomFieldDefinition, "type">,
  value: unknown,
  resolveOptionId: (optionValue: string) => string | undefined,
): CustomFieldValueRow[] {
  if (value === null || value === undefined || value === "") return [];

  if (isMultiValued(field.type)) {
    const chosen = Array.isArray(value) ? value.map(String) : [String(value)];
    return chosen
      .map((optionValue) => resolveOptionId(optionValue))
      .filter((id): id is string => id !== undefined)
      .map((optionId) => ({ optionId }));
  }

  const column = CUSTOM_FIELD_COLUMN[field.type];
  if (column === "optionId") {
    const optionId = resolveOptionId(String(value));
    return optionId === undefined ? [] : [{ optionId }];
  }
  if (column === "valueNumber") {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? [{ valueNumber: parsed }] : [];
  }
  if (column === "valueMoney") {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isInteger(parsed) ? [{ valueMoney: parsed }] : [];
  }
  if (column === "valueBoolean") return [{ valueBoolean: value === true }];
  // Data e instante viajam como texto ISO; o Postgres é quem os tipa.
  if (column === "valueDate") return [{ valueDate: String(value).slice(0, 10) }];
  if (column === "valueTimestamp") return [{ valueTimestamp: String(value) }];
  return [{ valueText: String(value) }];
}

/**
 * As linhas do banco → o valor que a aplicação usa. `optionValueById` traduz
 * o id da opção de volta no valor escolhido.
 */
export function fromCustomFieldRows(
  field: Pick<CustomFieldDefinition, "type">,
  rows: readonly CustomFieldValueRow[],
  optionValueById: (optionId: string) => string | undefined,
): unknown {
  if (rows.length === 0) return null;

  if (isMultiValued(field.type)) {
    return rows
      .map((row) => (row.optionId ? optionValueById(row.optionId) : undefined))
      .filter((value): value is string => value !== undefined);
  }

  const row = rows[0];
  if (!row) return null;
  const column = CUSTOM_FIELD_COLUMN[field.type];
  if (column === "optionId") return row.optionId ? optionValueById(row.optionId) ?? null : null;
  if (column === "valueNumber") return row.valueNumber ?? null;
  if (column === "valueMoney") return row.valueMoney ?? null;
  if (column === "valueBoolean") return row.valueBoolean ?? null;
  if (column === "valueDate") return row.valueDate ?? null;
  if (column === "valueTimestamp") return row.valueTimestamp ?? null;
  return row.valueText ?? null;
}
