import { useMemo } from "react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { fromCustomFieldRows, type CustomFieldDefinition, type CustomFieldEntity } from "@spark/core";
import { getCustomFieldOptionsCollection, getCustomFieldValuesCollection } from "./custom-field-data.client";

/**
 * Os valores dos campos personalizados de um registro, lidos das tabelas
 * (ADR-0035) e devolvidos no formato que a tela já usa: `{ chave: valor }`.
 *
 * A junção é local, sobre coleções sincronizadas — nenhuma ida à rede na
 * renderização (CLAUDE.md, regra 5). Seleção múltipla chega como várias linhas
 * e sai como lista.
 */
export function useCustomFieldValues(
  entityType: CustomFieldEntity,
  entityId: string | undefined,
  definitions: readonly CustomFieldDefinition[],
): Record<string, unknown> {
  const { data: rows = [] } = useLiveQuery(
    { query: (q) => entityId ? q.from({ values: getCustomFieldValuesCollection() }).where(({ values: value }) => eq(value.entityId, entityId)) : undefined },
    [entityId],
  );
  const { data: options = [] } = useLiveQuery({ query: (q) => q.from({ options: getCustomFieldOptionsCollection() }) });

  return useMemo(() => {
    const optionValueById = new Map<string, string>(options.map((option) => [option.id, option.value]));
    const result: Record<string, unknown> = {};
    for (const definition of definitions) {
      if (definition.entityType !== entityType) continue;
      const rowsOfField = rows.filter((row) => row.fieldId === definition.id);
      // O Postgres preserva a forma de cada tipo na sincronização: `numeric`
      // chega como texto (para não perder escala) e `bigint` como BigInt.
      // A aplicação trabalha com number — a conversão é aqui, uma vez só.
      const normalized = rowsOfField.map((row) => ({
        ...row,
        valueNumber: toNumber(row.valueNumber),
        valueMoney: toNumber(row.valueMoney),
      }));
      const value = fromCustomFieldRows(definition, normalized, (id) => optionValueById.get(id));
      if (value !== null) result[definition.key] = value;
    }
    return result;
  }, [definitions, entityType, options, rows]);
}

/**
 * O mesmo, mas para uma lista inteira: `{ idDoRegistro: { chave: valor } }`.
 *
 * A tela de pessoas precisa disso para exibir e filtrar por campo
 * personalizado sem uma consulta por linha — uma varredura só sobre a coleção
 * já sincronizada.
 */
export function useCustomFieldValuesByEntity(
  entityType: CustomFieldEntity,
  definitions: readonly CustomFieldDefinition[],
): Map<string, Record<string, unknown>> {
  const { data: rows = [] } = useLiveQuery({ query: (q) => q.from({ values: getCustomFieldValuesCollection() }) });
  const { data: options = [] } = useLiveQuery({ query: (q) => q.from({ options: getCustomFieldOptionsCollection() }) });

  return useMemo(() => {
    const optionValueById = new Map<string, string>(options.map((option) => [option.id, option.value]));
    const wanted = definitions.filter((definition) => definition.entityType === entityType);
    const byEntity = new Map<string, Record<string, unknown>>();

    for (const definition of wanted) {
      const rowsOfField = rows.filter((row) => row.fieldId === definition.id && row.entityType === entityType);
      const grouped = new Map<string, typeof rowsOfField>();
      for (const row of rowsOfField) {
        const list = grouped.get(row.entityId) ?? [];
        list.push(row);
        grouped.set(row.entityId, list);
      }
      for (const [entityId, entityRows] of grouped) {
        const normalized = entityRows.map((row) => ({ ...row, valueNumber: toNumber(row.valueNumber), valueMoney: toNumber(row.valueMoney) }));
        const value = fromCustomFieldRows(definition, normalized, (id) => optionValueById.get(id));
        if (value === null) continue;
        const current = byEntity.get(entityId) ?? {};
        current[definition.key] = value;
        byEntity.set(entityId, current);
      }
    }
    return byEntity;
  }, [definitions, entityType, options, rows]);
}

/** As opções de cada campo de seleção: `{ idDoCampo: [valores] }` (ADR-0035). */
export function useCustomFieldOptions(): Map<string, string[]> {
  const { data: options = [] } = useLiveQuery({ query: (q) => q.from({ options: getCustomFieldOptionsCollection() }) });
  return useMemo(() => {
    const byField = new Map<string, Array<{ value: string; sortOrder: number }>>();
    for (const option of options) {
      if (option.archivedAt !== null) continue;
      const list = byField.get(option.fieldId) ?? [];
      list.push({ value: option.value, sortOrder: option.sortOrder });
      byField.set(option.fieldId, list);
    }
    const ordered = new Map<string, string[]>();
    for (const [fieldId, list] of byField) {
      ordered.set(fieldId, list.sort((a, b) => a.sortOrder - b.sortOrder).map((option) => option.value));
    }
    return ordered;
  }, [options]);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
