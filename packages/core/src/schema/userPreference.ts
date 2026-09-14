import { z } from "zod";
import { zOrgId, zServerTimestamp, zUserId, zUserPreferenceId } from "./zodHelpers.js";

/**
 * Preferência de interface de uma pessoa — sidebar fixada, colunas escondidas,
 * layout da lista. Vive no banco, não no localStorage: quem abre em outro
 * dispositivo continua de onde parou. É dado pessoal: a shape sincroniza só
 * as linhas do próprio usuário (apps/api sync), e a API grava só as dele.
 *
 * Chave em namespace por área, sempre `area.nome`: `rail.pinned`,
 * `contacts.hiddenColumns`, `inbox.layout`.
 */
export const UserPreferenceKeySchema = z.string().regex(/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/, "Chave de preferência no formato area.nome").max(80);
export const UserPreferenceValueSchema = z.union([z.boolean(), z.number(), z.string(), z.array(z.string()), z.record(z.string(), z.unknown())]);
export type UserPreferenceValue = z.infer<typeof UserPreferenceValueSchema>;

export const UserPreferenceSchema = z.object({
  id: zUserPreferenceId,
  orgId: zOrgId,
  userId: zUserId,
  key: UserPreferenceKeySchema,
  value: UserPreferenceValueSchema,
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type UserPreference = z.infer<typeof UserPreferenceSchema>;

/** Cria ou atualiza — a chave vem na rota. O id é o do cliente (ADR-0030) e só vale na criação. */
export const UpsertUserPreferenceInputSchema = z.object({ id: zUserPreferenceId, value: UserPreferenceValueSchema });
export type UpsertUserPreferenceInput = z.infer<typeof UpsertUserPreferenceInputSchema>;

export const UserPreferenceWriteResponseSchema = z.object({ preference: UserPreferenceSchema, txid: z.number().int() });
export type UserPreferenceWriteResponse = z.infer<typeof UserPreferenceWriteResponseSchema>;
