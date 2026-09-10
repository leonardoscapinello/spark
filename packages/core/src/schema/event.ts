import { z } from "zod";
import { zOrgId, zContactId } from "./zodHelpers.js";

/**
 * A timeline unificada do contato — todo gatilho de automação nasce aqui
 * (docs/adr/0027-catalogo-de-gatilhos.md). Append-only; particionada por mês
 * na migration (docs/adr/0021), nunca em runtime.
 */
export const EventSchema = z.object({
  id: z.uuid(),
  orgId: zOrgId,
  contactId: zContactId.nullable(),
  tipo: z.string().min(1).max(100),
  dados: z.record(z.string(), z.unknown()).default({}),
  ocorridoEm: z.iso.datetime(),
});

export type Event = z.infer<typeof EventSchema>;

export const CreateEventInputSchema = EventSchema.omit({ id: true }).partial({
  contactId: true,
  dados: true,
  ocorridoEm: true,
});
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;
