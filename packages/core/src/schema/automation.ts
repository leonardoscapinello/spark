import { z } from "zod";
import { zAutomationId, zAutomationRunId, zAutomationStepId, zAutomationVersionId, zContactId, zOrgId, zServerTimestamp, zUserId } from "./zodHelpers.js";

export const AUTOMATION_STATUSES = ["draft", "active", "paused"] as const;
export const AUTOMATION_NODE_TYPES = ["trigger", "action", "condition", "wait"] as const;
export type AutomationStatus = (typeof AUTOMATION_STATUSES)[number];
export type AutomationNodeType = (typeof AUTOMATION_NODE_TYPES)[number];

export const AutomationNodeSchema = z.object({
  id: z.string().trim().min(1).max(100),
  type: z.enum(AUTOMATION_NODE_TYPES),
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
  data: z.object({
    label: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).default(""),
    config: z.record(z.string(), z.unknown()).default({}),
  }),
});
export type AutomationNode = z.infer<typeof AutomationNodeSchema>;

export const AutomationEdgeSchema = z.object({
  id: z.string().trim().min(1).max(100),
  source: z.string().trim().min(1).max(100),
  target: z.string().trim().min(1).max(100),
  label: z.string().trim().max(80).optional(),
});
export type AutomationEdge = z.infer<typeof AutomationEdgeSchema>;

export const AutomationGraphSchema = z.object({
  nodes: z.array(AutomationNodeSchema).max(500).default([]),
  edges: z.array(AutomationEdgeSchema).max(1_000).default([]),
});
export type AutomationGraph = z.infer<typeof AutomationGraphSchema>;

export const EMPTY_AUTOMATION_GRAPH: AutomationGraph = { nodes: [], edges: [] };

export const AutomationSchema = z.object({
  id: zAutomationId,
  orgId: zOrgId,
  name: z.string().trim().min(1).max(160),
  status: z.enum(AUTOMATION_STATUSES),
  draftGraph: AutomationGraphSchema,
  currentPublishedVersionId: zAutomationVersionId.nullable(),
  publishedVersion: z.number().int().min(1).nullable(),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type Automation = z.infer<typeof AutomationSchema>;

export const AutomationVersionSchema = z.object({
  id: zAutomationVersionId,
  orgId: zOrgId,
  automationId: zAutomationId,
  version: z.number().int().min(1),
  graph: AutomationGraphSchema,
  publishedBy: zUserId,
  publishedAt: zServerTimestamp,
});
export type AutomationVersion = z.infer<typeof AutomationVersionSchema>;

export const CreateAutomationInputSchema = AutomationSchema.pick({ id: true, name: true });
export type CreateAutomationInput = z.infer<typeof CreateAutomationInputSchema>;
export const UpdateAutomationDraftInputSchema = AutomationSchema.pick({ name: true, draftGraph: true });
export type UpdateAutomationDraftInput = z.infer<typeof UpdateAutomationDraftInputSchema>;
export const UpdateAutomationStatusInputSchema = z.object({ status: z.enum(["active", "paused"]) });
export type UpdateAutomationStatusInput = z.infer<typeof UpdateAutomationStatusInputSchema>;
export const PublishAutomationInputSchema = z.object({ expectedUpdatedAt: zServerTimestamp.optional() });
export type PublishAutomationInput = z.infer<typeof PublishAutomationInputSchema>;

export const AutomationWriteResponseSchema = z.object({ automation: AutomationSchema, txid: z.number().int() });
export const AutomationPublishResponseSchema = z.object({ automation: AutomationSchema, version: AutomationVersionSchema, txid: z.number().int() });
export type AutomationWriteResponse = z.infer<typeof AutomationWriteResponseSchema>;
export type AutomationPublishResponse = z.infer<typeof AutomationPublishResponseSchema>;

export const AUTOMATION_RUN_STATUSES = ["queued", "running", "waiting", "completed", "failed", "cancelled"] as const;
export const AUTOMATION_STEP_STATUSES = ["running", "waiting", "completed", "failed", "skipped"] as const;
export const AutomationRunSchema = z.object({
  id: zAutomationRunId,
  orgId: zOrgId,
  automationId: zAutomationId,
  versionId: zAutomationVersionId,
  contactId: zContactId,
  status: z.enum(AUTOMATION_RUN_STATUSES),
  currentNodeId: z.string().nullable(),
  context: z.record(z.string(), z.unknown()),
  error: z.string().nullable(),
  startedAt: zServerTimestamp,
  completedAt: zServerTimestamp.nullable(),
  updatedAt: zServerTimestamp,
});
export type AutomationRun = z.infer<typeof AutomationRunSchema>;
export const AutomationRunStepSchema = z.object({
  id: zAutomationStepId,
  orgId: zOrgId,
  runId: zAutomationRunId,
  nodeId: z.string(),
  attempt: z.number().int().min(1),
  status: z.enum(AUTOMATION_STEP_STATUSES),
  result: z.record(z.string(), z.unknown()),
  startedAt: zServerTimestamp,
  finishedAt: zServerTimestamp.nullable(),
});
export type AutomationRunStep = z.infer<typeof AutomationRunStepSchema>;
export const StartAutomationRunInputSchema = z.object({ contactId: zContactId, context: z.record(z.string(), z.unknown()).default({}) });
export type StartAutomationRunInput = z.infer<typeof StartAutomationRunInputSchema>;
export const StartAutomationRunResponseSchema = z.object({ run: AutomationRunSchema, txid: z.number().int() });
export type StartAutomationRunResponse = z.infer<typeof StartAutomationRunResponseSchema>;
