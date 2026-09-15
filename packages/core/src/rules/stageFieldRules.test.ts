import { describe, it, expect } from "vitest";
import { evaluateStageFields, stageFieldGaps, stageFieldLabel, stageFieldMessage } from "./stageFieldRules.js";
import type { Deal } from "../schema/deal.js";
import type { StageFieldRule } from "../schema/stageFieldRule.js";
import type { CustomFieldDefinition } from "../schema/customField.js";

const stages = [{ id: "s1", sortOrder: 0 }, { id: "s2", sortOrder: 1 }, { id: "s3", sortOrder: 2 }];
const deal = (over: Partial<Deal> = {}) => ({
  id: "d1", pipelineId: "p1", stageId: "s1", contactId: null, companyId: null, ownerId: null,
  name: "Negócio", amount: 0, status: "open", expectedCloseDate: null, lossReason: null, customFields: {},
  ...over,
} as unknown as Deal);
const rule = (stageId: string, fieldKey: string, level: "required" | "important", pipelineId = "p1") =>
  ({ id: `r-${stageId}-${fieldKey}`, pipelineId, stageId, fieldKey, level } as unknown as StageFieldRule);

describe("campos exigidos por etapa", () => {
  it("bloqueia avançar quando um campo obrigatório do caminho está vazio", () => {
    const result = evaluateStageFields({ deal: deal(), productCount: 0, rules: [rule("s1", "contactId", "required")], stages, targetStageId: "s2" });
    expect(result.blocking.map((issue) => issue.fieldKey)).toEqual(["contactId"]);
  });

  it("deixa avançar quando o campo está preenchido", () => {
    const result = evaluateStageFields({ deal: deal({ contactId: "c1" as Deal["contactId"] }), productCount: 0, rules: [rule("s1", "contactId", "required")], stages, targetStageId: "s2" });
    expect(result.blocking).toEqual([]);
  });

  it("pular etapas não dribla as regras do caminho", () => {
    const result = evaluateStageFields({ deal: deal(), productCount: 0, rules: [rule("s2", "expectedCloseDate", "required")], stages, targetStageId: "s3" });
    expect(result.blocking.map((issue) => issue.fieldKey)).toEqual(["expectedCloseDate"]);
  });

  it("voltar atrás nunca é bloqueado — corrigir engano não pode depender de campo", () => {
    const atThird = deal({ stageId: "s3" as Deal["stageId"] });
    const result = evaluateStageFields({ deal: atThird, productCount: 0, rules: [rule("s1", "contactId", "required")], stages, targetStageId: "s1" });
    expect(result.blocking).toEqual([]);
  });

  it("regra de outro funil não vale neste", () => {
    const result = evaluateStageFields({ deal: deal(), productCount: 0, rules: [rule("s1", "contactId", "required", "outro")], stages, targetStageId: "s2" });
    expect(result.blocking).toEqual([]);
  });

  it("importante sinaliza na etapa atual e nunca bloqueia", () => {
    const result = evaluateStageFields({ deal: deal(), productCount: 0, rules: [rule("s1", "companyId", "important"), rule("s1", "contactId", "required")], stages });
    expect(result.warnings.map((issue) => issue.fieldKey)).toEqual(["companyId"]);
    expect(result.blocking).toEqual([]);
  });

  it("produtos contam como campo — negócio sem item não passa", () => {
    const rules = [rule("s1", "products", "required")];
    expect(evaluateStageFields({ deal: deal(), productCount: 0, rules, stages, targetStageId: "s2" }).blocking).toHaveLength(1);
    expect(evaluateStageFields({ deal: deal(), productCount: 2, rules, stages, targetStageId: "s2" }).blocking).toHaveLength(0);
  });

  it("campo personalizado é lido de customFields", () => {
    const rules = [rule("s1", "custom:plano", "required")];
    expect(evaluateStageFields({ deal: deal(), productCount: 0, rules, stages, targetStageId: "s2" }).blocking).toHaveLength(1);
    expect(evaluateStageFields({ deal: deal({ customFields: { plano: "Pro" } }), productCount: 0, rules, stages, targetStageId: "s2" }).blocking).toHaveLength(0);
  });

  it("escreve o rótulo do campo pelo catálogo da organização", () => {
    const custom = [{ key: "plano", label: "Plano contratado" } as CustomFieldDefinition];
    expect(stageFieldLabel("custom:plano", custom)).toBe("Plano contratado");
    expect(stageFieldLabel("expectedCloseDate", [])).toBe("Previsão de fechamento");
    // Sem a definição, o nome da coluna vira frase: quem lê a tela não sabe o
    // que é `origem_negocio`.
    expect(stageFieldLabel("custom:sumiu", [])).toBe("Sumiu");
    expect(stageFieldLabel("custom:origem_negocio", [])).toBe("Origem negocio");
  });

  it("lista o que falta na etapa atual, de qualquer nível", () => {
    // É a pergunta «o que está faltando AQUI», que não depende de haver
    // destino — diferente de evaluateStageFields, que responde «posso mover?».
    const rules = [
      rule("s1", "contactId", "required"),
      rule("s1", "custom:origem", "important"),
      rule("s1", "ownerId", "important"),
      rule("s2", "expectedCloseDate", "required"),
    ];
    const gaps = stageFieldGaps({ deal: deal({ ownerId: "u1" as Deal["ownerId"] }), productCount: 0, rules });
    expect(gaps.map((issue) => issue.fieldKey)).toEqual(["contactId", "custom:origem"]);
    expect(gaps.map((issue) => issue.level)).toEqual(["required", "important"]);
  });

  it("separa a frase de obrigatório da de importante", () => {
    // Obrigatório impede a mudança de etapa; importante só sinaliza. As duas
    // frases têm de deixar isso claro — é a diferença que o usuário precisa ver.
    expect(stageFieldMessage("required", ["Origem do negócio"], "Proposta enviada"))
      .toBe("Preencha Origem do negócio antes de mover para «Proposta enviada».");
    expect(stageFieldMessage("required", ["Pessoa", "Valor"]))
      .toBe("Preencha estes campos antes de mover: Pessoa, Valor.");
    expect(stageFieldMessage("important", ["Origem do negócio"]))
      .toBe("Origem do negócio é um campo importante desta etapa e está em branco.");
    expect(stageFieldMessage("important", ["Pessoa", "Valor"]))
      .toBe("Campos importantes desta etapa ainda em branco: Pessoa, Valor.");
  });
});
