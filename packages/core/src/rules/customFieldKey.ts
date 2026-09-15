import type { CustomFieldDefinitionId } from "../identity/index.js";

/**
 * Identificador interno estável de um campo personalizado.
 *
 * O gestor escolhe o nome visível; o sistema deriva a chave uma única vez.
 * O fragmento do UUID impede colisão sem pedir conhecimento técnico e mantém
 * filtros/automações estáveis caso o nome do campo mude depois.
 */
export function deriveCustomFieldKey(label: string, id: CustomFieldDefinitionId): string {
  const suffix = id.replace(/[^a-z0-9]/gi, "").toLocaleLowerCase("en-US").slice(-12);
  const normalized = label.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const readable = /^[a-z]/.test(normalized) ? normalized : `campo_${normalized}`;
  const base = (readable || "campo").slice(0, 63 - suffix.length - 1).replace(/_+$/g, "");
  return `${base}_${suffix}`;
}
