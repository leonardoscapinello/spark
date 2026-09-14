import { describe, it, expect } from "vitest";
import { formatCustomFieldValue, normalizeCustomFieldValue, type CustomFieldDefinition, type CustomFieldType } from "./customField.js";

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

describe("tipos trazidos do Pipedrive", () => {
  const def = (type: CustomFieldType) => field(type);

  it("moeda guarda centavos inteiros e exibe em reais", () => {
    expect(normalizeCustomFieldValue(def("currency"), "1.234,56")).toBe(123456);
    expect(normalizeCustomFieldValue(def("currency"), 99.9)).toBe(9990);
    // espaço fino não separável entre "R$" e o número — comparação por conteúdo, não por byte
    expect(formatCustomFieldValue(def("currency"), 123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
  });

  it("data e hora guarda ISO e exibe no fuso de quem lê", () => {
    const stored = normalizeCustomFieldValue(def("datetime"), "2026-09-14T15:30:00.000Z");
    expect(stored).toBe("2026-09-14T15:30:00.000Z");
    expect(formatCustomFieldValue(def("datetime"), stored)).toMatch(/14\/09\/2026/);
  });

  it("telefone segue a mesma regra do telefone da pessoa", () => {
    expect(normalizeCustomFieldValue(def("phone"), "(11) 91234-5678")).toBe("+5511912345678");
    expect(() => normalizeCustomFieldValue(def("phone"), "abc")).toThrow(/telefone/i);
  });

  it("endereço web completa o esquema e recusa o que não é endereço", () => {
    expect(normalizeCustomFieldValue(def("url"), "acme.com.br")).toBe("https://acme.com.br");
    expect(normalizeCustomFieldValue(def("url"), "http://acme.com.br/planos")).toBe("http://acme.com.br/planos");
    expect(() => normalizeCustomFieldValue(def("url"), "sem-ponto")).toThrow(/endereço web/i);
  });

  it("texto longo se comporta como texto, aparado", () => {
    expect(normalizeCustomFieldValue(def("paragraph"), "  duas linhas\n  ")).toBe("duas linhas");
  });

  it("moeda e data e hora inválidas recusam com o rótulo do campo", () => {
    expect(() => normalizeCustomFieldValue(def("currency"), "abc")).toThrow(/Campo precisa ser um valor/);
    expect(() => normalizeCustomFieldValue(def("datetime"), "ontem")).toThrow(/Campo precisa ser uma data e hora/);
  });
});
