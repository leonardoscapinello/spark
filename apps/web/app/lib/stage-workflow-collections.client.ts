import { createBusinessHoursCollection, createHolidaysCollection, createStageTransitionsCollection, type BusinessHoursCollection, type HolidaysCollection, type StageTransitionsCollection } from "@spark/data";
let transitions: StageTransitionsCollection | undefined;
let hours: BusinessHoursCollection | undefined;
let holidays: HolidaysCollection | undefined;
export function getStageTransitionsCollection() { transitions ??= createStageTransitionsCollection(); return transitions; }
export function getBusinessHoursCollection() { hours ??= createBusinessHoursCollection(); return hours; }
export function getHolidaysCollection() { holidays ??= createHolidaysCollection(); return holidays; }
