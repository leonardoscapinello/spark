import { z } from "zod";
import { zAudienceId, zCampaignId, zContactId, zOrgId, zServerTimestamp, zUserId } from "./zodHelpers.js";

export const AUDIENCE_OPERATORS = ["all", "any"] as const;
export const CAMPAIGN_STATUSES = ["draft", "sending", "sent", "partial", "failed"] as const;
export const RECIPIENT_STATUSES = ["pending", "sent", "suppressed", "failed"] as const;
export type AudienceOperator = (typeof AUDIENCE_OPERATORS)[number];
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export type CampaignRecipientStatus = (typeof RECIPIENT_STATUSES)[number];

export const AudienceFilterSchema = z.object({
  operator: z.enum(AUDIENCE_OPERATORS).default("all"),
  leadStatuses: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
  minimumScore: z.number().int().min(0).nullable().default(null),
});
export type AudienceFilter = z.infer<typeof AudienceFilterSchema>;

/** Linha persistida de `audiences`. As listas do filtro são relações próprias
 * e são reunidas pela camada de leitura local, não um JSON escondido aqui. */
export const AudienceRowSchema = z.object({
  id: zAudienceId, orgId: zOrgId, name: z.string().min(1), description: z.string().nullable(),
  operator: z.enum(AUDIENCE_OPERATORS), minimumScore: z.number().int().min(0).max(100).nullable(),
  createdBy: zUserId, createdAt: zServerTimestamp, updatedAt: zServerTimestamp,
});
export type AudienceRow = z.infer<typeof AudienceRowSchema>;

export const AudienceLeadStatusSchema = z.object({
  orgId: zOrgId, audienceId: zAudienceId, leadStatus: z.string().min(1),
});
export type AudienceLeadStatus = z.infer<typeof AudienceLeadStatusSchema>;

export const AudienceTagSchema = z.object({
  orgId: zOrgId, audienceId: zAudienceId, tagId: z.string().uuid(),
});
export type AudienceTag = z.infer<typeof AudienceTagSchema>;

export const AudienceSchema = z.object({
  id: zAudienceId, orgId: zOrgId, name: z.string().min(1), description: z.string().nullable(),
  filter: AudienceFilterSchema, createdBy: zUserId, createdAt: zServerTimestamp, updatedAt: zServerTimestamp,
});
export type Audience = z.infer<typeof AudienceSchema>;

export const CampaignSchema = z.object({
  id: zCampaignId, orgId: zOrgId, audienceId: zAudienceId, name: z.string().min(1),
  subject: z.string().min(1), body: z.string().min(1), status: z.enum(CAMPAIGN_STATUSES),
  recipientCount: z.number().int(), sentCount: z.number().int(), failedCount: z.number().int(),
  suppressedCount: z.number().int(), createdBy: zUserId, sentAt: zServerTimestamp.nullable(),
  createdAt: zServerTimestamp, updatedAt: zServerTimestamp,
});
export type Campaign = z.infer<typeof CampaignSchema>;

export const CampaignRecipientSchema = z.object({
  id: z.string().uuid(), orgId: zOrgId, campaignId: zCampaignId, contactId: zContactId,
  email: z.string().email(), status: z.enum(RECIPIENT_STATUSES), providerMessageId: z.string().nullable(),
  error: z.string().nullable(), sentAt: zServerTimestamp.nullable(), createdAt: zServerTimestamp,
});
export type CampaignRecipient = z.infer<typeof CampaignRecipientSchema>;

export const CreateAudienceInputSchema = z.object({
  id: zAudienceId, name: z.string().trim().min(1).max(120), description: z.string().trim().max(500).nullable().optional(), filter: AudienceFilterSchema,
});
export type CreateAudienceInput = z.infer<typeof CreateAudienceInputSchema>;
export const CreateCampaignInputSchema = z.object({
  id: zCampaignId, audienceId: zAudienceId, name: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(100_000),
});
export type CreateCampaignInput = z.infer<typeof CreateCampaignInputSchema>;
export const CampaignWriteResponseSchema = z.object({ campaign: CampaignSchema, txid: z.number().int() });
export type CampaignWriteResponse = z.infer<typeof CampaignWriteResponseSchema>;
export const AudienceWriteResponseSchema = z.object({ audience: AudienceSchema, txid: z.number().int() });
export type AudienceWriteResponse = z.infer<typeof AudienceWriteResponseSchema>;

export interface AudienceCandidate { leadStatus: string; tags: readonly string[]; score: number; email: string | null; deletedAt: string | null; }
export function matchesAudience(candidate: AudienceCandidate, filter: AudienceFilter): boolean {
  if (!candidate.email || candidate.deletedAt) return false;
  const checks: boolean[] = [];
  if (filter.leadStatuses.length) checks.push(filter.leadStatuses.includes(candidate.leadStatus));
  if (filter.tags.length) checks.push(filter.tags.some((tag) => candidate.tags.includes(tag)));
  if (filter.minimumScore !== null) checks.push(candidate.score >= filter.minimumScore);
  return checks.length === 0 || (filter.operator === "all" ? checks.every(Boolean) : checks.some(Boolean));
}
