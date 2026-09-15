import { z } from "zod";
import { zOrgId, zPipelineId, zStageId, zContactId, zCompanyId, zDealId, zMoney, zServerTimestamp, zUserId } from "./zodHelpers.js";

/** Pipedrive parity — the actual product vocabulary of the tool we're replacing. */
export const DealStatusSchema = z.enum(["open", "won", "lost"]);
export type DealStatus = z.infer<typeof DealStatusSchema>;

/**
 * Deal — belongs to a stage of a pipeline, optionally linked to a
 * contact. `amount` is `Money` (packages/core/src/money), never a raw
 * number — same rule as any monetary amount in the system.
 */
export const DealSchema = z.object({
  id: zDealId,
  orgId: zOrgId,
  pipelineId: zPipelineId,
  stageId: zStageId,
  contactId: zContactId.nullable(),
  companyId: zCompanyId.nullable(),
  ownerId: zUserId.nullable(),
  name: z.string().min(1, { error: "Deal name is required" }).max(200),
  amount: zMoney,
  status: DealStatusSchema.default("open"),
  expectedCloseDate: zServerTimestamp.nullable(),
  /** only meaningful when status is "lost" — not enforced here as a
   * cross-field schema rule; the screen decides whether to ask for it. */
  lossReason: z.string().max(500).nullable(),
  /** Persisted anchor for the current-stage SLA; reset atomically on every move. */
  stageEnteredAt: zServerTimestamp.default(() => new Date().toISOString()),
  /** Campos definidos pela organização (packages/core/schema/customField,
   * entityType "deal") — como no Pipedrive, um negócio também carrega os seus. */
  customFields: z.record(z.string(), z.unknown()).optional(),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
  deletedAt: zServerTimestamp.nullable(),
});

export type Deal = z.infer<typeof DealSchema>;

// orgId never comes from the client (docs/adr/0026); id does — optimistic
// writes need the final key before the server responds (docs/adr/0030).
export const CreateDealInputSchema = DealSchema.omit({
  orgId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  stageEnteredAt: true,
}).partial({ contactId: true, companyId: true, ownerId: true, status: true, expectedCloseDate: true, lossReason: true, customFields: true });
export type CreateDealInput = z.infer<typeof CreateDealInputSchema>;

export const UpdateDealInputSchema = CreateDealInputSchema.omit({ id: true }).partial();
export type UpdateDealInput = z.infer<typeof UpdateDealInputSchema>;

/** Move to another stage — the board's central "drag and drop" action. */
export const MoveDealInputSchema = z.object({
  stageId: zStageId,
});
export type MoveDealInput = z.infer<typeof MoveDealInputSchema>;

/** Write response envelope — same reason as CreateContactResponseSchema (docs/adr/0018). */
export const CreateDealResponseSchema = z.object({
  deal: DealSchema,
  txid: z.number().int(),
});
export type CreateDealResponse = z.infer<typeof CreateDealResponseSchema>;

export const MoveDealResponseSchema = z.object({
  deal: DealSchema,
  txid: z.number().int(),
});
export type MoveDealResponse = z.infer<typeof MoveDealResponseSchema>;

/** Editable commercial data. Moving and closing remain explicit commands. */
export const EditDealInputSchema = UpdateDealInputSchema.omit({
  pipelineId: true,
  stageId: true,
  status: true,
  lossReason: true,
});
export type EditDealInput = z.infer<typeof EditDealInputSchema>;

export const EditDealResponseSchema = z.object({
  deal: DealSchema,
  txid: z.number().int(),
});
export type EditDealResponse = z.infer<typeof EditDealResponseSchema>;

/**
 * Close as won or lost — the board's other central action, besides moving
 * stages. Not a discriminated union: `nestjs-zod`'s `createZodDto` breaks
 * on zod v4 discriminated unions (found generating the OpenAPI doc — an
 * unconditional crash, no useful stack, reproduced even in the minimal
 * case with no cross-field rule at all). Plain object instead — same
 * choice `DealSchema.lossReason` already made (cross-field rule
 * documented, not enforced in the schema).
 */
export const CloseDealInputSchema = z.object({
  status: z.enum(["won", "lost"]),
  lossReason: z.string().max(500).nullable().optional(),
});
export type CloseDealInput = z.infer<typeof CloseDealInputSchema>;

export const CloseDealResponseSchema = z.object({
  deal: DealSchema,
  txid: z.number().int(),
});
export type CloseDealResponse = z.infer<typeof CloseDealResponseSchema>;

/** Reopening is an explicit lifecycle command, not a generic field edit. */
export const ReopenDealResponseSchema = z.object({
  deal: DealSchema,
  txid: z.number().int(),
});
export type ReopenDealResponse = z.infer<typeof ReopenDealResponseSchema>;
