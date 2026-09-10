import { z } from "zod";
import { zOrgId, zContactId } from "./zodHelpers.js";

/**
 * A peça que as quatro ferramentas de referência não têm — liga um canal
 * (e-mail, WhatsApp, Instagram...) ao mesmo contato. Ver
 * docs/arquitetura/visao-geral.md#identities. `UNIQUE (orgId, canal, valorExterno)`
 * é o que garante que uma identidade pertence a um contato só — a
 * constraint vive na migration, não aqui.
 */
export const CANAIS_DE_IDENTIDADE = [
  "email",
  "whatsapp",
  "instagram",
  "messenger",
  "telefone",
] as const;
export const CanalIdentidade = z.enum(CANAIS_DE_IDENTIDADE);
export type CanalIdentidade = z.infer<typeof CanalIdentidade>;

export const IdentitySchema = z.object({
  id: z.uuid(),
  orgId: zOrgId,
  contactId: zContactId,
  canal: CanalIdentidade,
  /** E-mail normalizado, telefone em E.164, PSID do Instagram... depende do canal. */
  valorExterno: z.string().min(1),
  verificado: z.boolean().default(false),
  criadoEm: z.iso.datetime(),
});

export type Identity = z.infer<typeof IdentitySchema>;

export const CreateIdentityInputSchema = IdentitySchema.omit({ id: true, criadoEm: true }).partial({
  verificado: true,
});
export type CreateIdentityInput = z.infer<typeof CreateIdentityInputSchema>;
