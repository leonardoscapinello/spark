import type { Contact } from "../schema/contact.js";

/**
 * Filtro estruturado de pessoas. Vive no core porque as duas superfícies de
 * leitura precisam decidir igual: a tela lê da coleção local e a API lê do
 * Postgres (CLAUDE.md regra 5, ADR-0026). Regra escrita só de um lado é lista
 * que diverge entre o app e o relatório.
 */
export const CONTACT_FILTER_FIELDS = ["leadStatus", "source", "ownerId", "companyId", "score", "tags", "createdAt"] as const;
export type ContactFilterField = (typeof CONTACT_FILTER_FIELDS)[number] | `custom:${string}`;

export const FILTER_OPERATORS = ["is", "is_not", "in", "not_in", "contains", "is_empty", "is_not_empty", "before", "after", "gt", "lt"] as const;
export type FilterOperator = (typeof FILTER_OPERATORS)[number];

/** Uma condição. `value` é lista quando o operador é «é um de» / «não é nenhum de». */
export interface ContactFilter { field: ContactFilterField; operator: FilterOperator; value: string | string[] | null }

export const FILTER_COMBINATORS = ["and", "or"] as const;
export type FilterCombinator = (typeof FILTER_COMBINATORS)[number];

/**
 * Filtro composto, como o do Pipedrive: grupos de condições, cada grupo com
 * seu E/OU, e um E/OU entre os grupos. Uma lista chata de condições é o caso
 * particular «um grupo, tudo E» — é assim que as URLs e visões salvas antigas
 * são lidas (filterUrl).
 */
export interface ContactFilterGroup { combinator: FilterCombinator; conditions: ContactFilter[] }
export interface ContactFilterSet { combinator: FilterCombinator; groups: ContactFilterGroup[] }

export function emptyFilterSet(): ContactFilterSet { return { combinator: "and", groups: [] }; }
export function filterSetFromConditions(conditions: readonly ContactFilter[]): ContactFilterSet {
  return conditions.length ? { combinator: "and", groups: [{ combinator: "and", conditions: [...conditions] }] } : emptyFilterSet();
}
/** Todas as condições, na ordem, sem os grupos — para contar, listar e procurar. */
export function filterSetConditions(set: ContactFilterSet): ContactFilter[] { return set.groups.flatMap((group) => group.conditions); }

export const FILTER_VALUE_TYPES = ["select", "text", "number", "date", "list"] as const;
export type FilterValueType = (typeof FILTER_VALUE_TYPES)[number];

/**
 * Operadores que fazem sentido para cada tipo de campo. Fica junto do motor
 * porque é ele quem sabe o que consegue decidir: oferecer «contém» para uma
 * data produziria uma condição que o filtro não sabe responder direito.
 */
export function operatorsForFilterType(type: FilterValueType): readonly FilterOperator[] {
  if (type === "select") return ["is", "is_not", "in", "not_in", "is_empty", "is_not_empty"];
  if (type === "number") return ["is", "gt", "lt", "is_empty", "is_not_empty"];
  if (type === "date") return ["after", "before", "is_empty", "is_not_empty"];
  if (type === "list") return ["is", "is_not", "in", "not_in", "is_empty", "is_not_empty"];
  return ["contains", "is", "is_not", "is_empty", "is_not_empty"];
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  is: "é", is_not: "não é", in: "é um de", not_in: "não é nenhum de", contains: "contém",
  is_empty: "está vazio", is_not_empty: "tem valor",
  before: "antes de", after: "depois de", gt: "maior que", lt: "menor que",
};

export function filterOperatorLabel(operator: FilterOperator): string { return OPERATOR_LABELS[operator]; }

/** Operador que decide pela ausência: a condição não pede valor nenhum. */
export function filterOperatorNeedsValue(operator: FilterOperator): boolean {
  return operator !== "is_empty" && operator !== "is_not_empty";
}

/** Operador que recebe vários valores de uma vez (seleção múltipla). */
export function filterOperatorAcceptsMany(operator: FilterOperator): boolean {
  return operator === "in" || operator === "not_in";
}

function fieldValue(contact: Contact, field: ContactFilterField): unknown {
  // Campo personalizado não é coluna da pessoa (ADR-0035): quem filtra passa
  // os valores já juntados das tabelas. Sem eles, o campo simplesmente não
  // casa — nunca estoura.
  if (field.startsWith("custom:")) return contact.customFields?.[field.slice("custom:".length)];
  return contact[field as (typeof CONTACT_FILTER_FIELDS)[number]];
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  return Array.isArray(value) && value.length === 0;
}

function asText(value: unknown): string {
  if (isEmpty(value)) return "";
  return Array.isArray(value) ? value.map(String).join(" ") : String(value);
}

function compare(value: unknown, target: string): number | null {
  const left = typeof value === "number" ? value : Number(value);
  const right = Number(target);
  if (Number.isFinite(left) && Number.isFinite(right)) return left - right;
  const text = asText(value);
  return text < target ? -1 : text > target ? 1 : 0;
}

export function contactMatchesFilter(contact: Contact, filter: ContactFilter): boolean {
  const value = fieldValue(contact, filter.field);
  if (filter.operator === "is_empty") return isEmpty(value);
  if (filter.operator === "is_not_empty") return !isEmpty(value);

  // Filtro sem valor está pela metade — quem está montando ainda não escolheu.
  // Tratar como inerte, e não como "nada combina", evita a lista piscar vazia.
  if (filter.value === null || filter.value === "" || (Array.isArray(filter.value) && filter.value.length === 0)) return true;

  const wanted = Array.isArray(filter.value) ? filter.value : [filter.value];
  const hasAny = Array.isArray(value) ? value.map(String).some((item) => wanted.includes(item)) : wanted.includes(asText(value));
  if (filter.operator === "is" || filter.operator === "in") return hasAny;
  if (filter.operator === "is_not" || filter.operator === "not_in") return !hasAny;
  const single = wanted[0] ?? "";
  if (filter.operator === "contains") return asText(value).toLocaleLowerCase("pt-BR").includes(single.toLocaleLowerCase("pt-BR"));

  const order = compare(value, single);
  if (order === null || isEmpty(value)) return false;
  if (filter.operator === "before" || filter.operator === "lt") return order < 0;
  return order > 0;
}

/** Todas as condições precisam passar — o «e» da referência, não o «ou». */
export function contactMatchesFilters(contact: Contact, filters: readonly ContactFilter[]): boolean {
  return filters.every((filter) => contactMatchesFilter(contact, filter));
}

function combine(combinator: FilterCombinator, results: readonly boolean[]): boolean {
  return combinator === "or" ? results.some(Boolean) : results.every(Boolean);
}

/** Grupo vazio e conjunto vazio são inertes: sem condição, tudo passa. */
export function contactMatchesFilterSet(contact: Contact, set: ContactFilterSet): boolean {
  const groups = set.groups.filter((group) => group.conditions.length > 0);
  if (!groups.length) return true;
  return combine(set.combinator, groups.map((group) => combine(group.combinator, group.conditions.map((filter) => contactMatchesFilter(contact, filter)))));
}
