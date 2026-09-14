import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { linkPreviewNeedsRefresh, normalizeLinkPreviewUrl, type LinkPreview, type OrgId } from "@spark/core";
import { LinkMetadataFetcher } from "../infrastructure/link-metadata-fetcher.js";
import { LinkPreviewsRepository } from "../infrastructure/link-previews.repository.js";

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;
const MIN_TTL_SECONDS = 15 * 60;
const MAX_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class ResolveLinkPreviewUseCase {
  constructor(private readonly previews: LinkPreviewsRepository, private readonly fetcher: LinkMetadataFetcher) {}

  async execute(orgId: OrgId, rawUrl: string): Promise<{ preview: LinkPreview; txid: number }> {
    const url = normalizeLinkPreviewUrl(rawUrl);
    const urlHash = createHash("sha256").update(url).digest("hex");
    const existing = await this.previews.find(orgId, urlHash);
    if (existing && existing.url !== url) throw new Error("Conflito de hash de endereço.");
    if (existing && !linkPreviewNeedsRefresh(existing)) return { preview: existing, txid: 0 };

    const fetchedAt = new Date();
    try {
      const metadata = await this.fetcher.fetch(url, existing ? { etag: existing.etag, lastModified: existing.lastModified } : undefined);
      const ttl = ttlSeconds(metadata.maxAgeSeconds);
      if ("notModified" in metadata) {
        if (!existing) throw new Error("O servidor respondeu sem conteúdo para uma prévia inexistente.");
        return this.previews.save(orgId, { ...persisted(existing), fetchedAt, expiresAt: new Date(fetchedAt.getTime() + ttl * 1000), failureCount: 0 });
      }
      return this.previews.save(orgId, {
        url, urlHash, canonicalUrl: metadata.canonicalUrl, title: metadata.title,
        description: metadata.description, imageUrl: metadata.imageUrl, siteName: metadata.siteName,
        faviconUrl: metadata.faviconUrl, status: "ready", httpStatus: metadata.httpStatus,
        fetchedAt, expiresAt: new Date(fetchedAt.getTime() + ttl * 1000), failureCount: 0,
        etag: metadata.etag, lastModified: metadata.lastModified,
      });
    } catch (error) {
      const failureCount = (existing?.failureCount ?? 0) + 1;
      const retrySeconds = Math.min(24 * 60 * 60, MIN_TTL_SECONDS * 2 ** Math.min(failureCount - 1, 7));
      return this.previews.save(orgId, {
        ...(existing ? persisted(existing) : empty(url, urlHash)),
        status: existing?.status === "ready" ? "ready" : "failed",
        httpStatus: httpStatus(error) ?? existing?.httpStatus ?? null,
        fetchedAt, expiresAt: new Date(fetchedAt.getTime() + retrySeconds * 1000), failureCount,
      });
    }
  }
}

function ttlSeconds(serverValue: number | null): number {
  return Math.min(MAX_TTL_SECONDS, Math.max(MIN_TTL_SECONDS, serverValue ?? DEFAULT_TTL_SECONDS));
}

function persisted(preview: LinkPreview) {
  return {
    url: preview.url, urlHash: preview.urlHash, canonicalUrl: preview.canonicalUrl,
    title: preview.title, description: preview.description, imageUrl: preview.imageUrl,
    siteName: preview.siteName, faviconUrl: preview.faviconUrl, status: preview.status,
    httpStatus: preview.httpStatus, etag: preview.etag, lastModified: preview.lastModified,
    failureCount: preview.failureCount, fetchedAt: new Date(preview.fetchedAt), expiresAt: new Date(preview.expiresAt),
  };
}

function empty(url: string, urlHash: string) {
  return { url, urlHash, canonicalUrl: null, title: null, description: null, imageUrl: null, siteName: null, faviconUrl: null, status: "failed" as const, httpStatus: null, etag: null, lastModified: null, failureCount: 0, fetchedAt: new Date(), expiresAt: new Date() };
}

function httpStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("httpStatus" in error)) return null;
  const value = (error as { httpStatus?: unknown }).httpStatus;
  return typeof value === "number" ? value : null;
}
