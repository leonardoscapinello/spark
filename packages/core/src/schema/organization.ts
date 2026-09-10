import { z } from "zod";
import { zOrgId } from "./zodHelpers.js";

/**
 * Organização — o tenant. Toda tabela de negócio carrega orgId + RLS
 * (docs/adr/0021, docs/adr/0022). Este schema é a fonte de verdade; API,
 * formulário, Drizzle e coleção local derivam dele.
 */
export const OrganizationSchema = z.object({
  id: zOrgId,
  nome: z.string().min(1, { error: "Nome da organização é obrigatório" }).max(200),
  slug: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { error: "Slug deve ser kebab-case (ex.: minha-empresa)" }),
  criadoEm: z.iso.datetime(),
  atualizadoEm: z.iso.datetime(),
  arquivadoEm: z.iso.datetime().nullable(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

export const CreateOrganizationInputSchema = OrganizationSchema.omit({
  id: true,
  criadoEm: true,
  atualizadoEm: true,
  arquivadoEm: true,
});
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationInputSchema>;
