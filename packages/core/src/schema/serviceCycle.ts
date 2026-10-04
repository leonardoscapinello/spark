import { z } from "zod";
import { zOrgId, zConversationId, zServerTimestamp } from "./zodHelpers.js";
import { BusinessHourSchema, HolidaySchema } from "./stageWorkflow.js";
export const ServiceCycleSchema = z.object({
  id: z.uuid(), orgId: zOrgId, conversationId: zConversationId,
  policyId: z.uuid().nullable(), policyName: z.string().nullable(), policyVersion: z.number().int().nullable(),
  firstResponseMinutes: z.number().int().nullable(), totalMinutes: z.number().int().nullable(), warningPercent: z.number().int(),
  openedAt: zServerTimestamp, closedAt: zServerTimestamp.nullable(), firstInboundAt: zServerTimestamp.nullable(), firstRespondedAt: zServerTimestamp.nullable(),
});
export const ServiceSegmentSchema = z.object({
  id: z.uuid(), orgId: zOrgId, conversationId: zConversationId, cycleId: z.uuid(),
  statusId: z.uuid().nullable(), statusName: z.string(), startedAt: zServerTimestamp, endedAt: zServerTimestamp.nullable(),
  firstCounting: z.boolean(), totalCounting: z.boolean(), budgetMinutes: z.number().int().nullable(), elapsedMs: z.number().min(0),
});
export const ServiceCycleHourSchema = BusinessHourSchema.extend({ cycleId: z.uuid() });
export const ServiceCycleHolidaySchema = HolidaySchema.extend({ cycleId: z.uuid() });
export type ServiceCycle = z.infer<typeof ServiceCycleSchema>;
export type ServiceSegment = z.infer<typeof ServiceSegmentSchema>;
