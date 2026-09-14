import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { createDbClient, withOrgContext, activities, type SparkDb } from "@spark/db";
import type { Activity, CreateActivityInput, OrgId, ActivityId, UpdateActivityInput } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";

@Injectable()
export class ActivitiesRepository {
  private readonly db: SparkDb;

  constructor(private readonly eventWriter: DomainEventWriter) {
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
          durationMinutes: input.durationMinutes ?? 30,
          location: input.location ?? null,
          ownerId: input.ownerId ?? null,
        })
        .returning();

      if (!row) throw new Error("Activity insert returned no row.");

      const activity = toActivity(row);
      await this.eventWriter.append(tx, { orgId, contactId: activity.contactId, dealId: activity.dealId, type: "activity.created", data: { activityId: activity.id, title: activity.title, activityType: activity.type, scheduledAt: activity.scheduledAt } });
      return { activity, txid };
    });
  }

  /** Editar uma atividade já criada — reagendar, trocar quem executa, corrigir o local. */
  async update(orgId: OrgId, id: ActivityId, input: UpdateActivityInput): Promise<{ activity: Activity; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);
      const [row] = await tx
        .update(activities)
        .set({
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.scheduledAt !== undefined ? { scheduledAt: new Date(input.scheduledAt) } : {}),
          ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
          ...(input.location !== undefined ? { location: input.location } : {}),
          ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
          ...(input.contactId !== undefined ? { contactId: input.contactId } : {}),
          ...(input.dealId !== undefined ? { dealId: input.dealId } : {}),
          updatedAt: new Date(),
        })
        .where(eq(activities.id, id))
        .returning();
      if (!row) throw new NotFoundException(`Activity ${id} not found.`);
      const activity = toActivity(row);
      await this.eventWriter.append(tx, { orgId, contactId: activity.contactId, dealId: activity.dealId, type: "activity.updated", data: { activityId: activity.id, fields: Object.keys(input) } });
      return { activity, txid };
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

      const activity = toActivity(row);
      await this.eventWriter.append(tx, { orgId, contactId: activity.contactId, dealId: activity.dealId, type: completed ? "activity.completed" : "activity.reopened", data: { activityId: activity.id, title: activity.title } });
      return { activity, txid };
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
  durationMinutes: number;
  location: string | null;
  ownerId: string | null;
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
    durationMinutes: row.durationMinutes,
    location: row.location,
    ownerId: row.ownerId,
    completed: row.completed,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } as Activity;
}
