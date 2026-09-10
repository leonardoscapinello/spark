import { z } from "zod";
import { zOrgId, zUserId, zEmail } from "./zodHelpers.js";

/**
 * Usuário — quem loga. Papel/permissão detalhados vivem em `permission_groups`
 * (docs/adr/0029-paineis-e-grupos-de-permissao.md); este schema é só a
 * identidade da conta, não a autorização.
 */
export const UserSchema = z.object({
  id: zUserId,
  orgId: zOrgId,
  nome: z.string().min(1, { error: "Nome é obrigatório" }).max(200),
  email: zEmail,
  avatarUrl: z.url().nullable(),
  criadoEm: z.iso.datetime(),
  atualizadoEm: z.iso.datetime(),
  desativadoEm: z.iso.datetime().nullable(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserInputSchema = UserSchema.omit({
  id: true,
  criadoEm: true,
  atualizadoEm: true,
  desativadoEm: true,
}).partial({ avatarUrl: true });
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
