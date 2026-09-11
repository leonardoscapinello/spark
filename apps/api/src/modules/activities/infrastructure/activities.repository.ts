import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { createDbClient, withOrgContext, activities, type SparkDb } from "@spark/db";
import type { Activity, CreateActivityInput, OrgId, ActivityId } from "@spark/core";

@Injectable()
export class ActivitiesRepository {
  private readonly db: SparkDb;

  constructor() {
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
  }

  async create(orgId: OrgId, input: CreateActivityInput): Promise<{ activity: Activity; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);

      const [row] = await tx
        .insert(activities)
        .values({
          id: input.id,
          orgId,
          contactId: input.contactId ?? null,
          dealId: input.dealId ?? null,
          type: input.type,
          title: input.title,
          notes: input.notes ?? null,
          scheduledAt: new Date(input.scheduledAt),
        })
        .returning();

      if (!row) throw new Error("Activity insert returned no row.");

      return { activity: toActivity(row), txid };
    });
  }

  /** Complete or reopen — the same route both ways (docs/core/schema/activity.ts). */
  async complete(orgId: OrgId, id: ActivityId, completed: boolean): Promise<{ activity: Activity; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);

      const [row] = await tx
        .update(activities)
        .set({ completed, completedAt: completed ? new Date() : null, updatedAt: new Date() })
        .where(eq(activities.id, id))
        .returning();

      if (!row) throw new NotFoundException(`Activity ${id} not found.`);

      return { activity: toActivity(row), txid };
    });
  }
}

async function captureTxid(tx: SparkDb): Promise<number> {
  const txidRows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  const txidRow = txidRows[0];
  if (!txidRow) throw new Error("Could not obtain the transaction's txid.");
  return Number(txidRow.txid);
}

function toActivity(row: {
  id: string;
  orgId: string;
  contactId: string | null;
  dealId: string | null;
  type: string;
  title: string;
  notes: string | null;
  scheduledAt: Date;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Activity {
  return {
    id: row.id,
    orgId: row.orgId,
    contactId: row.contactId,
    dealId: row.dealId,
    type: row.type,
    title: row.title,
    notes: row.notes,
    scheduledAt: row.scheduledAt.toISOString(),
    completed: row.completed,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } as Activity;
}
