import { describe, it, expect } from "vitest";
import { compatibleTargets, convertCustomFieldValue, customFieldAccepts } from "./customFieldMapping.js";
import type { CustomFieldDefinition, CustomFieldType } from "../schema/customField.js";

const field = (id: string, type: CustomFieldType, archived = false) =>
  ({ id, type, label: id, key: id, options: [], required: false, archivedAt: archived ? "2026-01-01T00:00:00.000Z" : null } as unknown as CustomFieldDefinition);

describe("compatibilidade entre campos personalizados", () => {
  it("aceita o mesmo tipo e recusa o que não cabe", () => {
    expect(customFieldAccepts("number", "number")).toBe(true);
    expect(customFieldAccepts("number", "text")).toBe(false);
    expect(customFieldAccepts("text", "number")).toBe(true);
    expect(customFieldAccepts("phone", "text")).toBe(false);
  });

  it("oferece só destinos possíveis, sem o próprio campo nem arquivados", () => {
    const source = field("origem", "number");
    const targets = compatibleTargets(source, [source, field("texto", "text"), field("moeda", "currency"), field("telefone", "phone"), field("velho", "number", true)]);
    expect(targets.map((item) => item.id)).toEqual(["texto", "moeda"]);
  });

  it("converte entre tipos que se encaixam", () => {
    expect(convertCustomFieldValue("text", "number", 12)).toBe("12");
    expect(convertCustomFieldValue("currency", "number", 99.9)).toBe(9990);
    expect(convertCustomFieldValue("number", "currency", 9990)).toBe(99.9);
    expect(convertCustomFieldValue("datetime", "date", "2026-09-14")).toBe("2026-09-14T12:00:00.000Z");
    expect(convertCustomFieldValue("date", "datetime", "2026-09-14T15:30:00.000Z")).toBe("2026-09-14");
    expect(convertCustomFieldValue("multi_select", "single_select", "Pro")).toEqual(["Pro"]);
    expect(convertCustomFieldValue("text", "multi_select", ["a", "b"])).toBe("a, b");
  });

  it("não copia o que não sobrevive à conversão", () => {
    expect(convertCustomFieldValue("number", "text", "abc")).toBeNull();
    expect(convertCustomFieldValue("text", "number", null)).toBeNull();
    expect(convertCustomFieldValue("single_select", "multi_select", [])).toBeNull();
  });

  it("valor vazio nunca vira valor no destino", () => {
    expect(convertCustomFieldValue("text", "text", "")).toBeNull();
    expect(convertCustomFieldValue("boolean", "boolean", false)).toBe(false);
  });
});
