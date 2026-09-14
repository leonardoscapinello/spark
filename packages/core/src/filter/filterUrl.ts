import { FILTER_OPERATORS, type ContactFilter, type FilterOperator } from "./contactFilter.js";

/**
 * Formato de fio dos filtros: `campo:operador:valor`, condições separadas por
 * `;`. Fica no core junto da regra porque a URL é compartilhável — o link que
 * uma pessoa manda para outra precisa significar a mesma coisa amanhã, e a API
 * precisa ler o mesmo texto que a tela escreveu.
 */
const SEPARATOR = ";";
const PART = ":";

function encodePart(value: string): string { return encodeURIComponent(value); }

export function encodeContactFilters(filters: readonly ContactFilter[]): string {
  return filters.map((filter) => [encodePart(filter.field), filter.operator, encodePart(filter.value ?? "")].join(PART)).join(SEPARATOR);
}

export function decodeContactFilters(raw: string | null | undefined): ContactFilter[] {
  if (!raw) return [];
  const operators = new Set<string>(FILTER_OPERATORS);
  return raw.split(SEPARATOR).flatMap((chunk) => {
    const [field, operator, ...rest] = chunk.split(PART);
    // Condição corrompida é descartada, não vira erro: o texto vem da barra de
    // endereços e uma URL editada à mão não pode derrubar a tela.
    if (!field || !operator || !operators.has(operator)) return [];
    const value = decodeURIComponent(rest.join(PART));
    return [{ field: decodeURIComponent(field) as ContactFilter["field"], operator: operator as FilterOperator, value: value === "" ? null : value }];
  });
}
