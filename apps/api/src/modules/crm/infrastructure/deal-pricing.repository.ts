import { Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { coupons, createAppDbClient, dealAdjustments, dealProducts, deals, installmentPolicies, withOrgContext, type SparkDb } from "@spark/db";
import {
  COUPON_REJECTION_MESSAGE, DomainError, couponRejection, installmentQuote, money, normalizeCouponCode, pricingOfDeal, toCents, toInstallmentPolicy,
  type ApplyCouponInput, type CreateDealAdjustmentInput, type DealAdjustment, type DealAdjustmentId, type DealId, type Money, type OrgId,
  type DealPricing, type UpdateDealAdjustmentInput, type UpdateDealTermsInput, type UserId,
} from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";

/**
 * Precificação do negócio (ADR-0046) no servidor. Toda escrita que muda o
 * preço — item, ajuste, cupom, condições — termina em `recalculateDealAmount`,
 * que grava em `deals.amount` o valor do contrato calculado pelo core. O funil
 * soma esse campo; a tela calcula o mesmo número com a mesma função.
 */
/** A linha pai é travada antes de qualquer escrita nos itens, ajustes ou condições. */
export async function lockDealPricing(tx: SparkDb, orgId: OrgId, dealId: DealId) {
  const [deal] = await tx.select().from(deals).where(and(eq(deals.orgId, orgId), eq(deals.id, dealId), isNull(deals.deletedAt))).limit(1).for("update");
  if (!deal) throw new NotFoundException("Negócio não encontrado.");
  return deal;
}

export async function loadDealPricing(tx: SparkDb, orgId: OrgId, dealId: DealId): Promise<DealPricing> {
  const [deal] = await tx.select({ subscriptionInterval: deals.subscriptionInterval, subscriptionCycles: deals.subscriptionCycles, contractMonths: deals.contractMonths }).from(deals).where(and(eq(deals.orgId, orgId), eq(deals.id, dealId))).limit(1);
  if (!deal) throw new NotFoundException("Negócio não encontrado.");
  const items = await tx.select().from(dealProducts).where(and(eq(dealProducts.orgId, orgId), eq(dealProducts.dealId, dealId))).orderBy(asc(dealProducts.sortOrder));
  const adjustments = await tx.select().from(dealAdjustments).where(and(eq(dealAdjustments.orgId, orgId), eq(dealAdjustments.dealId, dealId))).orderBy(asc(dealAdjustments.sortOrder));
  return pricingOfDeal(
    { subscriptionInterval: deal.subscriptionInterval as DealTermsInterval, subscriptionCycles: deal.subscriptionCycles, contractMonths: deal.contractMonths },
    items.map(item => ({ quantityMilli: item.quantityMilli, unitAmount: money(item.unitAmount), discountBasisPoints: item.discountBasisPoints, discountAmount: money(item.discountAmount), taxBasisPoints: item.taxBasisPoints, recurring: item.recurring })),
    adjustments.map(toAdjustment),
  );
}

export async function recalculateDealAmount(tx: SparkDb, orgId: OrgId, dealId: DealId): Promise<Money> {
  const { contractValue } = await loadDealPricing(tx, orgId, dealId);
  await tx.update(deals).set({ amount: toCents(contractValue), updatedAt: new Date() }).where(eq(deals.id, dealId));
  return contractValue;
}

type DealTermsInterval = "month" | "quarter" | "semester" | "year" | null;

@Injectable()
export class DealPricingRepository {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly events: DomainEventWriter) {}

  addAdjustment(orgId: OrgId, actorUserId: UserId, input: CreateDealAdjustmentInput): Promise<{ adjustment: DealAdjustment; dealAmount: Money; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      await lockDealPricing(tx, orgId, input.dealId);
      await requireItems(tx, orgId, input.dealId);
      const [row] = await tx.insert(dealAdjustments).values({
        id: input.id, orgId, dealId: input.dealId, kind: input.kind, label: input.label, valueType: input.valueType,
        basisPoints: input.basisPoints ?? 0, amount: toCents(input.amount), appliesTo: input.appliesTo ?? "once", cycles: input.cycles ?? null, sortOrder: input.sortOrder ?? 0,
      }).returning();
      if (!row) throw new Error("Deal adjustment insert returned no row.");
      const dealAmount = await recalculateDealAmount(tx, orgId, input.dealId);
      await this.audit(tx, orgId, actorUserId, input.dealId, null, row.label);
      return { adjustment: toAdjustment(row), dealAmount, txid: await captureTxid(tx) };
    });
  }

  changeAdjustment(orgId: OrgId, actorUserId: UserId, id: DealAdjustmentId, input: UpdateDealAdjustmentInput): Promise<{ adjustment: DealAdjustment; dealAmount: Money; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      await lockAdjustmentDeal(tx, orgId, id);
      const [before] = await tx.select().from(dealAdjustments).where(eq(dealAdjustments.id, id)).limit(1);
      if (!before) throw new NotFoundException("Ajuste não encontrado.");
      if (before.couponId) throw new DomainError("INVALID_STATE", "Cupom aplicado não se edita: remova e aplique de novo.");
      const [row] = await tx.update(dealAdjustments).set({
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.valueType !== undefined ? { valueType: input.valueType } : {}),
        ...(input.basisPoints !== undefined ? { basisPoints: input.basisPoints } : {}),
        ...(input.amount !== undefined ? { amount: toCents(input.amount) } : {}),
        ...(input.appliesTo !== undefined ? { appliesTo: input.appliesTo } : {}),
        ...(input.cycles !== undefined ? { cycles: input.cycles } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        updatedAt: new Date(),
      }).where(eq(dealAdjustments.id, id)).returning();
      if (!row) throw new NotFoundException("Ajuste não encontrado.");
      const dealAmount = await recalculateDealAmount(tx, orgId, row.dealId as DealId);
      await this.audit(tx, orgId, actorUserId, row.dealId as DealId, before.label, row.label);
      return { adjustment: toAdjustment(row), dealAmount, txid: await captureTxid(tx) };
    });
  }

  removeAdjustment(orgId: OrgId, actorUserId: UserId, id: DealAdjustmentId): Promise<{ adjustment: null; dealAmount: Money; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      await lockAdjustmentDeal(tx, orgId, id);
      const [row] = await tx.delete(dealAdjustments).where(eq(dealAdjustments.id, id)).returning();
      if (!row) throw new NotFoundException("Ajuste não encontrado.");
      const dealAmount = await recalculateDealAmount(tx, orgId, row.dealId as DealId);
      await this.audit(tx, orgId, actorUserId, row.dealId as DealId, row.label, null);
      return { adjustment: null, dealAmount, txid: await captureTxid(tx) };
    });
  }

  /** Valida o cupom pelo código (janela, mínimo, usos) e grava a foto dele como ajuste. */
  applyCoupon(orgId: OrgId, actorUserId: UserId, input: ApplyCouponInput, now: Date): Promise<{ adjustment: DealAdjustment; dealAmount: Money; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      await lockDealPricing(tx, orgId, input.dealId);
      await requireItems(tx, orgId, input.dealId);
      const code = normalizeCouponCode(input.code);
      const [coupon] = await tx.select().from(coupons).where(and(eq(coupons.orgId, orgId), eq(coupons.code, code))).limit(1).for("update");
      if (!coupon) throw new DomainError("NOT_FOUND", `Cupom ${code} não existe.`);
      const [already] = await tx.select({ id: dealAdjustments.id }).from(dealAdjustments).where(and(eq(dealAdjustments.orgId, orgId), eq(dealAdjustments.dealId, input.dealId), eq(dealAdjustments.couponId, coupon.id))).limit(1);
      if (already) throw new DomainError("ALREADY_EXISTS", `O cupom ${code} já está aplicado neste negócio.`);
      const [usage] = await tx.select({ total: count() }).from(dealAdjustments).where(and(eq(dealAdjustments.orgId, orgId), eq(dealAdjustments.couponId, coupon.id)));

      const pricing = await loadDealPricing(tx, orgId, input.dealId);
      const subtotal = coupon.appliesTo === "recurring" ? pricing.recurring?.subtotal ?? money(0) : pricing.once.subtotal;
      const rejection = couponRejection({ code: coupon.code, active: coupon.active, startsAt: coupon.startsAt?.toISOString() ?? null, endsAt: coupon.endsAt?.toISOString() ?? null, minimumSubtotal: coupon.minimumSubtotal === null ? null : money(coupon.minimumSubtotal), maxRedemptions: coupon.maxRedemptions }, { subtotal, now, redemptions: usage?.total ?? 0 });
      if (rejection) throw new DomainError("VALIDATION_FAILED", COUPON_REJECTION_MESSAGE[rejection], { reason: rejection });
      if (coupon.appliesTo === "recurring" && !pricing.recurring) throw new DomainError("VALIDATION_FAILED", "Este cupom vale para assinatura, e o negócio não tem item recorrente.");

      const [row] = await tx.insert(dealAdjustments).values({
        id: input.id, orgId, dealId: input.dealId, kind: "coupon", label: coupon.code, valueType: coupon.valueType,
        basisPoints: coupon.basisPoints, amount: coupon.amount, appliesTo: coupon.appliesTo, cycles: coupon.cycles, couponId: coupon.id, sortOrder: 0,
      }).returning();
      if (!row) throw new Error("Coupon adjustment insert returned no row.");
      const dealAmount = await recalculateDealAmount(tx, orgId, input.dealId);
      await this.audit(tx, orgId, actorUserId, input.dealId, null, `Cupom ${coupon.code}`);
      return { adjustment: toAdjustment(row), dealAmount, txid: await captureTxid(tx) };
    });
  }

  /** Assinatura e parcelamento. O parcelamento é conferido contra a política (máximo e parcela mínima). */
  updateTerms(orgId: OrgId, actorUserId: UserId, dealId: DealId, input: UpdateDealTermsInput): Promise<{ dealAmount: Money; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const before = await lockDealPricing(tx, orgId, dealId);
      const changes = {
        ...(input.subscriptionInterval !== undefined ? { subscriptionInterval: input.subscriptionInterval } : {}),
        ...(input.subscriptionCycles !== undefined ? { subscriptionCycles: input.subscriptionCycles } : {}),
        ...(input.contractMonths !== undefined ? { contractMonths: input.contractMonths } : {}),
        ...(input.installmentPolicyId !== undefined ? { installmentPolicyId: input.installmentPolicyId } : {}),
        ...(input.installments !== undefined ? { installments: input.installments } : {}),
      };
      await tx.update(deals).set({ ...changes, updatedAt: new Date() }).where(eq(deals.id, dealId));
      const [item] = await tx.select({ id: dealProducts.id }).from(dealProducts).where(and(eq(dealProducts.orgId, orgId), eq(dealProducts.dealId, dealId))).limit(1);
      const dealAmount = item ? await recalculateDealAmount(tx, orgId, dealId) : money(before.amount);

      const policyId = input.installmentPolicyId !== undefined ? input.installmentPolicyId : before.installmentPolicyId;
      const installments = input.installments ?? before.installments;
      if (policyId && installments > 1) {
        const [policy] = await tx.select().from(installmentPolicies).where(and(eq(installmentPolicies.orgId, orgId), eq(installmentPolicies.id, policyId))).limit(1);
        if (!policy) throw new DomainError("NOT_FOUND", "Política de parcelamento não encontrada.");
        const { once } = await loadDealPricing(tx, orgId, dealId);
        installmentQuote(item ? once.total : dealAmount, toInstallmentPolicy({ ...policy, minimumInstallment: money(policy.minimumInstallment) }), installments);
      }

      const fields = Object.keys(changes);
      if (fields.length) await this.events.append(tx, { orgId, actorUserId, dealId, type: "deal.updated", data: { fields: fields.map(field => `terms:${field}`), changes: fields.map(field => ({ field: `terms:${field}`, before: (before as Record<string, unknown>)[field] ?? null, after: (changes as Record<string, unknown>)[field] ?? null })) } });
      return { dealAmount, txid: await captureTxid(tx) };
    });
  }

  private audit(tx: SparkDb, orgId: OrgId, actorUserId: UserId, dealId: DealId, before: string | null, after: string | null) {
    return this.events.append(tx, { orgId, actorUserId, dealId, type: "deal.updated", data: { fields: ["adjustments"], changes: [{ field: "adjustments", before, after }] } });
  }
}

