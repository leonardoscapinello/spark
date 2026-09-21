import { z } from "zod";
import { zIntegrationConnectionId, zOrgId, zServerTimestamp } from "./zodHelpers.js";

export const INTEGRATION_PROVIDERS = ["smtp", "google_workspace", "google_calendar", "outlook_calendar", "apple_calendar", "instagram", "whatsapp", "buffer", "s3", "reoon"] as const;
export const INTEGRATION_STATUSES = ["not_configured", "connected", "error", "disabled"] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];

export const IntegrationConnectionSchema = z.object({
  id: zIntegrationConnectionId,
  orgId: zOrgId,
  provider: z.enum(INTEGRATION_PROVIDERS),
  name: z.string().trim().min(1).max(160),
  status: z.enum(INTEGRATION_STATUSES),
  config: z.record(z.string(), z.unknown()),
  credentialsConfigured: z.boolean(),
  credentialHint: z.string().nullable(),
  lastCheckedAt: zServerTimestamp.nullable(),
  lastError: z.string().nullable(),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type IntegrationConnection = z.infer<typeof IntegrationConnectionSchema>;
export const UpsertIntegrationInputSchema = z.object({
  id: zIntegrationConnectionId,
  provider: z.enum(INTEGRATION_PROVIDERS),
  name: z.string().trim().min(1).max(160),
  config: z.record(z.string(), z.unknown()),
  credentials: z.record(z.string(), z.string().min(1)).optional(),
});
export type UpsertIntegrationInput = z.infer<typeof UpsertIntegrationInputSchema>;
export const UpdateIntegrationStatusInputSchema = z.object({ disabled: z.boolean() });
export type UpdateIntegrationStatusInput = z.infer<typeof UpdateIntegrationStatusInputSchema>;
export const IntegrationWriteResponseSchema = z.object({ connection: IntegrationConnectionSchema, txid: z.number().int() });
export type IntegrationWriteResponse = z.infer<typeof IntegrationWriteResponseSchema>;
