import type { ServiceCycle, ServiceSegment } from "../schema/serviceCycle.js";
import type { BusinessHour, Holiday } from "../schema/stageWorkflow.js";
import { operatingMillisecondsBetween } from "../rules/stageWorkflow.js";
export function serviceCycleProgress(cycle: ServiceCycle, segments: readonly ServiceSegment[], hours: readonly BusinessHour[], holidays: readonly Holiday[], now: Date) {
  const relevant = segments.filter(s => s.cycleId === cycle.id);
  const current = relevant.find(s => !s.endedAt);
  const elapsed = (s: ServiceSegment) => s.endedAt ? s.elapsedMs : operatingMillisecondsBetween(new Date(s.startedAt), now, hours, holidays);
  const stateFor = (percent: number) => percent >= 100 ? "breached" as const : percent >= cycle.warningPercent ? "due_soon" as const : "on_track" as const;
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
