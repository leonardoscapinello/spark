import { FILTER_OPERATORS, filterOperatorAcceptsMany, filterSetFromConditions, type ContactFilter, type ContactFilterGroup, type ContactFilterSet, type FilterCombinator, type FilterOperator } from "./contactFilter.js";

/**
 * Formato de fio dos filtros. Fica no core junto da regra porque a URL é
 * compartilhável — o link que uma pessoa manda para outra precisa significar
 * a mesma coisa amanhã, e a visão salva guarda exatamente este texto.
 *
 *   conjunto = (all|any) "/" grupo ("/" grupo)*
 *   grupo    = (and|or) ":" condição (";" condição)*
 *   condição = campo ":" operador ":" valor        valor múltiplo: v1,v2 (cada um codificado)
 *
 * O formato antigo — só `campo:op:valor;…` — continua sendo lido como um
 * grupo «tudo E»: visões salvas antes do construtor abrem iguais.
 */
const GROUP_SEPARATOR = "/";
const CONDITION_SEPARATOR = ";";
const PART = ":";
const MANY = ",";

function encodePart(value: string): string { return encodeURIComponent(value); }

function encodeValue(filter: ContactFilter): string {
  if (Array.isArray(filter.value)) return filter.value.map(encodePart).join(MANY);
  return encodePart(filter.value ?? "");
}

function encodeCondition(filter: ContactFilter): string {
  return [encodePart(filter.field), filter.operator, encodeValue(filter)].join(PART);
}

export function encodeContactFilters(filters: readonly ContactFilter[]): string {
  return filters.map(encodeCondition).join(CONDITION_SEPARATOR);
}

export function encodeContactFilterSet(set: ContactFilterSet): string {
  const groups = set.groups.filter((group) => group.conditions.length > 0);
  if (!groups.length) return "";
  const head = set.combinator === "or" ? "any" : "all";
  return [head, ...groups.map((group) => `${group.combinator}${PART}${encodeContactFilters(group.conditions)}`)].join(GROUP_SEPARATOR);
}

const OPERATORS = new Set<string>(FILTER_OPERATORS);

function decodeCondition(chunk: string): ContactFilter | null {
  const [field, operator, ...rest] = chunk.split(PART);
  // Condição corrompida é descartada, não vira erro: o texto vem da barra de
  // endereços e uma URL editada à mão não pode derrubar a tela.
  if (!field || !operator || !OPERATORS.has(operator)) return null;
  const raw = rest.join(PART);
  const op = operator as FilterOperator;
  if (filterOperatorAcceptsMany(op)) {
    const values = raw.split(MANY).filter(Boolean).map(decodeURIComponent);
    return { field: decodeURIComponent(field) as ContactFilter["field"], operator: op, value: values.length ? values : null };
  }
  const value = decodeURIComponent(raw);
  return { field: decodeURIComponent(field) as ContactFilter["field"], operator: op, value: value === "" ? null : value };
}

export function decodeContactFilters(raw: string | null | undefined): ContactFilter[] {
  if (!raw) return [];
  return raw.split(CONDITION_SEPARATOR).flatMap((chunk) => { const condition = decodeCondition(chunk); return condition ? [condition] : []; });
}

function decodeGroup(chunk: string): ContactFilterGroup | null {
  const [head, ...rest] = chunk.split(PART);
  if (head !== "and" && head !== "or") return null;
  const conditions = decodeContactFilters(rest.join(PART));
  return conditions.length ? { combinator: head, conditions } : null;
}

export function decodeContactFilterSet(raw: string | null | undefined): ContactFilterSet {
  if (!raw) return filterSetFromConditions([]);
  const [head, ...groups] = raw.split(GROUP_SEPARATOR);
  if (head !== "all" && head !== "any") return filterSetFromConditions(decodeContactFilters(raw));
  const combinator: FilterCombinator = head === "any" ? "or" : "and";
  return { combinator, groups: groups.flatMap((chunk) => { const group = decodeGroup(chunk); return group ? [group] : []; }) };
}
