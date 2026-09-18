import { describe, expect, it } from "vitest";
import { calculateStageProbability, canArchiveStage, canCloseAtStage, canMoveBetweenStages, isValidStageOrder, operatingMillisecondsBetween, stageMoveCooldownRemaining, stageSlaProgress } from "./stageWorkflow.js";
import type { BusinessHour, Holiday, StageTransition } from "../schema/stageWorkflow.js";

const source = { id: "a", pipelineId: "p", restrictTransitions: true, allowWon: false, allowLost: true };
const target = { id: "b", pipelineId: "p", restrictTransitions: false, allowWon: true, allowLost: true };

describe("regras de movimentação e SLA", () => {
  it("só permite destinos configurados quando a origem é restrita", () => {
    expect(canMoveBetweenStages(source, target, [])).toBe(false);
    expect(canMoveBetweenStages(source, target, [{ fromStageId: "a", toStageId: "b" } as StageTransition])).toBe(true);
  });

  it("governa ganho e perda pela etapa atual", () => {
    expect(canCloseAtStage(source, "won")).toBe(false);
    expect(canCloseAtStage(source, "lost")).toBe(true);
  });

  it("impõe três segundos entre mudanças", () => {
    expect(stageMoveCooldownRemaining("2026-09-15T12:00:00.000Z", new Date("2026-09-15T12:00:01.250Z"))).toBe(1_750);
  });

  it("consome somente expediente, desconta almoço e respeita fechamento", () => {
    const hours = [{ weekday: 1, enabled: true, startTime: "09:00", breakStartTime: "12:00", breakEndTime: "13:00", endTime: "18:00", timeZone: "America/Sao_Paulo" }] as BusinessHour[];
    const start = new Date("2026-09-14T11:00:00.000Z"); // 08:00 local
    const end = new Date("2026-09-14T22:00:00.000Z"); // 19:00 local
    expect(operatingMillisecondsBetween(start, end, hours, [])).toBe(8 * 3_600_000);
    const closed = [{ startDate: "2026-09-14", endDate: "2026-09-14", kind: "closed", repeatsAnnually: false }] as Holiday[];
    expect(operatingMillisecondsBetween(start, end, hours, closed)).toBe(0);
  });

  it("classifica o consumo do SLA", () => {
    expect(stageSlaProgress(48 * 60_000, 60)).toMatchObject({ percent: 80, state: "due_soon", remainingMinutes: 12 });
    expect(stageSlaProgress(61 * 60_000, 60).state).toBe("breached");
  });
});

describe("arquivar e reordenar etapas", () => {
  it("só arquiva etapa sem negócio aberto", () => {
    expect(canArchiveStage(0)).toBe(true);
    expect(canArchiveStage(1)).toBe(false);
    expect(canArchiveStage(3)).toBe(false);
  });

  it("aceita reordenar quando é a mesma lista, só embaralhada", () => {
    expect(isValidStageOrder(["a", "b", "c"], ["c", "a", "b"])).toBe(true);
    expect(isValidStageOrder(["a", "b", "c"], ["a", "b", "c"])).toBe(true);
  });

  it("recusa lista com etapa faltando, sobrando ou repetida", () => {
    expect(isValidStageOrder(["a", "b", "c"], ["a", "b"])).toBe(false);
    expect(isValidStageOrder(["a", "b", "c"], ["a", "b", "c", "d"])).toBe(false);
    expect(isValidStageOrder(["a", "b", "c"], ["a", "a", "c"])).toBe(false);
    expect(isValidStageOrder(["a", "b", "c"], ["a", "b", "d"])).toBe(false);
  });

  it("sem histórico em nenhuma janela, começa em 100%", () => {
    expect(calculateStageProbability({ longWindow: { left: 0, advanced: 0 }, shortWindow: { left: 0, advanced: 0 } })).toBe(100);
    expect(calculateStageProbability({ longWindow: { left: 2, advanced: 0 }, shortWindow: { left: 1, advanced: 0 } })).toBe(100);
  });

  it("usa a janela curta quando só ela tem amostra suficiente", () => {
    expect(calculateStageProbability({ longWindow: { left: 2, advanced: 1 }, shortWindow: { left: 10, advanced: 3 } })).toBe(30);
  });

  it("usa a janela longa quando só ela tem amostra suficiente", () => {
    expect(calculateStageProbability({ longWindow: { left: 20, advanced: 15 }, shortWindow: { left: 4, advanced: 4 } })).toBe(75);
  });

  it("com as duas janelas maduras, pesa a curta mais que a longa", () => {
    // curta: 20% de avanço: longa: 80% de avanço — 0.65*20 + 0.35*80 = 41
    expect(calculateStageProbability({ longWindow: { left: 10, advanced: 8 }, shortWindow: { left: 10, advanced: 2 } })).toBe(41);
  });
});
