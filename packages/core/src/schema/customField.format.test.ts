import { describe, it, expect } from "vitest";
import { formatCustomFieldValue, type CustomFieldDefinition, type CustomFieldType } from "./customField.js";

const field = (type: CustomFieldType, options: string[] = []) => ({ type, options, label: "Campo", key: "campo", required: false } as unknown as CustomFieldDefinition);

describe("formatCustomFieldValue", () => {
  it("formata cada tipo no caminho feliz", () => {
    expect(formatCustomFieldValue(field("text"), "Contrato")).toBe("Contrato");
    expect(formatCustomFieldValue(field("number"), 1500.5)).toBe("1.500,5");
    expect(formatCustomFieldValue(field("date"), "2026-09-14")).toBe("14/09/2026");
    expect(formatCustomFieldValue(field("single_select", ["A"]), "A")).toBe("A");
    expect(formatCustomFieldValue(field("multi_select", ["A", "B"]), ["A", "B"])).toBe("A, B");
  });

  it("exibe booleano nos dois estados — false não é ausência de valor", () => {
    expect(formatCustomFieldValue(field("boolean"), true)).toBe("Sim");
    expect(formatCustomFieldValue(field("boolean"), false)).toBe("Não");
  });

  it("trata ausência de valor como vazio", () => {
    for (const empty of [null, undefined, ""]) expect(formatCustomFieldValue(field("text"), empty)).toBe("");
  });

  it("não desloca o dia civil por fuso", () => {
    // new Date("2026-01-01") é meia-noite UTC; em Brasília isso seria 31/12.
    expect(formatCustomFieldValue(field("date"), "2026-01-01")).toBe("01/01/2026");
  });

  it("mostra valor fora do formato em vez de quebrar", () => {
    expect(formatCustomFieldValue(field("date"), "ontem")).toBe("ontem");
    expect(formatCustomFieldValue(field("number"), "n/d")).toBe("n/d");
    expect(formatCustomFieldValue(field("multi_select"), "A")).toBe("A");
  });
});
