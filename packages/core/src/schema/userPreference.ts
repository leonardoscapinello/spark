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
  /* A API devolve o valor montado. Ele é opcional porque a LINHA sincronizada
   * não o traz: lá o valor está nas colunas de `UserPreferenceRowSchema`, e a
   * tela junta com `fromPreferenceStorage` (ADR-0035). */
  value: UserPreferenceValueSchema.optional(),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type UserPreference = z.infer<typeof UserPreferenceSchema>;

/** Cria ou atualiza — a chave vem na rota. O id é o do cliente (ADR-0030) e só vale na criação. */
export const UpsertUserPreferenceInputSchema = z.object({ id: zUserPreferenceId, value: UserPreferenceValueSchema });
export type UpsertUserPreferenceInput = z.infer<typeof UpsertUserPreferenceInputSchema>;

export const UserPreferenceWriteResponseSchema = z.object({ preference: UserPreferenceSchema, txid: z.number().int() });
export type UserPreferenceWriteResponse = z.infer<typeof UserPreferenceWriteResponseSchema>;

/** Um item de uma preferência que é lista ou objeto (ADR-0035). */
export const UserPreferenceItemSchema = z.object({
  id: z.string().min(1),
  orgId: zOrgId,
  preferenceId: zUserPreferenceId,
  itemKey: z.string().nullable().default(null),
  sortOrder: z.number().int().default(0),
  valueText: z.string().nullable().default(null),
  valueNumber: z.union([z.number(), z.string()]).nullable().default(null),
  valueBoolean: z.boolean().nullable().default(null),
});
export type UserPreferenceItem = z.infer<typeof UserPreferenceItemSchema>;

/**
 * A linha como o Electric a entrega: o valor em colunas, não montado.
 *
 * Separada do contrato da API de propósito — `valueNumber` chega do Postgres
 * como texto (`numeric` preserva escala assim), e uma união número-ou-texto
 * não tem representação em JSON Schema, que é o que gera o cliente.
 */
export const UserPreferenceRowSchema = UserPreferenceSchema.extend({
  valueKind: z.enum(["text", "number", "boolean", "list", "object"]).optional(),
  valueText: z.string().nullable().optional(),
  valueNumber: z.union([z.number(), z.string()]).nullable().optional(),
  valueBoolean: z.boolean().nullable().optional(),
});
export type UserPreferenceRow = z.infer<typeof UserPreferenceRowSchema>;