/** Sem itens o valor do negócio é digitado à mão; ajuste nenhum entra por cima dele. */
async function requireItems(tx: SparkDb, orgId: OrgId, dealId: DealId) {
  const [item] = await tx.select({ id: dealProducts.id }).from(dealProducts).where(and(eq(dealProducts.orgId, orgId), eq(dealProducts.dealId, dealId))).limit(1);
  if (!item) throw new DomainError("INVALID_STATE", "Adicione os itens do negócio antes de descontos, cupons e taxas.");
}

async function captureTxid(tx: SparkDb): Promise<number> {
  const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  const row = rows[0];
  if (!row) throw new Error("Could not obtain the transaction's txid.");
  return Number(row.txid);
}

function toAdjustment(row: typeof dealAdjustments.$inferSelect): DealAdjustment {
  return { ...row, amount: money(row.amount), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } as DealAdjustment;
}

async function lockAdjustmentDeal(tx: SparkDb, orgId: OrgId, id: DealAdjustmentId) {
  const [adjustment] = await tx.select({ dealId: dealAdjustments.dealId }).from(dealAdjustments).where(and(eq(dealAdjustments.orgId, orgId), eq(dealAdjustments.id, id))).limit(1);
  if (!adjustment) throw new NotFoundException("Ajuste não encontrado.");
  await lockDealPricing(tx, orgId, adjustment.dealId as DealId);
}
