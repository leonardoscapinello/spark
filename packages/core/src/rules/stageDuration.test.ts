import { describe, it, expect } from "vitest";
import { formatDetailedStageDuration, formatStageDuration, millisecondsByStage, millisecondsOfLatestVisitByStage, stageVisits } from "./stageDuration.js";

const day = 86_400_000;
const at = (offsetDays: number) => new Date(Date.UTC(2026, 8, 1) + offsetDays * day).toISOString();

describe("tempo por etapa", () => {
  it("sem mudanças, o negócio está na etapa de criação desde o começo", () => {
    const now = new Date(at(3));
    const visits = stageVisits(at(0), "novo", [], now);
    expect(visits).toEqual([{ stageId: "novo", enteredAt: at(0), leftAt: null, enteredFromStageId: null, leftToStageId: null }]);
    expect(millisecondsByStage(visits, now).get("novo")).toBe(3 * day);
  });

  it("cada mudança fecha a etapa anterior e abre a próxima", () => {
    const now = new Date(at(10));
    const visits = stageVisits(at(0), "novo", [{ stageId: "contato", occurredAt: at(2) }, { stageId: "proposta", occurredAt: at(6) }], now);
    const totals = millisecondsByStage(visits, now);
    expect(totals.get("novo")).toBe(2 * day);
    expect(totals.get("contato")).toBe(4 * day);
    expect(totals.get("proposta")).toBe(4 * day);
  });

  it("voltar para uma etapa soma as duas passagens", () => {
    const now = new Date(at(10));
    const visits = stageVisits(at(0), "novo", [{ stageId: "contato", occurredAt: at(2) }, { stageId: "novo", occurredAt: at(4) }, { stageId: "contato", occurredAt: at(5) }], now);
    const totals = millisecondsByStage(visits, now);
    expect(totals.get("novo")).toBe(3 * day);
    expect(totals.get("contato")).toBe(7 * day);
    const latest = millisecondsOfLatestVisitByStage(visits, now);
    expect(latest.get("novo")).toBe(1 * day);
    expect(latest.get("contato")).toBe(5 * day);
  });

  it("ordena o histórico e ignora evento repetido da mesma etapa", () => {
    const now = new Date(at(4));
    const visits = stageVisits(at(0), "novo", [{ stageId: "proposta", occurredAt: at(3) }, { stageId: "contato", occurredAt: at(1) }, { stageId: "contato", occurredAt: at(2) }], now);
    expect(visits.map((visit) => visit.stageId)).toEqual(["novo", "contato", "proposta"]);
  });

  it("registra de onde entrou e para onde saiu em cada passagem, inclusive numa volta", () => {
    const visits = stageVisits(at(0), "novo", [
      { stageId: "qualificado", occurredAt: at(1) },
      { stageId: "proposta", occurredAt: at(2) },
      { stageId: "qualificado", occurredAt: at(3) },
    ], new Date(at(4)));
    expect(visits[1]).toMatchObject({ stageId: "qualificado", enteredFromStageId: "novo", leftToStageId: "proposta" });
    expect(visits[2]).toMatchObject({ stageId: "proposta", enteredFromStageId: "qualificado", leftToStageId: "qualificado" });
    expect(visits[3]).toMatchObject({ stageId: "qualificado", enteredFromStageId: "proposta", leftToStageId: null });
  });

  it("desempata mudanças no mesmo instante pela sequência temporal do evento", () => {
    const instant = at(1);
    const visits = stageVisits(at(0), "novo", [
      { stageId: "proposta", occurredAt: instant, sequence: "019b" },
      { stageId: "qualificado", occurredAt: instant, sequence: "019a" },
    ], new Date(at(2)));
    expect(visits.map((visit) => visit.stageId)).toEqual(["novo", "qualificado", "proposta"]);
  });

  it("escreve a duração curta o bastante para caber na seta", () => {
    expect(formatStageDuration(30_000)).toBe("30 s");
    expect(formatStageDuration(25 * 60_000)).toBe("25 min");
    expect(formatStageDuration(5 * 3_600_000)).toBe("5 h");
    expect(formatStageDuration(day)).toBe("1 dia");
    expect(formatStageDuration(9 * day)).toBe("9 dias");
  });

  it("explica a duração com precisão no detalhe", () => {
    expect(formatDetailedStageDuration(1_000)).toBe("1 segundo");
    expect(formatDetailedStageDuration(75 * 60_000)).toBe("1 hora e 15 min");
    expect(formatDetailedStageDuration(day + 3 * 3_600_000)).toBe("1 dia e 3 h");
  });
});
