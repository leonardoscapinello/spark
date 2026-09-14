import { describe, expect, it } from "vitest";
import { normalizeTagNames, tagDisplayName, tagSlug } from "./tag.js";

describe("tagSlug", () => {
  it("iguala grafias que são a mesma marcação", () => {
    expect(tagSlug(" VIP ")).toBe("vip");
    expect(tagSlug("Indicação")).toBe(tagSlug("indicacao"));
    expect(tagSlug("Cliente   antigo")).toBe("cliente antigo");
  });

  it("devolve vazio para um nome que é só espaço", () => {
    expect(tagSlug("   ")).toBe("");
  });
});

describe("tagDisplayName", () => {
  it("preserva a grafia e tira só o espaço excedente", () => {
    expect(tagDisplayName("  Indicação   forte ")).toBe("Indicação forte");
  });
});

describe("normalizeTagNames", () => {
  it("mantém a primeira grafia e descarta a repetida", () => {
    expect(normalizeTagNames(["Indicação", "indicacao", "VIP"])).toEqual(["Indicação", "VIP"]);
  });

  it("descarta vazio e espaço", () => {
    expect(normalizeTagNames(["", "   ", "Ativo"])).toEqual(["Ativo"]);
  });

  it("preserva a ordem de entrada", () => {
    expect(normalizeTagNames(["c", "a", "b"])).toEqual(["c", "a", "b"]);
  });

  it("devolve lista vazia para entrada vazia", () => {
    expect(normalizeTagNames([])).toEqual([]);
  });
});
