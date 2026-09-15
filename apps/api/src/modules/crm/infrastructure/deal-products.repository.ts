import { Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, sql } from "drizzle-orm";
import { createDbClient, dealProducts, deals, withOrgContext, type SparkDb } from "@spark/db";
import { auditChanges, dealProductsTotal, money, toCents, type CreateDealProductInput, type DealId, type DealProduct, type DealProductId, type Money, type OrgId, type UpdateDealProductInput, type UserId } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";

/**
 * Itens do negócio. Toda escrita aqui **recalcula `deals.amount`** na mesma
 * transação: o valor do negócio é a soma dos itens (packages/core/rules/
 * dealProducts), e o funil soma esse campo. Deixar os dois se separarem seria
 * um quadro que não bate com as propostas.
 */
@Injectable()
export class DealProductsRepository {
  private readonly db: SparkDb;

  constructor(private readonly eventWriter: DomainEventWriter) {
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
  }

  add(orgId: OrgId, actorUserId: UserId, input: CreateDealProductInput): Promise<{ item: DealProduct; dealAmount: Money; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.insert(dealProducts).values({
        id: input.id,
        orgId,
        dealId: input.dealId,
        productId: input.productId ?? null,
        variantId: input.variantId ?? null,
        name: input.name,
        quantityMilli: input.quantityMilli,
        unitAmount: toCents(input.unitAmount),
        discountBasisPoints: input.discountBasisPoints ?? 0,
        taxBasisPoints: input.taxBasisPoints ?? 0,
        sortOrder: input.sortOrder ?? 0,
      }).returning();
      if (!row) throw new Error("Deal product insert returned no row.");
      const item = toItem(row);
      const dealAmount = await this.syncDealAmount(tx, orgId, item.dealId);
      await this.eventWriter.append(tx, { orgId, actorUserId, dealId: item.dealId, type: "deal.updated", data: { fields: ["products"], changes: [{ field: "products", before: null, after: item.name }] } });
      return { item, dealAmount, txid: await captureTxid(tx) };
    });
  }

  change(orgId: OrgId, actorUserId: UserId, id: DealProductId, input: UpdateDealProductInput): Promise<{ item: DealProduct; dealAmount: Money; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [before] = await tx.select().from(dealProducts).where(eq(dealProducts.id, id)).limit(1);
      if (!before) throw new NotFoundException(`Deal product ${id} not found.`);
      const [row] = await tx.update(dealProducts).set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.quantityMilli !== undefined ? { quantityMilli: input.quantityMilli } : {}),
        ...(input.unitAmount !== undefined ? { unitAmount: toCents(input.unitAmount) } : {}),
        ...(input.discountBasisPoints !== undefined ? { discountBasisPoints: input.discountBasisPoints } : {}),
        ...(input.taxBasisPoints !== undefined ? { taxBasisPoints: input.taxBasisPoints } : {}),
        ...(input.productId !== undefined ? { productId: input.productId } : {}),
        ...(input.variantId !== undefined ? { variantId: input.variantId } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        updatedAt: new Date(),
      }).where(eq(dealProducts.id, id)).returning();
      if (!row) throw new NotFoundException(`Deal product ${id} not found.`);
      const item = toItem(row);
      const dealAmount = await this.syncDealAmount(tx, orgId, item.dealId);
      const fields = Object.keys(input);
      await this.eventWriter.append(tx, { orgId, actorUserId, dealId: item.dealId, type: "deal.updated", data: { fields: fields.map((field) => `product:${field}`), changes: auditChanges(before, row, fields).map((change) => ({ ...change, field: `product:${change.field}` })) } });
      return { item, dealAmount, txid: await captureTxid(tx) };
    });
  }

  remove(orgId: OrgId, actorUserId: UserId, id: DealProductId): Promise<{ item: null; dealAmount: Money; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.delete(dealProducts).where(eq(dealProducts.id, id)).returning();
      if (!row) throw new NotFoundException(`Deal product ${id} not found.`);
      const dealAmount = await this.syncDealAmount(tx, orgId, row.dealId as DealId);
      await this.eventWriter.append(tx, { orgId, actorUserId, dealId: row.dealId as DealId, type: "deal.updated", data: { fields: ["products"], changes: [{ field: "products", before: row.name, after: null }] } });
      return { item: null, dealAmount, txid: await captureTxid(tx) };
    });
  }

  /** Recalcula o valor do negócio pela regra do core e grava. */
  private async syncDealAmount(tx: SparkDb, orgId: OrgId, dealId: DealId): Promise<Money> {
    const rows = await tx.select().from(dealProducts).where(and(eq(dealProducts.orgId, orgId), eq(dealProducts.dealId, dealId))).orderBy(asc(dealProducts.sortOrder));
    const total = dealProductsTotal(rows.map(toItem));
    await tx.update(deals).set({ amount: toCents(total), updatedAt: new Date() }).where(eq(deals.id, dealId));
    return total;
  }
}

async function captureTxid(tx: SparkDb): Promise<number> {
  const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  const row = rows[0];
  if (!row) throw new Error("Could not obtain the transaction's txid.");
  return Number(row.txid);
}

function toItem(row: typeof dealProducts.$inferSelect): DealProduct {
  return {
    ...row,
    unitAmount: money(row.unitAmount),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } as DealProduct;
}
