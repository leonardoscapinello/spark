import { Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { createAppDbClient, linkPreviews, withOrgContext, type SparkDb } from "@spark/db";
import { linkPreviewId, type LinkPreview, type OrgId } from "@spark/core";

export interface PreviewWrite {
  url: string;
  urlHash: string;
  canonicalUrl: string | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
  faviconUrl: string | null;
  status: LinkPreview["status"];
  httpStatus: number | null;
  fetchedAt: Date;
  expiresAt: Date;
  failureCount: number;
  etag: string | null;
  lastModified: string | null;
}

@Injectable()
export class LinkPreviewsRepository {
  private readonly db: SparkDb;
  constructor() { this.db = createAppDbClient(); }

  find(orgId: OrgId, urlHash: string): Promise<LinkPreview | null> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.select().from(linkPreviews).where(and(eq(linkPreviews.orgId, orgId), eq(linkPreviews.urlHash, urlHash))).limit(1);
      return row ? toPreview(row) : null;
    });
  }

  save(orgId: OrgId, value: PreviewWrite): Promise<{ preview: LinkPreview; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const now = new Date();
      const [row] = await tx.insert(linkPreviews).values({ id: linkPreviewId.create(), orgId, ...value, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: [linkPreviews.orgId, linkPreviews.urlHash],
          set: { ...value, updatedAt: now },
        }).returning();
      if (!row) throw new Error("Link preview upsert returned no row.");
      const ids = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text AS txid`);
      if (!ids[0]) throw new Error("Could not obtain the transaction's txid.");
      return { preview: toPreview(row), txid: Number(ids[0].txid) };
    });
  }
}

function toPreview(row: typeof linkPreviews.$inferSelect): LinkPreview {
  return {
    ...row,
    fetchedAt: row.fetchedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } as LinkPreview;
}
