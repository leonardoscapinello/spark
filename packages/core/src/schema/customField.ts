import { z } from "zod";
import { zCustomFieldDefinitionId, zOrgId, zServerTimestamp, zUserId } from "./zodHelpers.js";
export const CUSTOM_FIELD_ENTITIES = ["contact", "company", "deal"] as const;
export const CUSTOM_FIELD_TYPES = ["text", "number", "date", "boolean", "single_select", "multi_select"] as const;
export type CustomFieldEntity = (typeof CUSTOM_FIELD_ENTITIES)[number]; export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];
export const CustomFieldDefinitionSchema = z.object({ id: zCustomFieldDefinitionId, orgId: zOrgId, entityType: z.enum(CUSTOM_FIELD_ENTITIES), key: z.string().min(1), label: z.string().min(1), type: z.enum(CUSTOM_FIELD_TYPES), required: z.boolean(), options: z.array(z.string()), createdBy: zUserId, createdAt: zServerTimestamp, updatedAt: zServerTimestamp, archivedAt: zServerTimestamp.nullable() });
export type CustomFieldDefinition = z.infer<typeof CustomFieldDefinitionSchema>;
export const CreateCustomFieldInputSchema = z.object({ id: zCustomFieldDefinitionId, entityType: z.enum(CUSTOM_FIELD_ENTITIES), key: z.string().trim().min(1).max(63).regex(/^[a-z][a-z0-9_]*$/), label: z.string().trim().min(1).max(120), type: z.enum(CUSTOM_FIELD_TYPES), required: z.boolean().default(false), options: z.array(z.string().trim().min(1).max(100)).max(100).default([]) }).superRefine((input, ctx) => { if ((input.type === "single_select" || input.type === "multi_select") && input.options.length === 0) ctx.addIssue({ code: "custom", path: ["options"], message: "Campos de seleção precisam de opções." }); });
export type CreateCustomFieldInput = z.infer<typeof CreateCustomFieldInputSchema>;
export const ArchiveCustomFieldInputSchema = z.object({ archived: z.boolean() });
export const CustomFieldWriteResponseSchema = z.object({ field: CustomFieldDefinitionSchema, txid: z.number().int() });
export type CustomFieldWriteResponse = z.infer<typeof CustomFieldWriteResponseSchema>;

export function normalizeCustomFieldValue(field: CustomFieldDefinition, value: unknown): unknown {
  if (value === "" || value === null || value === undefined) { if (field.required) throw new Error(`${field.label} é obrigatório.`); return null; }
  if (field.type === "text") return String(value).trim();
  if (field.type === "number") { const parsed = typeof value === "number" ? value : Number(value); if (!Number.isFinite(parsed)) throw new Error(`${field.label} precisa ser um número.`); return parsed; }
  if (field.type === "boolean") return value === true;
  if (field.type === "date") { const parsed = new Date(String(value)); if (Number.isNaN(parsed.getTime())) throw new Error(`${field.label} precisa ser uma data.`); return parsed.toISOString().slice(0, 10); }
  if (field.type === "single_select") { const selected = String(value); if (!field.options.includes(selected)) throw new Error(`Opção inválida em ${field.label}.`); return selected; }
  const selected = Array.isArray(value) ? value.map(String) : []; if (selected.some((item) => !field.options.includes(item))) throw new Error(`Opção inválida em ${field.label}.`); return selected;
}

/**
 * Par de leitura do normalizeCustomFieldValue: o que aquele grava, este exibe.
 * Nunca lança — formatar para a tela não é validação, e um valor estranho vindo
 * de import ou de versão antiga do campo precisa aparecer, não derrubar a lista.
 *
 * Data é formatada por texto, não por `new Date`: o valor gravado é um dia civil
 * ("2026-09-14"), e converter para Date o trataria como meia-noite UTC — em
 * Brasília isso exibe o dia anterior.
 */
export function formatCustomFieldValue(field: CustomFieldDefinition, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (field.type === "boolean") return value === true ? "Sim" : "Não";
  if (field.type === "number") return typeof value === "number" && Number.isFinite(value) ? new Intl.NumberFormat("pt-BR").format(value) : String(value);
  if (field.type === "date") { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value)); return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value); }
  if (field.type === "multi_select") return Array.isArray(value) ? value.map(String).join(", ") : String(value);
  return String(value);
}
