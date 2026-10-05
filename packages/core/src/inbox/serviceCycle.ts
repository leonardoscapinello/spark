import type { ServiceCycle, ServiceSegment } from "../schema/serviceCycle.js";
import type { BusinessHour, Holiday } from "../schema/stageWorkflow.js";
import { operatingMillisecondsBetween } from "../rules/stageWorkflow.js";
/**
 * Faixa do prazo pelo quanto já foi consumido (o anel mostra o que resta):
 * resta mais da metade → no prazo; ≤ 50% → atenção; ≤ 25% → em risco;
 * ≤ 10% → crítico; acabou → vencido. A mesma escala para todo relógio de atendimento.
 */
export type ServiceSlaState = "on_track" | "due_soon" | "at_risk" | "critical" | "breached";
export function serviceSlaState(percentUsed: number): ServiceSlaState {
  if (percentUsed >= 100) return "breached";
  if (percentUsed >= 90) return "critical";
  if (percentUsed >= 75) return "at_risk";
  if (percentUsed >= 50) return "due_soon";
  return "on_track";
}

export function serviceCycleProgress(cycle: ServiceCycle, segments: readonly ServiceSegment[], hours: readonly BusinessHour[], holidays: readonly Holiday[], now: Date) {
  const relevant = segments.filter(s => s.cycleId === cycle.id);
  const current = relevant.find(s => !s.endedAt);
  const elapsed = (s: ServiceSegment) => s.endedAt ? s.elapsedMs : operatingMillisecondsBetween(new Date(s.startedAt), now, hours, holidays);
  const stateFor = serviceSlaState;
  const measure = (kind: "first" | "total", budget: number | null) => {
    const usedMs = relevant.reduce((sum, s) => sum + ((kind === "first" ? s.firstCounting : s.totalCounting) ? elapsed(s) : 0), 0);
    const waiting = kind === "first" && cycle.firstInboundAt === null;
    const finished = kind === "first" ? cycle.firstRespondedAt !== null : cycle.closedAt !== null;
    const percent = budget ? usedMs / (budget * 60_000) * 100 : 0;
    return { usedMs, budget, percent, outsideHours: operatingMillisecondsBetween(now, new Date(now.getTime()+60_000), hours, holidays) === 0, remainingMinutes: budget === null ? null : Math.max(0, Math.ceil(budget - usedMs / 60_000)), overtimeMinutes: budget === null ? 0 : Math.max(0, Math.floor(usedMs / 60_000 - budget)), waiting, finished, paused: !finished && !waiting && Boolean(current && !(kind === "first" ? current.firstCounting : current.totalCounting)), calendarMissing: !hours.some(h => h.enabled), state: stateFor(percent) };
  };
  const statusUsedMs = current ? relevant.filter(s => s.statusId === current.statusId).reduce((sum, s) => sum + elapsed(s), 0) : 0;
  return { first: measure("first", cycle.firstResponseMinutes), total: measure("total", cycle.totalMinutes), currentStatus: current ? { name: current.statusName, usedMs: statusUsedMs, budget: current.budgetMinutes, state: stateFor(current.budgetMinutes ? statusUsedMs / (current.budgetMinutes * 60000) * 100 : 0) } : null };
}

export type ServiceLifecycleEvent = "open" | "update" | "inbound" | "response";

/** Minutos úteis em leitura humana: "45 min", "3 h", "2 h 20 min". */
export function formatServiceDuration(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  return hours ? `${hours} h${remainder ? ` ${remainder} min` : ""}` : `${remainder} min`;
}
