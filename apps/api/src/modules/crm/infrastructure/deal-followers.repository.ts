import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { createDbClient, dealFollowers, deals, users, withOrgContext, type SparkDb } from "@spark/db";
import type { DealFollower, DealId, OrgId, UserId } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";

@Injectable()
export class DealFollowersRepository {
  private readonly db: SparkDb = createDbClient(process.env.DATABASE_URL ?? "");
  constructor(private readonly events: DomainEventWriter) {}

  add(orgId: OrgId, actorUserId: UserId, dealId: DealId, userId: UserId): Promise<{ follower: DealFollower; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [[deal], [user]] = await Promise.all([
        tx.select({ id: deals.id }).from(deals).where(and(eq(deals.orgId, orgId), eq(deals.id, dealId))).limit(1),
        tx.select({ id: users.id }).from(users).where(and(eq(users.orgId, orgId), eq(users.id, userId))).limit(1),
      ]);
      if (!deal) throw new NotFoundException("Negócio não encontrado.");
      if (!user) throw new NotFoundException("Usuário não encontrado nesta empresa.");

      const [inserted] = await tx.insert(dealFollowers).values({ orgId, dealId, userId, createdBy: actorUserId })
        .onConflictDoNothing().returning();
      const [row] = inserted ? [inserted] : await tx.select().from(dealFollowers)
        .where(and(eq(dealFollowers.orgId, orgId), eq(dealFollowers.dealId, dealId), eq(dealFollowers.userId, userId))).limit(1);
      if (!row) throw new Error("Deal follower insert returned no row.");
      if (inserted) await this.events.append(tx, {
        orgId, actorUserId, dealId, type: "deal.follower_added",
        data: { userId, changes: [{ field: "followers", before: null, after: userId }] },
      });
      return { follower: toFollower(row), txid: await captureTxid(tx) };
    });
  }

  remove(orgId: OrgId, actorUserId: UserId, dealId: DealId, userId: UserId): Promise<{ follower: null; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.delete(dealFollowers).where(and(
        eq(dealFollowers.orgId, orgId),
        eq(dealFollowers.dealId, dealId),
        eq(dealFollowers.userId, userId),
      )).returning();
      if (!row) throw new NotFoundException("Este usuário não segue o negócio.");
      await this.events.append(tx, {
        orgId, actorUserId, dealId, type: "deal.follower_removed",
        data: { userId, changes: [{ field: "followers", before: userId, after: null }] },
      });
      return { follower: null, txid: await captureTxid(tx) };
    });
  }
}

async function captureTxid(tx: SparkDb): Promise<number> {
  const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  const row = rows[0];
  if (!row) throw new Error("Could not obtain the transaction's txid.");
  return Number(row.txid);
}

function toFollower(row: typeof dealFollowers.$inferSelect): DealFollower {
  return { ...row, createdAt: row.createdAt.toISOString() } as DealFollower;
}
