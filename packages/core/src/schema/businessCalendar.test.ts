import { describe, it, expect } from "vitest";
import { SaveBusinessHourInputSchema, SaveHolidayInputSchema } from "./stageWorkflow.js";
import { businessHourId, holidayId } from "../identity/index.js";
const hour = { id: businessHourId.create(), weekday: 1, enabled: true, startTime: "09:00", endTime: "18:00", breakStartTime: "12:00", breakEndTime: "13:00", timeZone: "America/Sao_Paulo" };
describe("calendário útil", () => {
  it("recusa intervalo incompleto, invertido e fora do expediente", () => {
    for (const patch of [{ breakEndTime: null }, { breakEndTime: "11:00" }, { breakStartTime: "08:00" }, { endTime: "08:00" }]) expect(SaveBusinessHourInputSchema.safeParse({ ...hour, ...patch }).success).toBe(false);
    expect(SaveBusinessHourInputSchema.safeParse(hour).success).toBe(true);
  });
  it("recusa fuso inválido mesmo em dia desabilitado", () => expect(SaveBusinessHourInputSchema.safeParse({ ...hour, enabled: false, timeZone: "invalid" }).success).toBe(false));
  it("exige horas para expediente reduzido e datas ordenadas", () => {
    const holiday = { id: holidayId.create(), name: "Exceção", startDate: "2026-12-24", endDate: "2026-12-24", kind: "closed" };
    expect(SaveHolidayInputSchema.safeParse(holiday).success).toBe(true);
    expect(SaveHolidayInputSchema.safeParse({ ...holiday, kind: "reduced" }).success).toBe(false);
    expect(SaveHolidayInputSchema.safeParse({ ...holiday, endDate: "2026-12-23" }).success).toBe(false);
  });
});
