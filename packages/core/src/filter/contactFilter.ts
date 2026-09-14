import type { Contact } from "../schema/contact.js";

/**
 * Filtro estruturado de pessoas. Vive no core porque as duas superfícies de
 * leitura precisam decidir igual: a tela lê da coleção local e a API lê do
 * Postgres (CLAUDE.md regra 5, ADR-0026). Regra escrita só de um lado é lista
 * que diverge entre o app e o relatório.
 */
export const CONTACT_FILTER_FIELDS = ["leadStatus", "source", "ownerId", "companyId", "score", "tags", "createdAt"] as const;
export type ContactFilterField = (typeof CONTACT_FILTER_FIELDS)[number] | `custom:${string}`;

export const FILTER_OPERATORS = ["is", "is_not", "contains", "is_empty", "is_not_empty", "before", "after", "gt", "lt"] as const;
export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export interface ContactFilter { field: ContactFilterField; operator: FilterOperator; value: string | null }

function fieldValue(contact: Contact, field: ContactFilterField): unknown {
  if (field.startsWith("custom:")) return contact.customFields[field.slice("custom:".length)];
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
  if (filter.value === null || filter.value === "") return true;

  if (filter.operator === "is") return Array.isArray(value) ? value.map(String).includes(filter.value) : asText(value) === filter.value;
  if (filter.operator === "is_not") return Array.isArray(value) ? !value.map(String).includes(filter.value) : asText(value) !== filter.value;
  if (filter.operator === "contains") return asText(value).toLocaleLowerCase("pt-BR").includes(filter.value.toLocaleLowerCase("pt-BR"));

  const order = compare(value, filter.value);
  if (order === null || isEmpty(value)) return false;
  if (filter.operator === "before" || filter.operator === "lt") return order < 0;
  return order > 0;
}

/** Todas as condições precisam passar — o «e» da referência, não o «ou». */
export function contactMatchesFilters(contact: Contact, filters: readonly ContactFilter[]): boolean {
  return filters.every((filter) => contactMatchesFilter(contact, filter));
}
