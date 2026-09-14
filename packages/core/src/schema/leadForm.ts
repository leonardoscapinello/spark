import { z } from "zod";
import { zContactId, zFormSubmissionId, zLeadFormFieldId, zLeadFormId, zOrgId, zServerTimestamp } from "./zodHelpers.js";
export const LeadFormFieldSchema = z.object({ id: z.string().trim().min(1).max(80), label: z.string().trim().min(1).max(120), type: z.enum(["text", "email", "phone", "textarea", "select", "checkbox"]), mapping: z.enum(["name", "email", "phone", "company", "none"]), required: z.boolean().default(false), options: z.array(z.string().trim().min(1).max(120)).max(50).default([]) });
export type LeadFormField = z.infer<typeof LeadFormFieldSchema>;
export const LeadFormSchema = z.object({ id: zLeadFormId, orgId: zOrgId, name: z.string().trim().min(1).max(160), title: z.string().trim().min(1).max(200), description: z.string().max(1_000).nullable(), publicKey: z.string().min(20).max(100), status: z.enum(["draft", "published", "archived"]), fields: z.array(LeadFormFieldSchema).max(100).default([]), submitLabel: z.string().trim().min(1).max(60), successMessage: z.string().trim().min(1).max(500), createdAt: zServerTimestamp, updatedAt: zServerTimestamp });
export type LeadForm = z.infer<typeof LeadFormSchema>;
export const CreateLeadFormInputSchema = LeadFormSchema.pick({ id: true, name: true, title: true }).extend({ description: z.string().max(1_000).nullable().optional(), fields: z.array(LeadFormFieldSchema).min(1).max(100).optional(), submitLabel: z.string().trim().min(1).max(60).optional(), successMessage: z.string().trim().min(1).max(500).optional() });
export type CreateLeadFormInput = z.infer<typeof CreateLeadFormInputSchema>;
export const UpdateLeadFormInputSchema = LeadFormSchema.pick({ name: true, title: true, description: true, fields: true, submitLabel: true, successMessage: true }).partial();
export type UpdateLeadFormInput = z.infer<typeof UpdateLeadFormInputSchema>;
export const LeadFormWriteResponseSchema = z.object({ form: LeadFormSchema, txid: z.number().int() });
export const UpdateLeadFormStatusInputSchema = z.object({ published: z.boolean() });
export const PublicLeadFormSchema = LeadFormSchema.pick({ title: true, description: true, fields: true, submitLabel: true, successMessage: true, publicKey: true });
export type PublicLeadForm = z.infer<typeof PublicLeadFormSchema>;
export const SubmitLeadFormInputSchema = z.object({ id: zFormSubmissionId, values: z.record(z.string(), z.union([z.string().max(5_000), z.boolean()])), website: z.string().max(0).optional() });
export type SubmitLeadFormInput = z.infer<typeof SubmitLeadFormInputSchema>;
/* `values` não é coluna do envio (ADR-0035): mora em `form_submission_values`. */
export const FormSubmissionSchema = z.object({ id: zFormSubmissionId, orgId: zOrgId, formId: zLeadFormId, contactId: zContactId, values: SubmitLeadFormInputSchema.shape.values.optional(), createdAt: zServerTimestamp });
export type FormSubmission = z.infer<typeof FormSubmissionSchema>;
export const SubmitLeadFormResponseSchema = z.object({ successMessage: z.string(), contactId: zContactId.nullable() });
export type SubmitLeadFormResponse = z.infer<typeof SubmitLeadFormResponseSchema>;

/* O desenho do formulário como linha (ADR-0035). O tipo de aplicação continua
 * sendo `LeadFormField`; a tela junta campo e opções localmente. */
export const LeadFormFieldRowSchema = z.object({ id: zLeadFormFieldId, orgId: zOrgId, formId: zLeadFormId, key: z.string().min(1).max(80), label: z.string().min(1).max(120), type: LeadFormFieldSchema.shape.type, mapping: LeadFormFieldSchema.shape.mapping, required: z.boolean().default(false), placeholder: z.string().nullable().default(null), sortOrder: z.number().int().default(0), createdAt: zServerTimestamp });
export type LeadFormFieldRow = z.infer<typeof LeadFormFieldRowSchema>;
export const LeadFormFieldOptionSchema = z.object({ id: z.string().min(1), orgId: zOrgId, fieldId: zLeadFormFieldId, value: z.string().min(1).max(120), label: z.string().min(1).max(120), sortOrder: z.number().int().default(0) });
export type LeadFormFieldOption = z.infer<typeof LeadFormFieldOptionSchema>;
