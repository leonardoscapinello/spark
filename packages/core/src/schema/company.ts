import { z } from "zod";
import { zCompanyId, zEmail, zOrgId, zPhone, zServerTimestamp, zUserId } from "./zodHelpers.js";

export const CompanySchema = z.object({
  id: zCompanyId,
  orgId: zOrgId,
  parentCompanyId: zCompanyId.nullable(),
  ownerId: zUserId.nullable(),
  name: z.string().trim().min(1, { error: "Company name is required" }).max(200),
  legalName: z.string().trim().min(1).max(240).nullable(),
  taxId: z.string().trim().min(1).max(40).nullable(),
  website: z.url().nullable(),
  industry: z.string().trim().min(1).max(120).nullable(),
  email: zEmail.nullable(),
  phone: zPhone.nullable(),
  address: z.string().trim().min(1).max(500).nullable(),
  customFields: z.record(z.string(), z.unknown()).default({}),
  tags: z.array(z.string()).default([]),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
  deletedAt: zServerTimestamp.nullable(),
});
export type Company = z.infer<typeof CompanySchema>;

export const CreateCompanyInputSchema = CompanySchema.omit({ orgId: true, createdAt: true, updatedAt: true, deletedAt: true }).partial({
  parentCompanyId: true,
  ownerId: true,
  legalName: true,
  taxId: true,
  website: true,
  industry: true,
  email: true,
  phone: true,
  address: true,
  customFields: true,
  tags: true,
});
export type CreateCompanyInput = z.infer<typeof CreateCompanyInputSchema>;

export const UpdateCompanyInputSchema = CreateCompanyInputSchema.omit({ id: true }).partial();
export type UpdateCompanyInput = z.infer<typeof UpdateCompanyInputSchema>;
export const UpdateCompanyArchiveInputSchema = z.object({ archived: z.boolean() });

export const CompanyWriteResponseSchema = z.object({ company: CompanySchema, txid: z.number().int() });
export type CompanyWriteResponse = z.infer<typeof CompanyWriteResponseSchema>;
