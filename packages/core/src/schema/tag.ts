import { z } from "zod";
import { zCompanyId, zContactId, zOrgId, zProductId, zServerTimestamp, zTagId } from "./zodHelpers.js";

/**
 * Catálogo de marcações da organização (ADR-0035). `slug` é a forma
 * comparável — ver `tagSlug` em rules/tag.ts, que é quem a produz.
 */
export const TagSchema = z.object({
  id: zTagId,
  orgId: zOrgId,
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120),
  color: z.string().max(40).nullable().default(null),
  createdAt: zServerTimestamp,
  archivedAt: zServerTimestamp.nullable().default(null),
});
export type Tag = z.infer<typeof TagSchema>;

/** Vínculo entre uma pessoa e uma marcação. */
export const ContactTagSchema = z.object({
  orgId: zOrgId,
  contactId: zContactId,
  tagId: zTagId,
  createdAt: zServerTimestamp,
});
export type ContactTag = z.infer<typeof ContactTagSchema>;

/** Vínculo entre uma empresa e uma marcação. */
export const CompanyTagSchema = z.object({
  orgId: zOrgId,
  companyId: zCompanyId,
  tagId: zTagId,
  createdAt: zServerTimestamp,
});
export type CompanyTag = z.infer<typeof CompanyTagSchema>;

/** Vínculo entre um produto e uma marcação. */
export const ProductTagSchema = z.object({
  orgId: zOrgId,
  productId: zProductId,
  tagId: zTagId,
  createdAt: zServerTimestamp,
});
export type ProductTag = z.infer<typeof ProductTagSchema>;
