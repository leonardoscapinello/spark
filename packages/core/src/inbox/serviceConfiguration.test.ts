import { describe, expect, it } from "vitest";
import { serviceCategoryPath, selectServiceSla, servicePriority, resolveServiceClassification, validateServiceConfiguration } from "./serviceConfiguration.js";
import { ServiceCategorySchema, SlaPolicySchema, ServiceLevelSchema, PriorityMatrixSchema } from "../schema/serviceConfiguration.js";
const id = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, "0")}`;
const base = { orgId: id(90), createdAt: "2026-10-04T12:00:00Z", updatedAt: "2026-10-04T12:00:00Z", sortOrder: 0, archived: false };
const categories = [1, 2, 3].map(n => ServiceCategorySchema.parse({ ...base, id: id(n), name: `N${n}`, parentId: n === 1 ? null : id(n - 1) }));
const policy = (n: number, categoryId: string | null, priorityId: string | null) => SlaPolicySchema.parse({ ...base, id: id(n), name: String(n), categoryId, priorityId, firstResponseMinutes: 60, totalMinutes: 480, warningPercent: 80, version: 1 });
const priorities = [10, 11].map(n => ServiceLevelSchema.parse({ ...base, id: id(n), name: String(n), kind: "priority", color: "neutral" }));
describe("políticas de atendimento", () => {
  it("busca os oito escopos na ordem de profundidade e prioridade", () => {
    const policies = [policy(20,id(3),id(10)),policy(21,id(3),null),policy(22,id(2),id(10)),policy(23,id(2),null),policy(24,id(1),id(10)),policy(25,id(1),null),policy(26,null,id(10)),policy(27,null,null)];
    for (let n=0;n<8;n++) expect(selectServiceSla(id(3),id(10),{ categories, policies: policies.slice(n) })?.id).toBe(id(20+n));
    expect(selectServiceSla(id(3),id(11),{ categories, policies })?.id).toBe(id(21));
    expect(selectServiceSla(id(1),null,{ categories, policies })?.id).toBe(id(25));
    expect(selectServiceSla(null,null,{ categories, policies: [] })).toBeNull();
  });
  it("recusa ciclos e quarto nível", () => {
    expect(() => serviceCategoryPath(id(1),[{ ...categories[0]!, parentId: id(1) }])).toThrow();
    expect(() => serviceCategoryPath(id(4),[...categories,{ ...categories[0]!, id:id(4),parentId:id(3) }])).toThrow();
  });
  it("recusa política duplicada e categoria arquivada", () => {
    const config = { categories, statuses: [], levels: priorities, matrix: [], policies: [policy(20,null,null),policy(21,null,null)] };
    expect(() => validateServiceConfiguration(config)).toThrow("Já existe");
    expect(() => validateServiceConfiguration({ ...config, policies: [], categories: categories.map(c => ({ ...c, archived: c.id === id(1) })) })).toThrow("filhas");
  });
  it("calcula prioridade apenas com par configurado e níveis ativos", () => {
    const levels = [...priorities, ServiceLevelSchema.parse({ ...base,id:id(40),name:"Impacto",kind:"impact",color:"neutral" }),ServiceLevelSchema.parse({ ...base,id:id(41),name:"Urgência",kind:"urgency",color:"neutral" })];
    const matrix = [PriorityMatrixSchema.parse({ ...base,id:id(50),impactId:id(40),urgencyId:id(41),priorityId:id(10) })];
    expect(servicePriority(id(40),id(41),{ levels,matrix })).toBe(id(10));
    expect(servicePriority(null,id(41),{ levels,matrix })).toBeNull();
    expect(servicePriority(id(40),id(41),{ levels:levels.map(l=>({...l,archived:l.id===id(10)})),matrix })).toBeNull();
  });
});

describe("classificação padrão por categoria", () => {
  const impact = ServiceLevelSchema.parse({ ...base, id:id(40),name:"Impacto",kind:"impact",color:"neutral" });
  const urgency = ServiceLevelSchema.parse({ ...base, id:id(41),name:"Urgência",kind:"urgency",color:"neutral" });
  const config = {
    categories: categories.map(c => ({ ...c, defaultImpactId: impact.id, defaultUrgencyId: urgency.id })),
    levels: [...priorities, impact, urgency], statuses: [],
    matrix: [PriorityMatrixSchema.parse({ ...base,id:id(50),impactId:impact.id,urgencyId:urgency.id,priorityId:id(10) })],
    policies: [policy(20,id(3),id(10)),policy(21,null,null)],
  };
  const current = { status:"open",serviceStatusId:null,categoryId:null,impactId:null,urgencyId:null };
  it("aplica o padrão de qualquer nível e conecta prioridade à política de SLA", () => {
    for (const category of config.categories) {
      const result=resolveServiceClassification(current,{categoryId:category.id},config);
      expect(result.impactId).toBe(impact.id);expect(result.urgencyId).toBe(urgency.id);expect(result.servicePriorityId).toBe(id(10));
      expect(selectServiceSla(result.categoryId,result.servicePriorityId,config)?.id).toBe(category.id===id(3)?id(20):id(21));
    }
  });
  it("categoria sem padrão limpa a classificação anterior e não herda dos pais", () => {
    const configured={...config,categories:config.categories.map(c=>c.id===id(3)?{...c,defaultImpactId:null,defaultUrgencyId:null}:c)};
    const previous={...current,categoryId:id(2),impactId:impact.id,urgencyId:urgency.id};
    for (const categoryId of [id(3),null]) {
      const result=resolveServiceClassification(previous,{categoryId},configured);
      expect(result.impactId).toBeNull();expect(result.urgencyId).toBeNull();expect(result.servicePriorityId).toBeNull();
    }
  });
  it("permite padrão parcial e ajuste explícito, sem reaplicar em troca de status", () => {
    const partial={...config,categories:config.categories.map(c=>({...c,defaultUrgencyId:null}))};
    const result=resolveServiceClassification(current,{categoryId:id(1)},partial);
    expect(result.impactId).toBe(impact.id);expect(result.urgencyId).toBeNull();expect(result.servicePriorityId).toBeNull();
    const overridden=resolveServiceClassification(current,{categoryId:id(1),impactId:null},config);
    expect(overridden.impactId).toBeNull();expect(overridden.urgencyId).toBe(urgency.id);
    const manual={...current,categoryId:id(1),impactId:null,urgencyId:urgency.id};
    expect(resolveServiceClassification(manual,{status:"snoozed"},config).impactId).toBeNull();
    expect(resolveServiceClassification(manual,{categoryId:id(1)},config).impactId).toBeNull();
  });
  it("recusa padrão com dimensão errada, nível desabilitado ou referência ausente", () => {
    for (const defaultImpactId of [urgency.id,id(99)]) expect(()=>validateServiceConfiguration({...config,categories:config.categories.map(c=>({...c,defaultImpactId}))})).toThrow("padrões da categoria");
    const disabled={...config,levels:config.levels.map(l=>({...l,archived:l.id===impact.id}))};
    expect(()=>validateServiceConfiguration(disabled)).toThrow("padrões da categoria");
    expect(()=>resolveServiceClassification(current,{categoryId:id(1)},disabled)).toThrow("nível ativo");
  });
});
