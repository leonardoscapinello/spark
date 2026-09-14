import { describe, it, expect } from "vitest";
import { eventPartitionsFor } from "./eventPartitions.js";

describe("eventPartitionsFor", () => {
  it("cobre o mês corrente e os seguintes, virando o ano sem quebrar", () => {
    expect(eventPartitionsFor(new Date("2026-12-15T12:00:00Z"), 3)).toEqual([
      { name: "events_y2026m12", from: "2026-12-01", to: "2027-01-01" },
      { name: "events_y2027m01", from: "2027-01-01", to: "2027-02-01" },
      { name: "events_y2027m02", from: "2027-02-01", to: "2027-03-01" },
      { name: "events_y2027m03", from: "2027-03-01", to: "2027-04-01" },
    ]);
  });

  it("usa o mês em UTC, não o fuso local", () => {
    // 23h de 31/01 em UTC ainda é janeiro, mesmo que em Brasília já seja o mês seguinte em outro cenário.
    expect(eventPartitionsFor(new Date("2027-01-31T23:59:59Z"), 0)).toEqual([
      { name: "events_y2027m01", from: "2027-01-01", to: "2027-02-01" },
    ]);
  });

  it("segue o padrão de nome da migration 0000", () => {
    expect(eventPartitionsFor(new Date("2026-09-14T00:00:00Z"), 0)[0]?.name).toBe("events_y2026m09");
  });

  it("recusa horizonte inválido em vez de gerar lista vazia em silêncio", () => {
    expect(() => eventPartitionsFor(new Date(), -1)).toThrow(RangeError);
    expect(() => eventPartitionsFor(new Date(), 1.5)).toThrow(RangeError);
  });
});
