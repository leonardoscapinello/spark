import { describe, expect, it } from "vitest";
import { customFieldDefinitionId } from "../identity/index.js";
import { deriveCustomFieldKey } from "./customFieldKey.js";

describe("deriveCustomFieldKey", () => {
  it("gera uma chave legível, válida e única sem entrada técnica do usuário", () => {
    const first = deriveCustomFieldKey("Número de funcionários", customFieldDefinitionId.from("01900000-0000-7000-8000-000000000001"));
    const second = deriveCustomFieldKey("Número de funcionários", customFieldDefinitionId.from("01900000-0000-7000-8000-000000000002"));
    expect(first).toBe("numero_de_funcionarios_000000000001");
    expect(second).toBe("numero_de_funcionarios_000000000002");
    expect(first).toMatch(/^[a-z][a-z0-9_]{0,62}$/);
  });

  it("trata nomes começados por número e respeita o limite do banco", () => {
    const key = deriveCustomFieldKey("2027 — previsão comercial extremamente detalhada para a organização", customFieldDefinitionId.from("01900000-0000-7000-8000-000000000001"));
    expect(key.startsWith("campo_2027_previsao_comercial")).toBe(true);
    expect(key.length).toBeLessThanOrEqual(63);
  });
});
