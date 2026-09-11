import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { createDbClient, withOrgContext, deals, type SparkDb } from "@spark/db";
import {
  money,
  toCents,
  type Deal,
  type CreateDealInput,
  type CloseDealInput,
  type EditDealInput,
  type OrgId,
  type DealId,
  type StageId,
} from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";

@Injectable()
export class DealsRepository {
  private readonly db: SparkDb;

  constructor(private readonly eventWriter: DomainEventWriter) {
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
  }

  async create(orgId: OrgId, input: CreateDealInput): Promise<{ deal: Deal; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);

      const [row] = await tx
        .insert(deals)
        .values({
          id: input.id,
          orgId,
          pipelineId: input.pipelineId,
          stageId: input.stageId,
          contactId: input.contactId ?? null,
          companyId: input.companyId ?? null,
          ownerId: input.ownerId ?? null,
          name: input.name,
          amount: toCents(input.amount),
          status: input.status ?? "open",
          expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
          lossReason: input.lossReason ?? null,
        })
        .returning();

      if (!row) throw new Error("Deal insert returned no row.");

      const deal = toDeal(row);
      await this.eventWriter.append(tx, { orgId, contactId: deal.contactId, companyId: deal.companyId, dealId: deal.id, type: "deal.created", data: { name: deal.name, stageId: deal.stageId } });
      return { deal, txid };
    });
  }

  /** The drag-and-drop action: only changes stageId, nothing else (roadmap.md, Fase 1). */
  async move(orgId: OrgId, dealId: DealId, stageId: StageId): Promise<{ deal: Deal; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);

      const [row] = await tx
        .update(deals)
        .set({ stageId, updatedAt: new Date() })
        .where(eq(deals.id, dealId))
        .returning();

      if (!row) throw new NotFoundException(`Deal ${dealId} not found.`);

      const deal = toDeal(row);
      await this.eventWriter.append(tx, { orgId, contactId: deal.contactId, companyId: deal.companyId, dealId: deal.id, type: "deal.stage_changed", data: { stageId: deal.stageId } });
      return { deal, txid };
    });
  }

  async edit(orgId: OrgId, dealId: DealId, input: EditDealInput): Promise<{ deal: Deal; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);
      const [row] = await tx
        .update(deals)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.amount !== undefined ? { amount: toCents(input.amount) } : {}),
          ...(input.contactId !== undefined ? { contactId: input.contactId } : {}),
          ...(input.companyId !== undefined ? { companyId: input.companyId } : {}),
          ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
          ...(input.expectedCloseDate !== undefined
            ? { expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(deals.id, dealId))
        .returning();

      if (!row) throw new NotFoundException(`Deal ${dealId} not found.`);
      const deal = toDeal(row);
      await this.eventWriter.append(tx, { orgId, contactId: deal.contactId, companyId: deal.companyId, dealId: deal.id, type: "deal.updated", data: { fields: Object.keys(input) } });
      return { deal, txid };
    });
  }

  /** Close as won or lost — the board's other central action. */
  async close(orgId: OrgId, dealId: DealId, input: CloseDealInput): Promise<{ deal: Deal; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);

      const [row] = await tx
        .update(deals)
        .set({
          status: input.status,
          lossReason: input.status === "lost" ? (input.lossReason ?? null) : null,
          updatedAt: new Date(),
        })
        .where(eq(deals.id, dealId))
        .returning();

      if (!row) throw new NotFoundException(`Deal ${dealId} not found.`);

      const deal = toDeal(row);
      await this.eventWriter.append(tx, { orgId, contactId: deal.contactId, companyId: deal.companyId, dealId: deal.id, type: input.status === "won" ? "deal.won" : "deal.lost", data: input.status === "lost" ? { reason: input.lossReason ?? null } : {} });
      return { deal, txid };
    });
  }
}

async function captureTxid(tx: SparkDb): Promise<number> {
  const txidRows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  const txidRow = txidRows[0];
  if (!txidRow) throw new Error("Could not obtain the transaction's txid.");
  return Number(txidRow.txid);
}

function toDeal(row: {
  id: string;
  orgId: string;
  pipelineId: string;
  stageId: string;
  contactId: string | null;
  companyId: string | null;
  ownerId: string | null;
  name: string;
  amount: number;
  status: string;
  expectedCloseDate: Date | null;
  lossReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): Deal {
  return {
    id: row.id,
    orgId: row.orgId,
    pipelineId: row.pipelineId,
    stageId: row.stageId,
    contactId: row.contactId,
    companyId: row.companyId,
    ownerId: row.ownerId,
    name: row.name,
    amount: money(row.amount),
    status: row.status,
    expectedCloseDate: row.expectedCloseDate?.toISOString() ?? null,
    lossReason: row.lossReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  } as Deal;
}
