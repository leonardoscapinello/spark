import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, or, sql } from "drizzle-orm";
import { createDbClient, savedViews, withOrgContext, type SparkDb } from "@spark/db";
import type { CreateSavedViewInput, OrgId, SavedView, SavedViewId, UserId } from "@spark/core";

/**
 * No DomainEventWriter here — a saved view is a personal navigation
 * shortcut, not a business fact worth a timeline entry (matches
 * pipelines/stages, not contacts/deals).
 */
@Injectable()
export class SavedViewsRepository {
  private readonly db: SparkDb = createDbClient(process.env.DATABASE_URL ?? "");

  create(orgId: OrgId, userId: UserId, input: CreateSavedViewInput): Promise<{ view: SavedView; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.insert(savedViews).values({ ...input, orgId, createdBy: userId }).returning();
      if (!row) throw new Error("Saved view insert returned no row.");
      return { view: toView(row), txid: await captureTxid(tx) };
    });
  }

  /**
   * Anyone with contacts:read can create a view (it becomes visible to the
   * whole org, like the reference's shared segments), but only the person
   * who created it — or someone with contacts:write — can remove it.
   * requestingUserId is always checked; allowOthers just widens the OR.
   */
  archive(orgId: OrgId, id: SavedViewId, archived: boolean, requestingUserId: UserId, allowOthers: boolean): Promise<{ view: SavedView; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.update(savedViews)
        .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
        .where(and(eq(savedViews.id, id), or(eq(savedViews.createdBy, requestingUserId), allowOthers ? sql`true` : sql`false`)))
        .returning();
      if (!row) throw new NotFoundException("Visualização não encontrada, ou você não pode removê-la.");
      return { view: toView(row), txid: await captureTxid(tx) };
    });
  }
}

async function captureTxid(tx: SparkDb): Promise<number> {
  const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  const row = rows[0];
  if (!row) throw new Error("Could not obtain the transaction's txid.");
  return Number(row.txid);
}

function toView(row: typeof savedViews.$inferSelect): SavedView {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), archivedAt: row.archivedAt?.toISOString() ?? null } as SavedView;
}
