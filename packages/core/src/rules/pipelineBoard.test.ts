import { describe, expect, it } from "vitest";
import { StageSchema } from "../schema/stage.js";
import { stageId, pipelineId, orgId } from "../identity/index.js";
import { dealBoardColumn, pipelineBoardColumns } from "./pipelineBoard.js";
import { canArchiveStage } from "./stageWorkflow.js";

const pipeline = pipelineId.create();
const org = orgId.create();
const entry = StageSchema.parse({
  id: stageId.create(), orgId: org, pipelineId: pipeline, name: "Recebidos",
  sortOrder: 1, isEntry: true, createdAt: "2026-09-27T12:00:00Z",
  updatedAt: "2026-09-27T12:00:00Z", archivedAt: null,
});
const middle = { ...entry, id: stageId.create(), name: "Contato", isEntry: false, sortOrder: 0 };

describe("colunas obrigatórias do funil", () => {
  it("mantém resultados fixos no final, mesmo quando a entrada muda de nome e posição", () => {
    expect(pipelineBoardColumns([entry, middle]).map(({ name }) => name)).toEqual(["Contato", "Recebidos", "Ganhos", "Perdidos"]);
    expect(entry.sortOrder).toBe(1);
  });

  it("preserva as colunas finais mesmo sem etapas sincronizadas", () => {
    expect(pipelineBoardColumns([]).map(({ id }) => id)).toEqual(["won", "lost"]);
  });

  it("esconde etapas arquivadas sem esconder resultados", () => {
    expect(pipelineBoardColumns([entry, { ...middle, archivedAt: "2026-09-27T13:00:00Z" }]).map(({ name }) => name)).toEqual(["Recebidos", "Ganhos", "Perdidos"]);
  });

  it("não permite remover a entrada, mas permite arquivar etapa comum vazia", () => {
    expect(canArchiveStage(0, true)).toBe(false);
    expect(canArchiveStage(0, false)).toBe(true);
    expect(canArchiveStage(1, false)).toBe(false);
  });

  it("separa os resultados pelo status sem alterar a etapa histórica do negócio", () => {
    const deal = { stageId: entry.id, status: "won" as const };
    expect(dealBoardColumn(deal)).toBe("won");
    expect(deal.stageId).toBe(entry.id);
    expect(dealBoardColumn({ ...deal, status: "lost" })).toBe("lost");
    expect(dealBoardColumn({ ...deal, status: "open" })).toBe(entry.id);
  });
});
