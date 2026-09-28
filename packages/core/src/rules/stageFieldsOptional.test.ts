import { describe, expect, it } from "vitest";
import { DealSchema } from "../schema/deal.js";
import { StageFieldRuleSchema } from "../schema/stageFieldRule.js";
import { evaluateStageFields, stageFieldGaps } from "./stageFieldRules.js";
const uuid = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, "0")}`;
const deal = DealSchema.parse({ id: uuid(1), orgId: uuid(2), pipelineId: uuid(3), stageId: uuid(4), contactId: null, companyId: null, ownerId: null, name: "Teste", amount: 100, expectedCloseDate: null, lossReason: null, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", deletedAt: null });
const rule = (pipelineId: string, stageId: string, level: "optional" | "important" | "required") => StageFieldRuleSchema.parse({ id: uuid(8), orgId: deal.orgId, pipelineId, stageId, level, fieldKey: "custom:orcamento", createdAt: deal.createdAt, updatedAt: deal.updatedAt });
describe("campos reutilizados por pipeline e etapa", () => {
  it("campo opcional aparece na configuração sem gerar pendência ou bloquear", () => {
    const rules = [rule(deal.pipelineId, deal.stageId, "optional")];
    expect(stageFieldGaps({ deal, productCount: 0, rules })).toEqual([]);
    expect(evaluateStageFields({ deal, productCount: 0, rules, stages: [{ id: deal.stageId, sortOrder: 0 }, { id: uuid(5), sortOrder: 1 }], targetStageId: uuid(5) })).toEqual({ blocking: [], warnings: [] });
  });
  it("o mesmo campo pode ser obrigatório em outro pipeline sem afetar o atual", () => {
    const rules = [rule(uuid(9), deal.stageId, "required"), rule(deal.pipelineId, deal.stageId, "important")];
    const result = evaluateStageFields({ deal, productCount: 0, rules, stages: [{ id: deal.stageId, sortOrder: 0 }, { id: uuid(5), sortOrder: 1 }], targetStageId: uuid(5) });
    expect(result.blocking).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });
});
