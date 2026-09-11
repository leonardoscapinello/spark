import { z } from "zod";
import { zOrgId, zPipelineId } from "./zodHelpers.js";

/**
 * Pipeline — the sales funnel. A `Stage` (stage.ts) belongs to a pipeline;
 * a `Deal` (deal.ts) belongs to a stage. Archived, not deleted: a
 * historical deal still points at a pipeline that no longer accepts new
 * deals (docs/adr/0021).
 */
export const PipelineSchema = z.object({
  id: zPipelineId,
  orgId: zOrgId,
  name: z.string().min(1, { error: "Pipeline name is required" }).max(200),
  isDefault: z.boolean().default(false),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  archivedAt: z.iso.datetime().nullable(),
});

export type Pipeline = z.infer<typeof PipelineSchema>;

// orgId never comes from the client (docs/adr/0026); id does — same rule
// as contact.ts (docs/adr/0030): optimistic writes need the final key
// before the server responds.
export const CreatePipelineInputSchema = PipelineSchema.omit({
  orgId: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
}).partial({ isDefault: true });
export type CreatePipelineInput = z.infer<typeof CreatePipelineInputSchema>;

export const UpdatePipelineInputSchema = CreatePipelineInputSchema.omit({ id: true }).partial();
export type UpdatePipelineInput = z.infer<typeof UpdatePipelineInputSchema>;

/** Write response envelope — same reason as CreateContactResponseSchema (docs/adr/0018). */
export const CreatePipelineResponseSchema = z.object({
  pipeline: PipelineSchema,
  txid: z.number().int(),
});
export type CreatePipelineResponse = z.infer<typeof CreatePipelineResponseSchema>;
