import { describe, expect, it, vi } from "vitest";
import type { LinkPreview, OrgId } from "@spark/core";
import { ResolveLinkPreviewUseCase } from "./resolve-link-preview.usecase.js";
import type { LinkMetadataFetcher } from "../infrastructure/link-metadata-fetcher.js";
import type { LinkPreviewsRepository } from "../infrastructure/link-previews.repository.js";

const org = "01999a61-d07a-7a91-89fc-a9a6bb8c1f43" as OrgId;
const stale: LinkPreview = {
  id: "01999a61-d07a-7a91-89fc-a9a6bb8c1f44",
  orgId: org,
  url: "https://example.com/article",
  urlHash: "a".repeat(64),
  canonicalUrl: null,
  title: "Título conhecido",
  description: "Descrição conhecida",
  imageUrl: null,
  siteName: "Example",
  faviconUrl: null,
  status: "ready",
  httpStatus: 200,
  fetchedAt: "2026-09-12T00:00:00.000Z",
  expiresAt: "2026-09-13T00:00:00.000Z",
  failureCount: 0,
  etag: null,
  lastModified: null,
  createdAt: "2026-09-12T00:00:00.000Z",
  updatedAt: "2026-09-12T00:00:00.000Z",
} as LinkPreview;

describe("ResolveLinkPreviewUseCase", () => {
  it("devolve a prévia vencida sem esperar a revalidação externa", async () => {
    const blockedFetch = new Promise<never>(() => undefined);
    const repository = {
      find: vi.fn().mockResolvedValue(stale),
      save: vi.fn(),
    };
    const fetcher = { fetch: vi.fn(() => blockedFetch) };
    const useCase = new ResolveLinkPreviewUseCase(
      repository as unknown as LinkPreviewsRepository,
      fetcher as unknown as LinkMetadataFetcher,
    );

    await expect(useCase.execute(org, stale.url)).resolves.toEqual({ preview: stale, txid: 0 });
    expect(fetcher.fetch).toHaveBeenCalledOnce();
    expect(repository.save).not.toHaveBeenCalled();
  });
});
