import { z } from "zod";
import { zCustomFieldDefinitionId, zCustomFieldOptionId, zCustomFieldValueId, zOrgId, zServerTimestamp } from "./zodHelpers.js";
import { CUSTOM_FIELD_ENTITIES } from "./customField.js";

/** Opção de um campo de seleção, como linha (ADR-0035). */
export const CustomFieldOptionSchema = z.object({
  id: zCustomFieldOptionId,
  orgId: zOrgId,
  fieldId: zCustomFieldDefinitionId,
  value: z.string().min(1).max(200),
  label: z.string().min(1).max(200),
  sortOrder: z.number().int().min(0).default(0),
  archivedAt: zServerTimestamp.nullable(),
  createdAt: zServerTimestamp,
});
export type CustomFieldOption = z.infer<typeof CustomFieldOptionSchema>;

/**
 * Valor de um campo personalizado. Uma coluna por tipo — quem lê usa
 * `fromCustomFieldRows` (packages/core/rules/customFieldStorage) para juntar
 * as linhas de um campo no valor que a aplicação usa.
 */
export const CustomFieldValueSchema = z.object({
  id: zCustomFieldValueId,
  orgId: zOrgId,
  fieldId: zCustomFieldDefinitionId,
  entityType: z.enum(CUSTOM_FIELD_ENTITIES),
  entityId: z.string().min(1),
  valueText: z.string().nullable().default(null),
  valueNumber: z.union([z.number(), z.string()]).nullable().default(null),
  valueMoney: z.number().nullable().default(null),
  valueDate: z.string().nullable().default(null),
  valueTimestamp: z.string().nullable().default(null),
  valueBoolean: z.boolean().nullable().default(null),
  optionId: zCustomFieldOptionId.nullable().default(null),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type CustomFieldValue = z.infer<typeof CustomFieldValueSchema>;
