import { describe, it, expect } from "vitest";
import { fromCustomFieldRows, isMultiValued, toCustomFieldRows } from "./customFieldStorage.js";
import type { CustomFieldType } from "../schema/customField.js";

const field = (type: CustomFieldType) => ({ type });
const options = new Map([["Pro", "opt-pro"], ["Básico", "opt-basico"]]);
const byValue = (value: string) => options.get(value);
const byId = (id: string) => [...options].find(([, optionId]) => optionId === id)?.[0];

describe("valor de campo personalizado ↔ colunas do banco", () => {
  it("cada tipo ocupa a sua coluna", () => {
    expect(toCustomFieldRows(field("text"), "Diretor", byValue)).toEqual([{ valueText: "Diretor" }]);
    expect(toCustomFieldRows(field("number"), 12, byValue)).toEqual([{ valueNumber: 12 }]);
    expect(toCustomFieldRows(field("currency"), 123456, byValue)).toEqual([{ valueMoney: 123456 }]);
    expect(toCustomFieldRows(field("boolean"), true, byValue)).toEqual([{ valueBoolean: true }]);
    expect(toCustomFieldRows(field("date"), "2026-09-14", byValue)).toEqual([{ valueDate: "2026-09-14" }]);
    expect(toCustomFieldRows(field("datetime"), "2026-09-14T15:30:00.000Z", byValue)).toEqual([{ valueTimestamp: "2026-09-14T15:30:00.000Z" }]);
    expect(toCustomFieldRows(field("single_select"), "Pro", byValue)).toEqual([{ optionId: "opt-pro" }]);
  });

  it("seleção múltipla vira uma linha por opção", () => {
    expect(isMultiValued("multi_select")).toBe(true);
    expect(toCustomFieldRows(field("multi_select"), ["Pro", "Básico"], byValue)).toEqual([{ optionId: "opt-pro" }, { optionId: "opt-basico" }]);
  });

  it("valor ausente não grava linha nenhuma", () => {
    for (const empty of [null, undefined, ""]) expect(toCustomFieldRows(field("text"), empty, byValue)).toEqual([]);
    expect(toCustomFieldRows(field("multi_select"), [], byValue)).toEqual([]);
  });

  it("opção que não existe mais é descartada, não vira referência quebrada", () => {
    expect(toCustomFieldRows(field("single_select"), "Sumiu", byValue)).toEqual([]);
    expect(toCustomFieldRows(field("multi_select"), ["Pro", "Sumiu"], byValue)).toEqual([{ optionId: "opt-pro" }]);
  });

  it("valor que não é do tipo do campo não é gravado", () => {
    expect(toCustomFieldRows(field("number"), "abc", byValue)).toEqual([]);
    expect(toCustomFieldRows(field("currency"), 99.9, byValue)).toEqual([]);
  });

  it("volta do banco como o valor que a aplicação usa", () => {
    expect(fromCustomFieldRows(field("text"), [{ valueText: "Diretor" }], byId)).toBe("Diretor");
    expect(fromCustomFieldRows(field("currency"), [{ valueMoney: 123456 }], byId)).toBe(123456);
    expect(fromCustomFieldRows(field("boolean"), [{ valueBoolean: false }], byId)).toBe(false);
    expect(fromCustomFieldRows(field("single_select"), [{ optionId: "opt-pro" }], byId)).toBe("Pro");
    expect(fromCustomFieldRows(field("multi_select"), [{ optionId: "opt-pro" }, { optionId: "opt-basico" }], byId)).toEqual(["Pro", "Básico"]);
  });

  it("sem linha, o campo está vazio", () => {
    expect(fromCustomFieldRows(field("text"), [], byId)).toBeNull();
    expect(fromCustomFieldRows(field("multi_select"), [], byId)).toBeNull();
  });

  it("ida e volta preserva o valor", () => {
    for (const [type, value] of [["text", "Diretor"], ["number", 42], ["currency", 9990], ["boolean", true], ["date", "2026-01-31"], ["single_select", "Pro"]] as const) {
      const rows = toCustomFieldRows(field(type), value, byValue);
      expect(fromCustomFieldRows(field(type), rows, byId)).toEqual(value);
    }
  });
});
