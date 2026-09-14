import { z } from "zod";
import { zLinkPreviewId, zOrgId, zServerTimestamp } from "./zodHelpers.js";

export const LinkPreviewStatusSchema = z.enum(["ready", "failed"]);

export const LinkPreviewSchema = z.object({
  id: zLinkPreviewId,
  orgId: zOrgId,
  url: z.url().max(2048),
  urlHash: z.string().length(64),
  canonicalUrl: z.url().max(2048).nullable(),
  title: z.string().max(500).nullable(),
  description: z.string().max(1000).nullable(),
  imageUrl: z.url().max(2048).nullable(),
  siteName: z.string().max(200).nullable(),
  faviconUrl: z.url().max(2048).nullable(),
  status: LinkPreviewStatusSchema,
  httpStatus: z.number().int().min(100).max(599).nullable(),
  fetchedAt: zServerTimestamp,
  expiresAt: zServerTimestamp,
  failureCount: z.number().int().nonnegative(),
  etag: z.string().max(500).nullable(),
  lastModified: z.string().max(500).nullable(),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type LinkPreview = z.infer<typeof LinkPreviewSchema>;

export const ResolveLinkPreviewInputSchema = z.object({ url: z.string().trim().min(1).max(2048) });
export type ResolveLinkPreviewInput = z.infer<typeof ResolveLinkPreviewInputSchema>;
export const ResolveLinkPreviewResponseSchema = z.object({ preview: LinkPreviewSchema, txid: z.number().int() });
export type ResolveLinkPreviewResponse = z.infer<typeof ResolveLinkPreviewResponseSchema>;

/**
 * Sem `new URL`: `packages/core` não declara DOM nem Node de propósito — a
 * mesma regra roda no navegador, no servidor e no React Native (ADR-0019), e
 * `URL` não existe nos três com o mesmo comportamento. A conferência é de
 * forma, e a mesma dos dois lados.
 */
export function normalizeLinkPreviewUrl(raw: string): string {
  const trimmed = raw.trim();
  const scheme = /^(https?):\/\//i.exec(trimmed);
  const protocolo = scheme?.[1];
  if (!scheme || protocolo === undefined) throw new Error("Use um endereço HTTP ou HTTPS.");

  const rest = trimmed.slice(scheme[0].length);
  const authority = rest.split(/[/?#]/, 1)[0] ?? "";
  // `usuario:senha@host` viraria credencial em log e em histórico.
  if (authority.includes("@")) throw new Error("O endereço não pode conter credenciais.");
  if (authority === "") throw new Error("Use um endereço HTTP ou HTTPS.");

  // O fragmento é do navegador, não do recurso: duas prévias do mesmo endereço
  // com âncoras diferentes seriam a mesma página buscada duas vezes.
  const semFragmento = trimmed.split("#", 1)[0] ?? trimmed;
  // Host não diferencia maiúscula de minúscula; o caminho diferencia. Baixar a
  // caixa do endereço inteiro transformaria /Path em /path e buscaria outra
  // página.
  const caminho = semFragmento.slice(scheme[0].length + authority.length);
  return `${protocolo.toLowerCase()}://${authority.toLowerCase()}${caminho}`;
}

export function linkPreviewNeedsRefresh(preview: Pick<LinkPreview, "expiresAt">, now = new Date()): boolean {
  return new Date(preview.expiresAt).getTime() <= now.getTime();
}
