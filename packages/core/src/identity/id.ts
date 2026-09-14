/**
 * Every entity identifier is a UUID v7 — time-sortable, a requirement of
 * offline-first (docs/adr/0012, docs/adr/0018-arquitetura-local-first.md).
 * Each entity type carries its own brand: an OrgId is never accepted where
 * a ContactId is expected, even though both are strings underneath.
 */
import { v7 as uuidv7, validate as validateUuid, version as uuidVersion } from "uuid";

type Id<Brand extends string> = string & { readonly __id: Brand };

export type OrgId = Id<"Org">;
export type UserId = Id<"User">;
export type ContactId = Id<"Contact">;
export type CompanyId = Id<"Company">;
export type DealId = Id<"Deal">;
export type PermissionGroupId = Id<"PermissionGroup">;
export type PipelineId = Id<"Pipeline">;
export type StageId = Id<"Stage">;
export type ActivityId = Id<"Activity">;
export type AuditLogId = Id<"AuditLog">;
export type EventId = Id<"Event">;
export type IdentityId = Id<"Identity">;
export type TeamId = Id<"Team">;
export type ConversationId = Id<"Conversation">;
export type MessageId = Id<"Message">;
export type AutomationId = Id<"Automation">;
export type AutomationVersionId = Id<"AutomationVersion">;
export type AutomationRunId = Id<"AutomationRun">;
export type AutomationStepId = Id<"AutomationStep">;
export type AutomationTimerId = Id<"AutomationTimer">;
export type AutomationJobId = Id<"AutomationJob">;
export type IntegrationConnectionId = Id<"IntegrationConnection">;
export type FileId = Id<"File">;
export type ProductId = Id<"Product">;
export type ProductVariantId = Id<"ProductVariant">;
export type DiscountRuleId = Id<"DiscountRule">;
export type LeadFormId = Id<"LeadForm">;
export type FormSubmissionId = Id<"FormSubmission">;
export type SocialChannelId = Id<"SocialChannel">;
export type SocialPostId = Id<"SocialPost">;
export type AudienceId = Id<"Audience">;
export type CampaignId = Id<"Campaign">;
export type CampaignRecipientId = Id<"CampaignRecipient">;
export type EmailSuppressionId = Id<"EmailSuppression">;
export type CustomFieldDefinitionId = Id<"CustomFieldDefinition">;
export type PageId = Id<"Page">;
export type PageVersionId = Id<"PageVersion">;
export type CannedReplyId = Id<"CannedReply">;
export type SavedViewId = Id<"SavedView">;
export type DealProductId = Id<"DealProduct">;
export type StageFieldRuleId = Id<"StageFieldRule">;
export type NoteId = Id<"Note">;
export type CustomFieldOptionId = Id<"CustomFieldOption">;
export type TagId = Id<"Tag">;
export type LeadFormFieldId = Id<"LeadFormField">;
export type IntegrationSettingId = Id<"IntegrationSetting">;
export type CustomFieldValueId = Id<"CustomFieldValue">;
export type UserPreferenceId = Id<"UserPreference">;
export type LinkPreviewId = Id<"LinkPreview">;

export class InvalidIdError extends Error {
  constructor(type: string, value: string) {
    super(`Invalid ${type} — must be a UUID v7: "${value}"`);
    this.name = "InvalidIdError";
  }
}

function makeIdFactory<Brand extends string>(type: Brand) {
  return {
    create: (): Id<Brand> => uuidv7() as Id<Brand>,
    from: (value: string): Id<Brand> => {
      if (!validateUuid(value) || uuidVersion(value) !== 7) {
        throw new InvalidIdError(type, value);
      }
      return value as Id<Brand>;
    },
  };
}

// The string passed here MUST match the literal used in the type alias
// above (Id<"Org">, Id<"User">, ...) — they're the same brand, checked by tsc.
export const orgId = makeIdFactory("Org");
export const userId = makeIdFactory("User");
export const contactId = makeIdFactory("Contact");
export const companyId = makeIdFactory("Company");
export const dealId = makeIdFactory("Deal");
export const permissionGroupId = makeIdFactory("PermissionGroup");
export const pipelineId = makeIdFactory("Pipeline");
export const stageId = makeIdFactory("Stage");
export const activityId = makeIdFactory("Activity");
export const auditLogId = makeIdFactory("AuditLog");
export const eventId = makeIdFactory("Event");
export const identityId = makeIdFactory("Identity");
export const teamId = makeIdFactory("Team");
export const conversationId = makeIdFactory("Conversation");
export const messageId = makeIdFactory("Message");
export const automationId = makeIdFactory("Automation");
export const automationVersionId = makeIdFactory("AutomationVersion");
export const automationRunId = makeIdFactory("AutomationRun");
export const automationStepId = makeIdFactory("AutomationStep");
export const automationTimerId = makeIdFactory("AutomationTimer");
export const automationJobId = makeIdFactory("AutomationJob");
export const integrationConnectionId = makeIdFactory("IntegrationConnection");
export const fileId = makeIdFactory("File");
export const productId = makeIdFactory("Product");
export const productVariantId = makeIdFactory("ProductVariant");
export const discountRuleId = makeIdFactory("DiscountRule");
export const leadFormId = makeIdFactory("LeadForm");
export const formSubmissionId = makeIdFactory("FormSubmission");
export const socialChannelId = makeIdFactory("SocialChannel");
export const socialPostId = makeIdFactory("SocialPost");
export const audienceId = makeIdFactory("Audience");
export const campaignId = makeIdFactory("Campaign");
export const campaignRecipientId = makeIdFactory("CampaignRecipient");
export const emailSuppressionId = makeIdFactory("EmailSuppression");
export const customFieldDefinitionId = makeIdFactory("CustomFieldDefinition");
export const pageId = makeIdFactory("Page");
export const pageVersionId = makeIdFactory("PageVersion");
export const cannedReplyId = makeIdFactory("CannedReply");
export const savedViewId = makeIdFactory("SavedView");
export const dealProductId = makeIdFactory("DealProduct");
export const stageFieldRuleId = makeIdFactory("StageFieldRule");
export const noteId = makeIdFactory("Note");
export const customFieldOptionId = makeIdFactory("CustomFieldOption");
export const tagId = makeIdFactory("Tag");
export const leadFormFieldId = makeIdFactory("LeadFormField");
export const integrationSettingId = makeIdFactory("IntegrationSetting");
export const customFieldValueId = makeIdFactory("CustomFieldValue");
export const userPreferenceId = makeIdFactory("UserPreference");
export const linkPreviewId = makeIdFactory("LinkPreview");
