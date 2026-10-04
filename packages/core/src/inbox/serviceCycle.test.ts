import { describe, expect, it } from "vitest";
import { ServiceCycleSchema, ServiceSegmentSchema } from "../schema/serviceCycle.js";
import { BusinessHourSchema } from "../schema/stageWorkflow.js";
import { serviceCycleProgress } from "./serviceCycle.js";
import { resolveServiceClassification } from "./serviceConfiguration.js";
import { ServiceStatusSchema } from "../schema/serviceConfiguration.js";
const id = (n:number) => `00000000-0000-7000-8000-${String(n).padStart(12,"0")}`;
const base = { orgId:id(90),createdAt:"2026-10-05T09:00:00Z",updatedAt:"2026-10-05T09:00:00Z" };
const hour = BusinessHourSchema.parse({ ...base,id:id(1),weekday:1,enabled:true,startTime:"09:00",endTime:"18:00",breakStartTime:"12:00",breakEndTime:"13:00",timeZone:"UTC" });
const cycle = ServiceCycleSchema.parse({ ...base,id:id(2),conversationId:id(3),policyId:id(4),policyName:"Geral",policyVersion:1,firstResponseMinutes:60,totalMinutes:480,warningPercent:80,openedAt:"2026-10-05T09:00:00Z",closedAt:null,firstInboundAt:"2026-10-05T09:00:00Z",firstRespondedAt:null });
const segment = ServiceSegmentSchema.parse({ ...base,id:id(5),conversationId:id(3),cycleId:id(2),statusId:id(6),statusName:"Ativo",startedAt:"2026-10-05T09:00:00Z",endedAt:null,firstCounting:true,totalCounting:true,budgetMinutes:240,elapsedMs:0 });
describe("ciclos e cronômetros", () => {
  it("conta expediente descontando almoço e mantém prazo vencido", () => {
    const p=serviceCycleProgress(cycle,[segment],[hour],[],new Date("2026-10-05T14:00:00Z"));
    expect(p.total.usedMs).toBe(4*3600000); expect(p.first.state).toBe("breached"); expect(p.first.overtimeMinutes).toBe(180);
  });
  it("retoma o saldo e acumula todas as passagens pelo status", () => {
    const before={...segment,endedAt:"2026-10-05T11:00:00Z",elapsedMs:7200000};
    const waiting={...segment,id:id(7),statusId:id(8),startedAt:"2026-10-05T11:00:00Z",endedAt:"2026-10-05T14:00:00Z",elapsedMs:7200000,firstCounting:false,totalCounting:false};
    const resumed={...segment,id:id(9),startedAt:"2026-10-05T14:00:00Z"};
    const p=serviceCycleProgress(cycle,[before,waiting,resumed],[hour],[],new Date("2026-10-05T15:00:00Z"));
    expect(p.total.usedMs).toBe(10800000); expect(p.total.remainingMinutes).toBe(300); expect(p.currentStatus?.usedMs).toBe(10800000);
  });
  it("conclui primeira resposta sem interromper o prazo total", () => {
    const before={...segment,endedAt:"2026-10-05T09:30:00Z",elapsedMs:1800000};
    const after={...segment,id:id(7),startedAt:"2026-10-05T09:30:00Z",firstCounting:false};
    const p=serviceCycleProgress({...cycle,firstRespondedAt:"2026-10-05T09:30:00Z"},[before,after],[hour],[],new Date("2026-10-05T11:00:00Z"));
    expect(p.first.usedMs).toBe(1800000); expect(p.first.finished).toBe(true); expect(p.total.usedMs).toBe(7200000);
  });
  it("novo ciclo não reaproveita os segmentos do anterior e ausência de calendário é explícita", () => {
    const p=serviceCycleProgress({...cycle,id:id(10)},[segment],[],[],new Date("2026-10-05T11:00:00Z"));
    expect(p.total.usedMs).toBe(0); expect(p.total.calendarMissing).toBe(true);
  });
  it("aguardar fornecedor só retoma com mensagem se estiver configurado", () => {
    const status=ServiceStatusSchema.parse({...base,id:id(6),name:"Fornecedor",sortOrder:0,archived:false,color:"neutral",operationalType:"waiting",pauseFirstResponse:true,pauseTotal:true,resumeOnInbound:false,budgetMinutes:null});
    const current={status:"snoozed",serviceStatusId:status.id,categoryId:null,impactId:null,urgencyId:null};
    const config={categories:[],policies:[],matrix:[],levels:[],statuses:[status]};
    expect(resolveServiceClassification(current,{},config,true).status).toBe("snoozed");
    expect(resolveServiceClassification(current,{}, {...config,statuses:[{...status,resumeOnInbound:true}]},true).status).toBe("open");
  });
});
