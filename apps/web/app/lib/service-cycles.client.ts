import { useMemo } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { serviceCycleProgress } from "@spark/core";
import { createServiceCyclesCollection, createServiceSegmentsCollection, createServiceCycleHoursCollection, createServiceCycleHolidaysCollection } from "@spark/data";
let serviceCycles: ReturnType<typeof createServiceCyclesCollection> | undefined;
export function getServiceCyclesCollection() { return serviceCycles ??= createServiceCyclesCollection(); }
let serviceSegments: ReturnType<typeof createServiceSegmentsCollection> | undefined;
export function getServiceSegmentsCollection() { return serviceSegments ??= createServiceSegmentsCollection(); }
let serviceCycleHours: ReturnType<typeof createServiceCycleHoursCollection> | undefined;
export function getServiceCycleHoursCollection() { return serviceCycleHours ??= createServiceCycleHoursCollection(); }
let serviceCycleHolidays: ReturnType<typeof createServiceCycleHolidaysCollection> | undefined;
export function getServiceCycleHolidaysCollection() { return serviceCycleHolidays ??= createServiceCycleHolidaysCollection(); }
export function useConversationSlaSummaries(now: Date) {
  const { data: cycles = [] } = useLiveQuery({ query: q => q.from({ row: getServiceCyclesCollection() }) });
  const { data: segments = [] } = useLiveQuery({ query: q => q.from({ row: getServiceSegmentsCollection() }) });
  const { data: hours = [] } = useLiveQuery({ query: q => q.from({ row: getServiceCycleHoursCollection() }) });
  const { data: holidays = [] } = useLiveQuery({ query: q => q.from({ row: getServiceCycleHolidaysCollection() }) });
  return useMemo(() => {
    const group = <T extends { cycleId: string }>(rows: readonly T[]) => { const groups = new Map<string,T[]>(); for (const row of rows) { const bucket=groups.get(row.cycleId) ?? []; bucket.push(row); groups.set(row.cycleId,bucket); } return groups; };
    const bySegment=group(segments),byHour=group(hours),byHoliday=group(holidays);
    const result = new Map<string, { tone: "neutral" | "warning" | "danger"; label: string; percent: number; state: "on_track" | "due_soon" | "breached" }>();
    for (const cycle of cycles.filter(c => !c.closedAt)) {
      const progress = serviceCycleProgress(cycle,bySegment.get(cycle.id) ?? [],byHour.get(cycle.id) ?? [],byHoliday.get(cycle.id) ?? [],now);
      const firstPending = !progress.first.finished && !progress.first.waiting;
      const clock = firstPending ? progress.first : progress.total;
      if (clock.budget === null || clock.calendarMissing) continue;
      result.set(cycle.conversationId,{ tone:clock.state === "breached" ? "danger" : clock.state === "due_soon" ? "warning" : "neutral",percent:clock.percent,state:clock.state,label:`${firstPending ? "Resposta" : "Total"}: ${Math.floor(clock.usedMs/60000)}/${clock.budget} min úteis${clock.paused ? " · pausado" : clock.outsideHours ? " · fora do expediente" : ""}` });
    }
    return result;
  },[cycles,segments,hours,holidays,now]);
}
