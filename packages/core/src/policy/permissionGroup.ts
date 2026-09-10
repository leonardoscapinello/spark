import { z } from "zod";
import { zOrgId, zPermissionGroupId } from "../schema/zodHelpers.js";
import { CAPACIDADES } from "./capability.js";

/**
 * Grupo → capacidades, nunca papel fixo (docs/adr/0029). Toda organização
 * nasce com cinco grupos padrão (ver gruposPadrao.ts) e pode criar os
 * próprios.
 */
export const PermissionGroupSchema = z.object({
  id: zPermissionGroupId,
  orgId: zOrgId,
  nome: z.string().min(1, { error: "Nome do grupo é obrigatório" }).max(100),
  capacidades: z.array(z.enum(CAPACIDADES)),
  criadoEm: z.iso.datetime(),
  atualizadoEm: z.iso.datetime(),
});

export type PermissionGroup = z.infer<typeof PermissionGroupSchema>;

// orgId nunca vem do cliente — mesma regra de contact.ts/user.ts
// (docs/adr/0026). id é obrigatório: mesma razão do docs/adr/0030 — se
// grupos algum dia entrarem em coleção local-first, a escrita otimista
// precisa da chave definitiva antes da resposta do servidor.
export const CreatePermissionGroupInputSchema = PermissionGroupSchema.omit({
  orgId: true,
  criadoEm: true,
  atualizadoEm: true,
});
export type CreatePermissionGroupInput = z.infer<typeof CreatePermissionGroupInputSchema>;

export const UpdatePermissionGroupInputSchema = CreatePermissionGroupInputSchema.omit({ id: true }).partial();
export type UpdatePermissionGroupInput = z.infer<typeof UpdatePermissionGroupInputSchema>;
