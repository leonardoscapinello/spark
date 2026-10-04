import { z } from "zod";
import { zOrgId, zServerTimestamp } from "./zodHelpers.js";
import { StageColorSchema } from "./stage.js";
const identity = { id: z.uuid(), orgId: zOrgId, createdAt: zServerTimestamp, updatedAt: zServerTimestamp };
const named = { ...identity, name: z.string().trim().min(1).max(160), sortOrder: z.number().int().min(0), archived: z.boolean() };
export const ServiceCategorySchema = z.object({ ...named, parentId: z.uuid().nullable() });
export const ServiceStatusSchema = z.object({ ...named, color: StageColorSchema, operationalType: z.enum(["active", "waiting", "closed"]), pauseFirstResponse: z.boolean(), pauseTotal: z.boolean(), resumeOnInbound: z.boolean(), budgetMinutes: z.number().int().min(1).nullable() });
export const ServiceLevelSchema = z.object({ ...named, kind: z.enum(["impact", "urgency", "priority"]), color: StageColorSchema });
export const PriorityMatrixSchema = z.object({ ...identity, impactId: z.uuid(), urgencyId: z.uuid(), priorityId: z.uuid() });
export const SlaPolicySchema = z.object({ ...named, categoryId: z.uuid().nullable(), priorityId: z.uuid().nullable(), firstResponseMinutes: z.number().int().min(1), totalMinutes: z.number().int().min(1), warningPercent: z.number().int().min(1).max(99), version: z.number().int().min(1) });
export type ServiceCategory = z.infer<typeof ServiceCategorySchema>;
export type ServiceStatus = z.infer<typeof ServiceStatusSchema>;
export type ServiceLevel = z.infer<typeof ServiceLevelSchema>;
export type PriorityMatrix = z.infer<typeof PriorityMatrixSchema>;
export type SlaPolicy = z.infer<typeof SlaPolicySchema>;
const omit = { orgId: true, createdAt: true, updatedAt: true } as const;
export const SaveServiceConfigurationSchema = z.discriminatedUnion("kind", [
  ServiceCategorySchema.omit(omit).extend({ kind: z.literal("category") }),
  ServiceStatusSchema.omit(omit).extend({ kind: z.literal("status") }),
  ServiceLevelSchema.omit({ ...omit, kind: true }).extend({ kind: z.literal("level"), levelKind: ServiceLevelSchema.shape.kind }),
  PriorityMatrixSchema.omit(omit).extend({ kind: z.literal("matrix") }),
  SlaPolicySchema.omit({ ...omit, version: true }).extend({ kind: z.literal("policy") }),
]);
export type SaveServiceConfiguration = z.infer<typeof SaveServiceConfigurationSchema>;
export const ServiceConfigurationWriteResponseSchema = z.object({ txid: z.number().int() });

export const SaveServiceConfigurationRequestSchema = z.object({ configuration: SaveServiceConfigurationSchema });
