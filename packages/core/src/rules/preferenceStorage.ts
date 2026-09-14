import type { UserPreferenceValue } from "../schema/userPreference.js";

/**
 * Como uma preferência de interface ocupa colunas, e como volta de lá
 * (ADR-0035).
 *
 * Uma preferência é um booleano, um número, um texto, uma lista de textos ou um
 * objeto raso. Nenhuma dessas coisas precisa de JSON: escalar vai para a coluna
 * do seu tipo, e lista e objeto viram linhas em `user_preference_items`.
 *
 * `kind` existe porque duas formas vazias não são iguais: uma lista vazia e um
 * objeto vazio produziriam exatamente as mesmas linhas — nenhuma. Guardar qual
 * era resolve isso sem adivinhação na leitura.
 */
export type PreferenceKind = "text" | "number" | "boolean" | "list" | "object";

export interface PreferenceItemRow {
  itemKey: string | null;
  sortOrder: number;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
}

export interface PreferenceStorage {
  kind: PreferenceKind;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  items: PreferenceItemRow[];
}

const EMPTY = { valueText: null, valueNumber: null, valueBoolean: null };

/** O valor que a tela usa → as colunas e linhas a gravar. */
export function toPreferenceStorage(value: UserPreferenceValue): PreferenceStorage {
  if (typeof value === "boolean") return { kind: "boolean", ...EMPTY, valueBoolean: value, items: [] };
  if (typeof value === "number") return { kind: "number", ...EMPTY, valueNumber: value, items: [] };
  if (typeof value === "string") return { kind: "text", ...EMPTY, valueText: value, items: [] };

  if (Array.isArray(value)) {
    return {
      kind: "list",
      ...EMPTY,
      items: value.map((item, index) => ({ itemKey: null, sortOrder: index, ...EMPTY, valueText: String(item) })),
    };
  }

  return {
    kind: "object",
    ...EMPTY,
    items: Object.entries(value).map(([itemKey, item], index) => ({
      itemKey,
      sortOrder: index,
      ...EMPTY,
      ...scalarColumns(item),
    })),
  };
}

/** As colunas e linhas do banco → o valor que a tela usa. */
export function fromPreferenceStorage(
  row: { kind: PreferenceKind; valueText: string | null; valueNumber: number | null; valueBoolean: boolean | null },
  items: readonly PreferenceItemRow[],
): UserPreferenceValue {
  if (row.kind === "boolean") return row.valueBoolean ?? false;
  if (row.kind === "number") return row.valueNumber ?? 0;
  if (row.kind === "text") return row.valueText ?? "";

  const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  if (row.kind === "list") return ordered.map((item) => item.valueText ?? "");

  const object: Record<string, unknown> = {};
  for (const item of ordered) {
    if (item.itemKey === null) continue;
    object[item.itemKey] = item.valueBoolean ?? item.valueNumber ?? item.valueText ?? null;
  }
  return object;
}

function scalarColumns(value: unknown): { valueText: string | null; valueNumber: number | null; valueBoolean: boolean | null } {
  if (typeof value === "boolean") return { ...EMPTY, valueBoolean: value };
  if (typeof value === "number") return { ...EMPTY, valueNumber: value };
  if (value === null || value === undefined) return { ...EMPTY };
  return { ...EMPTY, valueText: String(value) };
}
