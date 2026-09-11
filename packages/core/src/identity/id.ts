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
