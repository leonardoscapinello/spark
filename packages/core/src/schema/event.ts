import { z } from "zod";
import { zOrgId, zContactId } from "./zodHelpers.js";

/**
 * The contact's unified timeline — every automation trigger is born here
 * (docs/adr/0027-catalogo-de-gatilhos.md). Append-only; partitioned by
 * month in the migration (docs/adr/0021), never at runtime.
 */
export const EventSchema = z.object({
  id: z.uuid(),
  orgId: zOrgId,
  contactId: zContactId.nullable(),
  type: z.string().min(1).max(100),
  data: z.record(z.string(), z.unknown()).default({}),
  occurredAt: z.iso.datetime(),
});

export type Event = z.infer<typeof EventSchema>;

// orgId never comes from the client — same rule as contact.ts (docs/adr/0026).
export const CreateEventInputSchema = EventSchema.omit({ id: true, orgId: true }).partial({
  contactId: true,
  data: true,
  occurredAt: true,
});
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;
