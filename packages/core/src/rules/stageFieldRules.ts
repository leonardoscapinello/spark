import type { CustomFieldDefinition } from "../schema/customField.js";
import type { Deal } from "../schema/deal.js";
import type { StageFieldLevel, StageFieldRule } from "../schema/stageFieldRule.js";

/**
 * Campos exigidos por etapa, como no Pipedrive.
 *
 * Uma regra diz: **neste funil, nesta etapa, este campo é obrigatório ou
 * importante.** O mesmo campo pode ser obrigatório num funil e livre em outro,
 * e obrigatório numa etapa e não nas seguintes — é por isso que a regra é
 * (funil, etapa, campo), e não uma marca no campo.
 *
 * - **obrigatório** impede o negócio de passar da etapa sem o campo preenchido;
 * - **importante** não impede nada: sinaliza que deveria estar preenchido.
 *
 * Mora no core porque as duas pontas precisam concordar: a tela bloqueia o
 * arrasto e a API recusa a mesma mudança (CLAUDE.md, regra 1).
 */

/** Campos do próprio negócio que podem ser exigidos, além dos personalizados. */
export const DEAL_BUILT_IN_FIELDS = ["contactId", "companyId", "ownerId", "expectedCloseDate", "amount", "products"] as const;
export type DealBuiltInField = (typeof DEAL_BUILT_IN_FIELDS)[number];
export const DEAL_BUILT_IN_FIELD_LABELS: Record<DealBuiltInField, string> = {
  contactId: "Pessoa", companyId: "Empresa", ownerId: "Responsável",
  expectedCloseDate: "Previsão de fechamento", amount: "Valor", products: "Produtos",
};

/** `custom:<chave>` para campo personalizado; o nome cru para campo do negócio. */
export function stageFieldLabel(fieldKey: string, customFields: readonly CustomFieldDefinition[]): string {
  if (fieldKey.startsWith("custom:")) {
    const key = fieldKey.slice("custom:".length);
    const found = customFields.find((field) => field.key === key)?.label;
    // Sem a definição em mãos (a organização apagou o campo, ou a
    // sincronização ainda não chegou), mostrar `origem_negocio` seria mostrar
    // o nome da coluna para quem não sabe o que é coluna.
    return found ?? humanize(key);
  }
  return DEAL_BUILT_IN_FIELD_LABELS[fieldKey as DealBuiltInField] ?? humanize(fieldKey);
}

/** `origem_negocio` → «Origem negocio». Último recurso, nunca o caminho normal. */
function humanize(key: string): string {
  const words = key.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * A frase que a tela mostra para cada nível, no plural certo.
 *
 * Fica aqui porque a **diferença entre importante e obrigatório é regra de
 * negócio, não estilo de texto**: obrigatório impede a etapa de mudar e
 * importante só sinaliza. Escrever a frase na tela deixaria as duas com a
 * mesma cara, que é o que apagava a diferença.
 */
export function stageFieldMessage(
  level: StageFieldLevel,
  labels: readonly string[],
  stageName?: string,
): string {
  const lista = labels.join(", ");
  const plural = labels.length > 1;
  if (level === "required") {
    const destino = stageName ? ` para «${stageName}»` : "";
    return plural
      ? `Preencha estes campos antes de mover${destino}: ${lista}.`
      : `Preencha ${lista} antes de mover${destino}.`;
  }
  return plural
    ? `Campos importantes desta etapa ainda em branco: ${lista}.`
    : `${lista} é um campo importante desta etapa e está em branco.`;
}

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return value !== 0;
  return true;
}

/** O valor do campo no negócio — `productCount` entra porque produtos não são coluna. */
export function dealFieldValue(deal: Deal, fieldKey: string, productCount: number): unknown {
  if (fieldKey === "products") return productCount;
  if (fieldKey.startsWith("custom:")) return deal.customFields?.[fieldKey.slice("custom:".length)];
  return (deal as unknown as Record<string, unknown>)[fieldKey];
}

export interface StageFieldIssue { fieldKey: string; stageId: string; level: StageFieldLevel }

export interface StageFieldEvaluation {
  /** Vazios e obrigatórios para chegar onde se quer ir — impedem a mudança. */
  blocking: StageFieldIssue[];
  /** Vazios e importantes na etapa atual — só sinalizam. */
  warnings: StageFieldIssue[];
}

export interface EvaluateStageFieldsInput {
  deal: Deal;
  productCount: number;
  rules: readonly StageFieldRule[];
  /** Etapas do funil, na ordem. */
  stages: readonly { id: string; sortOrder: number }[];
  /** Para onde o negócio está indo; sem isto, avalia só a etapa atual. */
  targetStageId?: string | undefined;
}

/**
 * Obrigatório vale para **sair** da etapa: mover para uma etapa posterior exige
 * os campos de todas as etapas que ficam para trás, inclusive a de origem —
 * senão pular direto da primeira para a última driblaria as regras do caminho.
 * Mover para trás nunca é bloqueado: corrigir um engano não pode depender de
 * preencher campo.
 */
export function evaluateStageFields({ deal, productCount, rules, stages, targetStageId }: EvaluateStageFieldsInput): StageFieldEvaluation {
  const order = new Map(stages.map((stage) => [stage.id, stage.sortOrder]));
  const currentOrder = order.get(deal.stageId);
  const targetOrder = targetStageId === undefined ? undefined : order.get(targetStageId);
  const pipelineRules = rules.filter((rule) => rule.pipelineId === deal.pipelineId);

  const warnings = pipelineRules
    .filter((rule) => rule.level === "important" && rule.stageId === deal.stageId)
    .filter((rule) => !isFilled(dealFieldValue(deal, rule.fieldKey, productCount)))
    .map((rule) => ({ fieldKey: rule.fieldKey, stageId: rule.stageId, level: rule.level }));

  if (targetOrder === undefined || currentOrder === undefined || targetOrder <= currentOrder) {
    return { blocking: [], warnings };
  }

  const blocking = pipelineRules
    .filter((rule) => rule.level === "required")
    .filter((rule) => {
      const ruleOrder = order.get(rule.stageId);
      return ruleOrder !== undefined && ruleOrder < targetOrder;
    })
    .filter((rule) => !isFilled(dealFieldValue(deal, rule.fieldKey, productCount)))
    .map((rule) => ({ fieldKey: rule.fieldKey, stageId: rule.stageId, level: rule.level }));

  return { blocking, warnings };
}
