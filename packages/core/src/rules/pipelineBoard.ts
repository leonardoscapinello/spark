import type { Deal } from "../schema/deal.js";
import type { Stage } from "../schema/stage.js";

export const PIPELINE_ENTRY_NAME = "Entrada de lead";
export const PIPELINE_OUTCOMES = [
  { kind: "outcome", id: "won", name: "Ganhos" },
  { kind: "outcome", id: "lost", name: "Perdidos" },
] as const;

type PipelineColumn = (Stage & { kind: "stage" }) | (typeof PIPELINE_OUTCOMES)[number];

/** Resultados são colunas fixas de status; preservam a última etapa do negócio. */
export function pipelineBoardColumns(stages: readonly Stage[]): PipelineColumn[] {
  const active = stages.filter((stage) => !stage.archivedAt).sort((a, b) => a.sortOrder - b.sortOrder);
  return [...active.map((stage) => ({ ...stage, kind: "stage" as const })), ...PIPELINE_OUTCOMES];
}

export function dealBoardColumn(deal: Pick<Deal, "status" | "stageId">): string {
  return deal.status === "open" ? deal.stageId : deal.status;
}
