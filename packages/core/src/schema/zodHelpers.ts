/**
 * Bridge between Zod and core's branded types. A schema here is the ONLY
 * source of validation — TypeScript type, runtime validation, OpenAPI,
 * form, and Drizzle schema all derive from it (docs/adr/0004, docs/adr/0019).
 *
 * Pattern: `z.string().min(1).transform((value, ctx) => {...})` calling the
 * branded type's constructor. If the constructor throws, we turn it into
 * `z.NEVER` with an issue message — never duplicating the validation rule here.
 *
 * The `.min(1)` isn't just validation — an empty string would already fall
 * into the constructor's catch anyway. It's what makes zod v4 emit the
 * JSON Schema for ".nullable()" as `anyOf: [{type}, {type:"null"}]` instead
 * of the shorthand `type: [X,"null"]`. The shorthand is valid
 * json-schema-2020-12, but `@nestjs/swagger` reads a `type` array as
 * "property is an array" — it turns into a wrong `{type:"array"}` on the
 * input DTO of any optional, nullable field built with bridged(). anyOf
 * survives intact until nestjs-zod's cleanupOpenApiDoc, which correctly
 * converts it to `nullable: true` (confirmed by testing both paths
 * directly against zod's generator — see Bloco 6 history).
 */
import { z } from "zod";
import { email as toEmail, type Email } from "../format/email.js";
import { phone as toPhone, type Phone } from "../format/phone.js";
import { cpf as toCpf, cnpj as toCnpj, type CPF, type CNPJ } from "../format/document.js";
import { money as toMoney } from "../money/money.js";
import {
  orgId as toOrgId,
  contactId as toContactId,
  companyId as toCompanyId,
  userId as toUserId,
  dealId as toDealId,
  permissionGroupId as toPermissionGroupId,
  pipelineId as toPipelineId,
  stageId as toStageId,
  activityId as toActivityId,
  auditLogId as toAuditLogId,
  eventId as toEventId,
  identityId as toIdentityId,
  teamId as toTeamId,
  conversationId as toConversationId,
  messageId as toMessageId,
  automationId as toAutomationId,
  automationVersionId as toAutomationVersionId,
  type OrgId,
  type ContactId,
  type CompanyId,
  type UserId,
  type DealId,
  type PermissionGroupId,
  type PipelineId,
  type StageId,
  type ActivityId,
  type AuditLogId,
  type EventId,
  type IdentityId,
  type TeamId,
  type ConversationId,
  type MessageId,
  type AutomationId,
  type AutomationVersionId,
} from "../identity/id.js";

function bridged<Out>(build: (value: string) => Out) {
  return z.string().min(1, { error: "cannot be empty" }).transform((value, ctx) => {
    try {
      return build(value);
    } catch (error) {
      ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : "invalid" });
      return z.NEVER;
    }
  });
}

export const zEmail = bridged<Email>(toEmail);
export const zPhone = bridged<Phone>(toPhone);
export const zCpf = bridged<CPF>(toCpf);
export const zCnpj = bridged<CNPJ>(toCnpj);

export const zOrgId = bridged<OrgId>(toOrgId.from);
export const zContactId = bridged<ContactId>(toContactId.from);
export const zCompanyId = bridged<CompanyId>(toCompanyId.from);
export const zUserId = bridged<UserId>(toUserId.from);
export const zDealId = bridged<DealId>(toDealId.from);
export const zPermissionGroupId = bridged<PermissionGroupId>(toPermissionGroupId.from);
export const zPipelineId = bridged<PipelineId>(toPipelineId.from);
export const zStageId = bridged<StageId>(toStageId.from);
export const zActivityId = bridged<ActivityId>(toActivityId.from);
export const zAuditLogId = bridged<AuditLogId>(toAuditLogId.from);
export const zEventId = bridged<EventId>(toEventId.from);
export const zIdentityId = bridged<IdentityId>(toIdentityId.from);
export const zTeamId = bridged<TeamId>(toTeamId.from);
export const zConversationId = bridged<ConversationId>(toConversationId.from);
export const zMessageId = bridged<MessageId>(toMessageId.from);
export const zAutomationId = bridged<AutomationId>(toAutomationId.from);
export const zAutomationVersionId = bridged<AutomationVersionId>(toAutomationVersionId.from);

/**
 * Accepts integer cents — the wire format, never decimal. Stays strict on
 * purpose (`number` only, never `bigint`): this same schema feeds the
 * OpenAPI doc via `createZodDto`, and zod's `z.toJSONSchema()` (used under
 * the hood) throws `Error: BigInt cannot be represented in JSON Schema` —
 * found while trying to make `zMoney` accept bigint here to fix TanStack
 * DB revalidating a synced row; JSON Schema simply has no way to represent
 * bigint, full stop, not a limit you can work around. The right
 * accommodation for bigint lives only in
 * packages/data/src/deals-collection.ts, which never goes through
 * createZodDto — same reason `syncedAmount` already exists there for reads.
 */
export const zMoney = z.number().int().transform((value, ctx) => {
  try {
    return toMoney(value);
  } catch (error) {
    ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : "invalid" });
    return z.NEVER;
  }
});

/**
 * Server-generated timestamp (createdAt/updatedAt/etc. — never a field a
 * person types in). Accepts strict ISO 8601 (what the API returns, and
 * what an already-validated local write has) or any non-empty string: the
 * text Postgres/Electric sends on a synced row is not strict ISO
 * ("2026-09-10 22:42:39.07083+00" — space instead of "T", offset with no
 * colon) and the precision/format can vary with the environment's
 * DateStyle — pinning a specific regex would just trade one fragility for
 * another. Same reason `zMoney` accepts bigint: the field is never written
 * by a client, only read back by TanStack DB itself when it revalidates
 * the whole record on `update()`.
 */
export const zServerTimestamp = z.union([z.iso.datetime(), z.string().min(1)]);
