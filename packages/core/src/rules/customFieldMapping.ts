import type { CustomFieldDefinition, CustomFieldType } from "../schema/customField.js";

/**
 * Levar o valor de um campo personalizado para outro — da conversa para o
 * negócio, do negócio para a pessoa — numa automação.
 *
 * Só entre tipos compatíveis: o destino precisa saber guardar o que a origem
 * tem. Alguns caminhos são seguros num sentido só (número vira texto, texto
 * não vira número), e é isso que a tabela abaixo diz.
 */
const ACCEPTS: Record<CustomFieldType, readonly CustomFieldType[]> = {
  text: ["text", "paragraph", "number", "currency", "date", "datetime", "phone", "url", "single_select", "multi_select"],
  paragraph: ["text", "paragraph", "number", "currency", "date", "datetime", "phone", "url", "single_select", "multi_select"],
  number: ["number", "currency"],
  currency: ["currency", "number"],
  date: ["date", "datetime"],
  datetime: ["datetime", "date"],
  phone: ["phone"],
  url: ["url"],
  boolean: ["boolean"],
  single_select: ["single_select", "text"],
  multi_select: ["multi_select", "single_select"],
};

/** O campo `target` consegue receber o que `source` guarda? */
export function customFieldAccepts(target: CustomFieldType, source: CustomFieldType): boolean {
  return ACCEPTS[target].includes(source);
}

/**
 * Campos que podem receber este — o que a automação oferece como destino.
 * Campo arquivado fica de fora: mapear para ele guardaria valor que ninguém vê.
 */
export function compatibleTargets(source: CustomFieldDefinition, candidates: readonly CustomFieldDefinition[]): CustomFieldDefinition[] {
  return candidates.filter((candidate) =>
    candidate.id !== source.id
    && candidate.archivedAt === null
    && customFieldAccepts(candidate.type, source.type));
}

/**
 * Converte o valor da origem para a forma do destino. Devolve `null` quando o
 * valor não sobrevive à conversão — a automação trata como "não copiar", nunca
 * grava lixo no destino.
 */
export function convertCustomFieldValue(target: CustomFieldType, source: CustomFieldType, value: unknown): unknown {
  if (value === null || value === undefined || value === "") return null;
  if (!customFieldAccepts(target, source)) return null;
  if (target === source) return value;
  if (target === "text" || target === "paragraph") return Array.isArray(value) ? value.map(String).join(", ") : String(value);
  // Moeda é centavo inteiro; número solto vira centavo ao virar moeda, e volta a inteiro ao sair dela.
  if (target === "currency" && source === "number") return typeof value === "number" ? Math.round(value * 100) : null;
  if (target === "number" && source === "currency") return typeof value === "number" ? value / 100 : null;
  if (target === "datetime" && source === "date") return `${String(value)}T12:00:00.000Z`;
  if (target === "date" && source === "datetime") return String(value).slice(0, 10);
  if (target === "multi_select" && source === "single_select") return [String(value)];
  if (target === "single_select" && source === "multi_select") return Array.isArray(value) && value.length > 0 ? String(value[0]) : null;
  return null;
}
