import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { CustomFieldWriter } from "../../settings/infrastructure/custom-field-writer.js";
import { and, eq, isNull, sql } from "drizzle-orm";
import { createAppDbClient, withOrgContext, deals, stages, stageTransitions, type SparkDb } from "@spark/db";
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
  canCloseAtStage,
  canMoveBetweenStages,
  stageMoveCooldownRemaining,
  auditChanges,
  type UserId,
} from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";

@Injectable()
export class DealsRepository {
  private readonly db: SparkDb;

  constructor(private readonly eventWriter: DomainEventWriter, private readonly customFields: CustomFieldWriter) {
    this.db = createAppDbClient();
  }

  exists(orgId: OrgId, id: DealId): Promise<boolean> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const rows = await tx.select({ id: deals.id }).from(deals)
        .where(and(eq(deals.orgId, orgId), eq(deals.id, id), isNull(deals.deletedAt))).limit(1);
      return rows.length > 0;
    });
  }

  async create(orgId: OrgId, actorUserId: UserId, input: CreateDealInput): Promise<{ deal: Deal; txid: number }> {
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
          stageEnteredAt: new Date(),
        })
        .returning();

      if (!row) throw new Error("Deal insert returned no row.");

      const deal = toDeal(row);

      // Espelha os campos personalizados nas colunas tipadas, na mesma transação (ADR-0035).

      if (input.customFields !== undefined) await this.customFields.write(tx, orgId, "deal", deal.id, input.customFields);
      await this.eventWriter.append(tx, { orgId, actorUserId, contactId: deal.contactId, companyId: deal.companyId, dealId: deal.id, type: "deal.created", data: { name: deal.name, stageId: deal.stageId } });
      return { deal, txid };
    });
  }

  /** The drag-and-drop action: only changes stageId, nothing else (roadmap.md, Fase 1). */
  async move(orgId: OrgId, actorUserId: UserId, dealId: DealId, stageId: StageId): Promise<{ deal: Deal; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);
      const [current] = await tx.select({ pipelineId: deals.pipelineId, stageId: deals.stageId, stageEnteredAt: deals.stageEnteredAt }).from(deals).where(and(eq(deals.orgId, orgId), eq(deals.id, dealId), isNull(deals.deletedAt))).limit(1);
      if (!current) throw new NotFoundException(`Deal ${dealId} not found.`);
      const [source] = await tx.select().from(stages).where(and(eq(stages.orgId, orgId), eq(stages.id, current.stageId))).limit(1);
      const [target] = await tx.select().from(stages).where(and(eq(stages.orgId, orgId), eq(stages.id, stageId), eq(stages.pipelineId, current.pipelineId))).limit(1);
      if (!target) throw new BadRequestException("A etapa não pertence ao funil deste negócio.");
      if (!source) throw new BadRequestException("A etapa atual não existe mais.");
      const cooldown = stageMoveCooldownRemaining(current.stageEnteredAt.toISOString(), new Date());
      if (cooldown > 0) throw new ConflictException(`Aguarde ${Math.ceil(cooldown / 1_000)} s antes de mover novamente.`);
      const transitionRows = source.restrictTransitions ? await tx.select().from(stageTransitions).where(and(eq(stageTransitions.orgId, orgId), eq(stageTransitions.fromStageId, source.id))) : [];
      if (!canMoveBetweenStages(source, target, transitionRows)) throw new BadRequestException("Esta transição não está disponível a partir da etapa atual.");

      const [row] = await tx
        .update(deals)
        .set({ stageId, stageEnteredAt: new Date(), updatedAt: new Date() })
        .where(eq(deals.id, dealId))
        .returning();

      if (!row) throw new NotFoundException(`Deal ${dealId} not found.`);

      const deal = toDeal(row);

      // Espelha os campos personalizados nas colunas tipadas, na mesma transação (ADR-0035).

      await this.eventWriter.append(tx, { orgId, actorUserId, contactId: deal.contactId, companyId: deal.companyId, dealId: deal.id, type: "deal.stage_changed", data: { fromStageId: current.stageId, stageId: deal.stageId, changes: [{ field: "stageId", before: current.stageId, after: deal.stageId }] } });
      return { deal, txid };
    });
  }

  async edit(orgId: OrgId, actorUserId: UserId, dealId: DealId, input: EditDealInput): Promise<{ deal: Deal; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);
      const [before] = await tx.select().from(deals).where(and(eq(deals.orgId, orgId), eq(deals.id, dealId), isNull(deals.deletedAt))).limit(1);
      if (!before) throw new NotFoundException(`Deal ${dealId} not found.`);
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
      // Espelha os campos personalizados nas colunas tipadas, na mesma transação (ADR-0035).
      const customChanges = input.customFields !== undefined ? await this.customFields.write(tx, orgId, "deal", deal.id, input.customFields) : [];
      const fields = Object.keys(input).filter((field) => field !== "customFields");
      const changes = [...auditChanges(before, row, fields), ...customChanges];
      if (changes.length > 0) await this.eventWriter.append(tx, { orgId, actorUserId, contactId: deal.contactId, companyId: deal.companyId, dealId: deal.id, type: "deal.updated", data: { fields: changes.map((change) => change.field), changes } });
      return { deal, txid };
    });
  }

  /** Close as won or lost — the board's other central action. */
  async close(orgId: OrgId, actorUserId: UserId, dealId: DealId, input: CloseDealInput): Promise<{ deal: Deal; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);
      const [current] = await tx.select({ allowWon: stages.allowWon, allowLost: stages.allowLost }).from(deals).innerJoin(stages, eq(stages.id, deals.stageId)).where(and(eq(deals.orgId, orgId), eq(deals.id, dealId), isNull(deals.deletedAt))).limit(1);
      if (!current) throw new NotFoundException(`Deal ${dealId} not found.`);
      if (!canCloseAtStage(current, input.status)) throw new BadRequestException(`Não é permitido marcar este negócio como ${input.status === "won" ? "ganho" : "perdido"} nesta etapa.`);

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

      // Espelha os campos personalizados nas colunas tipadas, na mesma transação (ADR-0035).

      await this.eventWriter.append(tx, { orgId, actorUserId, contactId: deal.contactId, companyId: deal.companyId, dealId: deal.id, type: input.status === "won" ? "deal.won" : "deal.lost", data: { ...(input.status === "lost" ? { reason: input.lossReason ?? null } : {}), changes: [{ field: "status", before: "open", after: input.status }] } });
      return { deal, txid };
    });
  }

  /** Reopen a won/lost deal and clear closing-only data. */
  async reopen(orgId: OrgId, actorUserId: UserId, dealId: DealId): Promise<{ deal: Deal; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txid = await captureTxid(tx);
      const [before] = await tx.select({ status: deals.status }).from(deals)
        .where(and(eq(deals.orgId, orgId), eq(deals.id, dealId), isNull(deals.deletedAt))).limit(1);
      if (!before) throw new NotFoundException(`Deal ${dealId} not found.`);
      const [row] = await tx
        .update(deals)
        .set({ status: "open", lossReason: null, updatedAt: new Date() })
        .where(and(eq(deals.orgId, orgId), eq(deals.id, dealId), isNull(deals.deletedAt)))
        .returning();

      if (!row) throw new NotFoundException(`Deal ${dealId} not found.`);
      const deal = toDeal(row);
      await this.eventWriter.append(tx, { orgId, actorUserId, contactId: deal.contactId, companyId: deal.companyId, dealId: deal.id, type: "deal.reopened", data: { changes: [{ field: "status", before: before.status, after: "open" }] } });
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
  stageEnteredAt: Date;
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
    stageEnteredAt: row.stageEnteredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  } as Deal;
}
