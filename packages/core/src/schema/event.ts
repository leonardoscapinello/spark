import { z } from "zod";
import {
  zCompanyId,
  zContactId,
  zDealId,
  zEventId,
  zOrgId,
  zServerTimestamp,
} from "./zodHelpers.js";

export const DOMAIN_EVENT_TYPES = [
  "contact.created",
  "contact.updated",
  "contact.archived",
  "contact.restored",
  "identity.added",
  "company.created",
  "company.updated",
  "company.archived",
  "company.restored",
  "deal.created",
  "deal.updated",
  "deal.stage_changed",
  "deal.won",
  "deal.lost",
  "deal.reopened",
  "activity.created",
  "activity.updated",
  "note.created",
  "activity.completed",
  "activity.reopened",
  "conversation.created",
  "conversation.updated",
  "conversation.closed",
  "conversation.reopened",
  "message.note_added",
  "message.received",
  "message.queued",
  "message.sent",
  "message.failed",
  "automation.created",
  "automation.draft_updated",
  "automation.published",
  "automation.paused",
  "automation.activated",
  "automation.run_started",
  "automation.run_completed",
  "automation.run_failed",
  "integration.configured",
  "integration.checked",
  "integration.disabled",
  "integration.enabled",
  "file.upload_requested",
  "file.upload_completed",
  "file.deleted",
  "product.created",
  "product.updated",
  "product.archived",
  "product.restored",
  "product.variant_created",
  "discount_rule.created",
  "discount_rule.updated",
  "form.created",
  "form.updated",
  "form.published",
  "form.unpublished",
  "form.submitted",
  "social.channels_synced",
  "social.post_created",
  "social.post_scheduled",
  "social.post_published",
  "social.post_failed",
  "audience.created",
  "campaign.created",
  "campaign.sent",
  "custom_field.created",
  "custom_field.updated",
  "custom_field.archived",
  "page.created",
  "page.updated",
  "page.published",
  "canned_reply.created",
  "canned_reply.updated",
  "canned_reply.archived",
] as const;
export const DomainEventTypeSchema = z.enum(DOMAIN_EVENT_TYPES);
export type DomainEventType = z.infer<typeof DomainEventTypeSchema>;

/**
 * The contact's unified timeline — every automation trigger is born here
 * (docs/adr/0027-catalogo-de-gatilhos.md). Append-only; partitioned by
 * month in the migration (docs/adr/0021), never at runtime.
 */
export const EventSchema = z.object({
  id: zEventId,
  orgId: zOrgId,
  contactId: zContactId.nullable(),
  dealId: zDealId.nullable(),
  companyId: zCompanyId.nullable(),
  type: DomainEventTypeSchema,
  data: z.record(z.string(), z.unknown()).default({}),
  occurredAt: zServerTimestamp,
});

export type Event = z.infer<typeof EventSchema>;

// orgId never comes from the client — same rule as contact.ts (docs/adr/0026).
export const CreateEventInputSchema = EventSchema.omit({ id: true, orgId: true }).partial({
  contactId: true,
  dealId: true,
  companyId: true,
  data: true,
  occurredAt: true,
});
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;
