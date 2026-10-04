import { z } from "zod";
import { zBusinessHourId, zHolidayId, zOrgId, zPipelineId, zServerTimestamp, zStageId, zStageTransitionId } from "./zodHelpers.js";

export const StageTransitionSchema = z.object({
  id: zStageTransitionId,
  orgId: zOrgId,
  pipelineId: zPipelineId,
  fromStageId: zStageId,
  toStageId: zStageId,
  createdAt: zServerTimestamp,
});
export type StageTransition = z.infer<typeof StageTransitionSchema>;

const TimeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const BusinessHourSchema = z.object({
  id: zBusinessHourId,
  orgId: zOrgId,
  weekday: z.number().int().min(0).max(6),
  enabled: z.boolean(),
  startTime: TimeOfDaySchema,
  breakStartTime: TimeOfDaySchema.nullable(),
  breakEndTime: TimeOfDaySchema.nullable(),
  endTime: TimeOfDaySchema,
  timeZone: z.string().min(1).max(100),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type BusinessHour = z.infer<typeof BusinessHourSchema>;
function validTimes(input: { startTime: string | null; endTime: string | null; breakStartTime: string | null; breakEndTime: string | null }): boolean {
  if (!input.startTime || !input.endTime || input.startTime >= input.endTime) return false;
  if (input.breakStartTime === null && input.breakEndTime === null) return true;
  return input.breakStartTime !== null && input.breakEndTime !== null && input.startTime < input.breakStartTime && input.breakStartTime < input.breakEndTime && input.breakEndTime < input.endTime;
}
export const SaveBusinessHourInputSchema = BusinessHourSchema.omit({ orgId: true, createdAt: true, updatedAt: true })
  .refine(input => !input.enabled || validTimes(input), { message: "Informe horários ordenados e preencha as duas pontas do intervalo." })
  .refine(input => { try { new Intl.DateTimeFormat("pt-BR", { timeZone: input.timeZone }); return true; } catch { return false; } }, { message: "Informe um fuso horário válido.", path: ["timeZone"] });
export type SaveBusinessHourInput = z.infer<typeof SaveBusinessHourInputSchema>;
export const BusinessHourWriteResponseSchema = z.object({ businessHour: BusinessHourSchema, txid: z.number().int() });

export const HolidaySchema = z.object({
  id: zHolidayId,
  orgId: zOrgId,
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  name: z.string().trim().min(1).max(160),
  kind: z.enum(["closed", "reduced"]).default("closed"),
  startTime: TimeOfDaySchema.nullable().default(null),
  breakStartTime: TimeOfDaySchema.nullable().default(null),
  breakEndTime: TimeOfDaySchema.nullable().default(null),
  endTime: TimeOfDaySchema.nullable().default(null),
  repeatsAnnually: z.boolean().default(false),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type Holiday = z.infer<typeof HolidaySchema>;
export const SaveHolidayInputSchema = HolidaySchema.omit({ orgId: true, createdAt: true, updatedAt: true })
  .refine(input => input.startDate <= input.endDate, { message: "A data final deve ser igual ou posterior à inicial." })
  .refine(input => input.kind === "closed" || validTimes(input), { message: "Informe os horários do expediente reduzido e um intervalo válido." });
export type SaveHolidayInput = z.infer<typeof SaveHolidayInputSchema>;
export const HolidayWriteResponseSchema = z.object({ holiday: HolidaySchema.nullable(), txid: z.number().int() });
