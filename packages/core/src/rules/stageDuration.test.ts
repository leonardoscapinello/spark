import { describe, it, expect } from "vitest";
import { formatStageDuration, millisecondsByStage, stageVisits } from "./stageDuration.js";

const day = 86_400_000;
const at = (offsetDays: number) => new Date(Date.UTC(2026, 8, 1) + offsetDays * day).toISOString();

describe("tempo por etapa", () => {
  it("sem mudanças, o negócio está na etapa de criação desde o começo", () => {
    const now = new Date(at(3));
    const visits = stageVisits(at(0), "novo", [], now);
    expect(visits).toEqual([{ stageId: "novo", enteredAt: at(0), leftAt: null }]);
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
  });

  it("ordena o histórico e ignora evento repetido da mesma etapa", () => {
    const now = new Date(at(4));
    const visits = stageVisits(at(0), "novo", [{ stageId: "proposta", occurredAt: at(3) }, { stageId: "contato", occurredAt: at(1) }, { stageId: "contato", occurredAt: at(2) }], now);
    expect(visits.map((visit) => visit.stageId)).toEqual(["novo", "contato", "proposta"]);
  });

  it("escreve a duração curta o bastante para caber na seta", () => {
    expect(formatStageDuration(30_000)).toBe("agora");
    expect(formatStageDuration(25 * 60_000)).toBe("25 min");
    expect(formatStageDuration(5 * 3_600_000)).toBe("5 h");
    expect(formatStageDuration(day)).toBe("1 dia");
    expect(formatStageDuration(9 * day)).toBe("9 dias");
  });
});
