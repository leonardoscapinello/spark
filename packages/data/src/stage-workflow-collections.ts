import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { BusinessHourSchema, HolidaySchema, StageTransitionSchema, businessHourId, holidayId, type BusinessHour, type ConfigureStageInput, type Holiday, type OrgId } from "@spark/core";
import { businessCalendarControllerRemoveHoliday, businessCalendarControllerSaveHoliday, businessCalendarControllerSaveHour, stagesControllerConfigure } from "@spark/api-client";
import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { confirmed } from "./confirmed.js";
import { sparkShapeOptions } from "./shape-options.js";

export function createStageTransitionsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "stage_transitions", schema: StageTransitionSchema, getKey: (row) => row.id, shapeOptions: sparkShapeOptions("stage_transitions") })); }

export function configureStage(id: string, input: ConfigureStageInput) { return stagesControllerConfigure(id, input); }

export function optimisticBusinessHour(input: Omit<BusinessHour, "id" | "orgId" | "createdAt" | "updatedAt">, orgId: OrgId): BusinessHour {
  const now = new Date().toISOString();
  return { id: businessHourId.create(), orgId, ...input, createdAt: now, updatedAt: now };
}

export function createBusinessHoursCollection() { return createCollection(electricCollectionOptions({
  gcTime: INACTIVE_COLLECTION_GC_MS, id: "business_hours", schema: BusinessHourSchema, getKey: (row) => row.id, shapeOptions: sparkShapeOptions("business_hours"),
  onInsert: async ({ transaction }) => { const row = transaction.mutations[0]?.modified; if (!row) throw new Error("Missing business hour."); return confirmed(await businessCalendarControllerSaveHour(toHourInput(row))); },
  onUpdate: async ({ transaction }) => { const row = transaction.mutations[0]?.modified; if (!row) throw new Error("Missing business hour."); return confirmed(await businessCalendarControllerSaveHour(toHourInput(row))); },
})); }

export function optimisticHoliday(input: Omit<Holiday, "id" | "orgId" | "createdAt" | "updatedAt">, orgId: OrgId): Holiday { const now = new Date().toISOString(); return { id: holidayId.create(), orgId, ...input, createdAt: now, updatedAt: now }; }
export function createHolidaysCollection() { return createCollection(electricCollectionOptions({
  gcTime: INACTIVE_COLLECTION_GC_MS, id: "holidays", schema: HolidaySchema, getKey: (row) => row.id, shapeOptions: sparkShapeOptions("holidays"),
  onInsert: async ({ transaction }) => { const row = transaction.mutations[0]?.modified; if (!row) throw new Error("Missing holiday."); return confirmed(await businessCalendarControllerSaveHoliday(toHolidayInput(row))); },
  onUpdate: async ({ transaction }) => { const row = transaction.mutations[0]?.modified; if (!row) throw new Error("Missing holiday."); return confirmed(await businessCalendarControllerSaveHoliday(toHolidayInput(row))); },
  onDelete: async ({ transaction }) => { const row = transaction.mutations[0]?.original; if (!row) throw new Error("Missing holiday."); return confirmed(await businessCalendarControllerRemoveHoliday(row.id)); },
})); }

function toHourInput(row: BusinessHour) { return { id: row.id, weekday: row.weekday, enabled: row.enabled, startTime: row.startTime, breakStartTime: row.breakStartTime, breakEndTime: row.breakEndTime, endTime: row.endTime, timeZone: row.timeZone }; }
function toHolidayInput(row: Holiday) { return { id: row.id, startDate: row.startDate, endDate: row.endDate, name: row.name, kind: row.kind, startTime: row.startTime, breakStartTime: row.breakStartTime, breakEndTime: row.breakEndTime, endTime: row.endTime, repeatsAnnually: row.repeatsAnnually }; }

export type StageTransitionsCollection = ReturnType<typeof createStageTransitionsCollection>;
export type BusinessHoursCollection = ReturnType<typeof createBusinessHoursCollection>;
export type HolidaysCollection = ReturnType<typeof createHolidaysCollection>;
