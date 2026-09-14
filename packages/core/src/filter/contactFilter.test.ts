import { describe, it, expect } from "vitest";
import { contactMatchesFilter, contactMatchesFilters, filterOperatorLabel, filterOperatorNeedsValue, operatorsForFilterType, FILTER_OPERATORS, FILTER_VALUE_TYPES, type ContactFilter } from "./contactFilter.js";
import { decodeContactFilters, encodeContactFilters } from "./filterUrl.js";
import type { Contact } from "../schema/contact.js";

const base = {
  name: "Ana", email: "ana@vega.com", phone: null, leadStatus: "qualified", source: "site",
  ownerId: "user-1", companyId: null, score: 70, tags: ["vip", "sul"],
  customFields: { plano: "Premium", renovacao: "2026-03-10", assentos: 12 },
  createdAt: "2026-02-01T10:00:00.000Z", updatedAt: "2026-02-01T10:00:00.000Z", deletedAt: null,
} as unknown as Contact;

const f = (field: string, operator: string, value: string | null = null) => ({ field, operator, value } as ContactFilter);

describe("contactMatchesFilter", () => {
  it("compara igualdade em campo simples e em campo personalizado", () => {
    expect(contactMatchesFilter(base, f("leadStatus", "is", "qualified"))).toBe(true);
    expect(contactMatchesFilter(base, f("leadStatus", "is", "new"))).toBe(false);
    expect(contactMatchesFilter(base, f("custom:plano", "is", "Premium"))).toBe(true);
    expect(contactMatchesFilter(base, f("leadStatus", "is_not", "new"))).toBe(true);
  });

  it("trata lista como pertencimento, não como texto", () => {
    expect(contactMatchesFilter(base, f("tags", "is", "vip"))).toBe(true);
    expect(contactMatchesFilter(base, f("tags", "is", "norte"))).toBe(false);
    expect(contactMatchesFilter(base, f("tags", "is_not", "norte"))).toBe(true);
  });

  it("decide vazio por ausência real, incluindo lista vazia", () => {
    expect(contactMatchesFilter(base, f("companyId", "is_empty"))).toBe(true);
    expect(contactMatchesFilter(base, f("ownerId", "is_empty"))).toBe(false);
    expect(contactMatchesFilter(base, f("ownerId", "is_not_empty"))).toBe(true);
    const semTags = { ...base, tags: [] } as Contact;
    expect(contactMatchesFilter(semTags, f("tags", "is_empty"))).toBe(true);
  });

  it("filtro pela metade é inerte — não zera a lista enquanto está sendo montado", () => {
    expect(contactMatchesFilter(base, f("leadStatus", "is", null))).toBe(true);
    expect(contactMatchesFilter(base, f("leadStatus", "is", ""))).toBe(true);
  });

  it("ordena número como número e data como texto ISO", () => {
    expect(contactMatchesFilter(base, f("score", "gt", "50"))).toBe(true);
    expect(contactMatchesFilter(base, f("score", "lt", "50"))).toBe(false);
    expect(contactMatchesFilter(base, f("createdAt", "after", "2026-01-01"))).toBe(true);
    expect(contactMatchesFilter(base, f("createdAt", "before", "2026-01-01"))).toBe(false);
    expect(contactMatchesFilter(base, f("custom:assentos", "gt", "10"))).toBe(true);
  });

  it("comparação de ordem em campo vazio é falsa, nos dois sentidos", () => {
    expect(contactMatchesFilter(base, f("companyId", "gt", "0"))).toBe(false);
    expect(contactMatchesFilter(base, f("companyId", "lt", "9"))).toBe(false);
  });

  it("contains ignora caixa e acento não some do texto", () => {
    expect(contactMatchesFilter(base, f("custom:plano", "contains", "prem"))).toBe(true);
    expect(contactMatchesFilter(base, f("custom:plano", "contains", "basico"))).toBe(false);
  });

  it("todas as condições precisam passar", () => {
    expect(contactMatchesFilters(base, [f("leadStatus", "is", "qualified"), f("score", "gt", "50")])).toBe(true);
    expect(contactMatchesFilters(base, [f("leadStatus", "is", "qualified"), f("score", "gt", "90")])).toBe(false);
    expect(contactMatchesFilters(base, [])).toBe(true);
  });
});

describe("ida e volta pela URL", () => {
  it("preserva as condições", () => {
    const filters = [f("leadStatus", "is", "qualified"), f("custom:plano", "contains", "Prem"), f("companyId", "is_empty")];
    expect(decodeContactFilters(encodeContactFilters(filters))).toEqual(filters);
  });

  it("sobrevive a valor com os separadores dentro", () => {
    const filters = [f("custom:obs", "contains", "a;b:c")];
    expect(decodeContactFilters(encodeContactFilters(filters))).toEqual(filters);
  });

  it("descarta condição corrompida em vez de quebrar a tela", () => {
    expect(decodeContactFilters("leadStatus:operador_que_nao_existe:x")).toEqual([]);
    expect(decodeContactFilters("lixo")).toEqual([]);
    expect(decodeContactFilters("")).toEqual([]);
    expect(decodeContactFilters(null)).toEqual([]);
    expect(decodeContactFilters("leadStatus:is:new;quebrado")).toEqual([f("leadStatus", "is", "new")]);
  });
});

describe("operadores por tipo de campo", () => {
  it("só oferece o que o motor sabe decidir", () => {
    expect(operatorsForFilterType("date")).not.toContain("contains");
    expect(operatorsForFilterType("number")).toContain("gt");
    expect(operatorsForFilterType("text")).toContain("contains");
    expect(operatorsForFilterType("select")).not.toContain("contains");
  });

  it("todo tipo oferece decidir por vazio, e esses não pedem valor", () => {
    for (const type of FILTER_VALUE_TYPES) {
      expect(operatorsForFilterType(type)).toContain("is_empty");
      expect(operatorsForFilterType(type)).toContain("is_not_empty");
    }
    expect(filterOperatorNeedsValue("is_empty")).toBe(false);
    expect(filterOperatorNeedsValue("is")).toBe(true);
  });

  it("todo operador tem rótulo em português", () => {
    for (const operator of FILTER_OPERATORS) expect(filterOperatorLabel(operator)).toMatch(/\S/);
  });
});
