import { CUSTOM_FIELD_ENTITIES, type CustomFieldEntity } from "../schema/customField.js";
import type { Capability } from "./capability.js";
export const CUSTOM_FIELD_WRITE_CAPABILITY: Record<CustomFieldEntity,Capability> = { contact:"contacts:write",company:"companies:write",deal:"deals:write",conversation:"inbox:write",activity:"activities:write",user:"users:manage",campaign:"campaigns:write",service_cycle:"inbox:write" };
const READ: Record<CustomFieldEntity,Capability> = { contact:"contacts:read",company:"companies:read",deal:"deals:read",conversation:"inbox:read",activity:"activities:read",user:"users:manage",campaign:"campaigns:read",service_cycle:"inbox:read" };
export function readableCustomFieldEntities(capabilities: readonly Capability[]): CustomFieldEntity[] { return CUSTOM_FIELD_ENTITIES.filter(entity => capabilities.includes(READ[entity])); }
