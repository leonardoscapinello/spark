import { z } from "zod";
import { zOrgId, zActivityId, zContactId, zDealId, zServerTimestamp } from "./zodHelpers.js";

/** Pipedrive parity — the actual product vocabulary of the tool we're replacing. */
export const ActivityTypeSchema = z.enum(["task", "call", "meeting", "email"]);
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

/**
 * Activity — linked to a contact and/or a deal (at least one of the two;
 * not enforced here as a cross-field schema rule, same choice already
 * made in `DealSchema.lossReason` — the screen guarantees it). Lives as
 * its own entity, not a field inside Contact/Deal, because a contact has many.
 */
export const ActivitySchema = z.object({
  id: zActivityId,
  orgId: zOrgId,
  contactId: zContactId.nullable(),
  dealId: zDealId.nullable(),
  type: ActivityTypeSchema,
  title: z.string().min(1, { error: "Title is required" }).max(200),
  notes: z.string().max(2000).nullable(),
  scheduledAt: zServerTimestamp,
  completed: z.boolean().default(false),
  completedAt: zServerTimestamp.nullable(),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});

export type Activity = z.infer<typeof ActivitySchema>;

// orgId never comes from the client (docs/adr/0026); id does — optimistic
// writes need the final key before the server responds (docs/adr/0030).
export const CreateActivityInputSchema = ActivitySchema.omit({
  orgId: true,
  completed: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
}).partial({ contactId: true, dealId: true, notes: true });
export type CreateActivityInput = z.infer<typeof CreateActivityInputSchema>;

export const CreateActivityResponseSchema = z.object({
  activity: ActivitySchema,
  txid: z.number().int(),
});
export type CreateActivityResponse = z.infer<typeof CreateActivityResponseSchema>;

/** Complete or reopen — the same route both ways, the body decides. */
export const CompleteActivityInputSchema = z.object({
  completed: z.boolean(),
});
export type CompleteActivityInput = z.infer<typeof CompleteActivityInputSchema>;

export const CompleteActivityResponseSchema = z.object({
  activity: ActivitySchema,
  txid: z.number().int(),
});
export type CompleteActivityResponse = z.infer<typeof CompleteActivityResponseSchema>;
