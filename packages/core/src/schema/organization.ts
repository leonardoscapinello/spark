import { z } from "zod";
import { zOrgId } from "./zodHelpers.js";

/**
 * Organization — the tenant. Every business table carries orgId + RLS
 * (docs/adr/0021, docs/adr/0022). This schema is the source of truth; API,
 * form, Drizzle, and the local collection all derive from it.
 */
export const OrganizationSchema = z.object({
  id: zOrgId,
  name: z.string().min(1, { error: "Organization name is required" }).max(200),
  slug: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { error: "Slug must be kebab-case (e.g. my-company)" }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  archivedAt: z.iso.datetime().nullable(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

export const CreateOrganizationInputSchema = OrganizationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
});
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationInputSchema>;
