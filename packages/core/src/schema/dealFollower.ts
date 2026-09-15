import { z } from "zod";
import { zDealId, zOrgId, zServerTimestamp, zUserId } from "./zodHelpers.js";

export const DealFollowerSchema = z.object({
  orgId: zOrgId,
  dealId: zDealId,
  userId: zUserId,
  createdBy: zUserId.nullable(),
  createdAt: zServerTimestamp,
});
export type DealFollower = z.infer<typeof DealFollowerSchema>;

export const AddDealFollowerInputSchema = z.object({ userId: zUserId });
export type AddDealFollowerInput = z.infer<typeof AddDealFollowerInputSchema>;

export const DealFollowerWriteResponseSchema = z.object({
  follower: DealFollowerSchema.nullable(),
  txid: z.number().int(),
});
export type DealFollowerWriteResponse = z.infer<typeof DealFollowerWriteResponseSchema>;
