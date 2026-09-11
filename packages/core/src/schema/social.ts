import { z } from "zod";
import {
  zIntegrationConnectionId,
  zOrgId,
  zServerTimestamp,
  zSocialChannelId,
  zSocialPostId,
  zUserId,
} from "./zodHelpers.js";

export const SOCIAL_SERVICES = [
  "instagram",
  "facebook",
  "threads",
  "linkedin",
  "twitter",
  "pinterest",
  "tiktok",
  "youtube",
  "mastodon",
  "bluesky",
  "googlebusiness",
] as const;
export const SOCIAL_POST_STATUSES = [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "cancelled",
] as const;
export const SOCIAL_PUBLISH_MODES = ["draft", "queue", "now", "schedule"] as const;
export type SocialService = (typeof SOCIAL_SERVICES)[number];
export type SocialPostStatus = (typeof SOCIAL_POST_STATUSES)[number];
export type SocialPublishMode = (typeof SOCIAL_PUBLISH_MODES)[number];

export const SocialChannelSchema = z.object({
  id: zSocialChannelId,
  orgId: zOrgId,
  connectionId: zIntegrationConnectionId,
  externalId: z.string().min(1),
  service: z.enum(SOCIAL_SERVICES),
  name: z.string().min(1),
  avatarUrl: z.url().nullable(),
  active: z.boolean(),
  syncedAt: zServerTimestamp,
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type SocialChannel = z.infer<typeof SocialChannelSchema>;

export const SocialPostSchema = z.object({
  id: zSocialPostId,
  orgId: zOrgId,
  channelId: zSocialChannelId,
  connectionId: zIntegrationConnectionId,
  createdBy: zUserId,
  text: z.string().max(10_000),
  status: z.enum(SOCIAL_POST_STATUSES),
  publishMode: z.enum(SOCIAL_PUBLISH_MODES),
  scheduledAt: zServerTimestamp.nullable(),
  publishedAt: zServerTimestamp.nullable(),
  externalId: z.string().nullable(),
  providerStatus: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type SocialPost = z.infer<typeof SocialPostSchema>;

export const SyncSocialChannelsResponseSchema = z.object({
  channels: z.array(SocialChannelSchema),
  txid: z.number().int(),
});
export type SyncSocialChannelsResponse = z.infer<typeof SyncSocialChannelsResponseSchema>;

export const CreateSocialPostInputSchema = z
  .object({
    id: zSocialPostId,
    channelId: zSocialChannelId,
    text: z.string().trim().min(1).max(10_000),
    publishMode: z.enum(SOCIAL_PUBLISH_MODES),
    scheduledAt: z.iso.datetime().nullable().optional(),
  })
  .superRefine((input, context) => {
    if (input.publishMode === "schedule" && !input.scheduledAt) {
      context.addIssue({
        code: "custom",
        path: ["scheduledAt"],
        message: "Escolha a data e o horário da publicação.",
      });
    }
    if (
      input.publishMode === "schedule" &&
      input.scheduledAt &&
      new Date(input.scheduledAt).getTime() <= Date.now()
    ) {
      context.addIssue({
        code: "custom",
        path: ["scheduledAt"],
        message: "O agendamento precisa estar no futuro.",
      });
    }
  });
export type CreateSocialPostInput = z.infer<typeof CreateSocialPostInputSchema>;

export const SocialPostWriteResponseSchema = z.object({
  post: SocialPostSchema,
  txid: z.number().int(),
});
export type SocialPostWriteResponse = z.infer<typeof SocialPostWriteResponseSchema>;
