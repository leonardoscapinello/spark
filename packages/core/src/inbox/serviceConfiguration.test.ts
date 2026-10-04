import { describe, expect, it } from "vitest";
import { serviceCategoryPath, selectServiceSla, servicePriority, validateServiceConfiguration } from "./serviceConfiguration.js";
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
