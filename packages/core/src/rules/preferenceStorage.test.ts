import { describe, expect, it } from "vitest";
import { fromPreferenceStorage, toPreferenceStorage } from "./preferenceStorage.js";
import type { UserPreferenceValue } from "../schema/userPreference.js";

function roundTrip(value: UserPreferenceValue): UserPreferenceValue {
  const stored = toPreferenceStorage(value);
  return fromPreferenceStorage(stored, stored.items);
}

describe("preferenceStorage", () => {
  it("guarda booleano na coluna de booleano", () => {
    const stored = toPreferenceStorage(true);
    expect(stored).toMatchObject({ kind: "boolean", valueBoolean: true, valueText: null, valueNumber: null });
    expect(stored.items).toEqual([]);
  });

  it("guarda número e texto cada um na sua coluna", () => {
    expect(toPreferenceStorage(42)).toMatchObject({ kind: "number", valueNumber: 42 });
    expect(toPreferenceStorage("compacto")).toMatchObject({ kind: "text", valueText: "compacto" });
  });

  it("guarda lista como uma linha por item, na ordem", () => {
    const stored = toPreferenceStorage(["email", "telefone"]);
    expect(stored.kind).toBe("list");
    expect(stored.items.map((item) => [item.sortOrder, item.valueText])).toEqual([[0, "email"], [1, "telefone"]]);
  });

  it("guarda objeto como uma linha por chave, com o tipo de cada valor", () => {
    const stored = toPreferenceStorage({ denso: true, colunas: 3, aba: "abertos" });
    expect(stored.kind).toBe("object");
    expect(stored.items.find((item) => item.itemKey === "denso")?.valueBoolean).toBe(true);
    expect(stored.items.find((item) => item.itemKey === "colunas")?.valueNumber).toBe(3);
    expect(stored.items.find((item) => item.itemKey === "aba")?.valueText).toBe("abertos");
  });

  it("volta igual ao que entrou", () => {
    expect(roundTrip(true)).toBe(true);
    expect(roundTrip(false)).toBe(false);
    expect(roundTrip(7)).toBe(7);
    expect(roundTrip("lista")).toBe("lista");
    expect(roundTrip(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(roundTrip({ denso: true, colunas: 2 })).toEqual({ denso: true, colunas: 2 });
  });

  it("separa lista vazia de objeto vazio", () => {
    expect(roundTrip([])).toEqual([]);
    expect(roundTrip({})).toEqual({});
  });

  it("preserva a ordem da lista mesmo com as linhas embaralhadas", () => {
    const stored = toPreferenceStorage(["um", "dois", "três"]);
    const shuffled = [stored.items[2]!, stored.items[0]!, stored.items[1]!];
    expect(fromPreferenceStorage(stored, shuffled)).toEqual(["um", "dois", "três"]);
  });
});
