import { Injectable, NotFoundException } from "@nestjs/common";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { coupons, createAppDbClient, dealAdjustments, installmentPolicies, withOrgContext, type SparkDb } from "@spark/db";
import {
  DomainError, money, normalizeCouponCode, toCents,
  type Coupon, type CouponId, type CreateCouponInput, type CreateInstallmentPolicyInput, type InstallmentPolicyId, type InstallmentPolicyRecord, type OrgId, type UpdateCouponInput, type UpdateInstallmentPolicyInput,
} from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";

/**
 * Condições comerciais pré-configuradas (ADR-0046): cupons e políticas de
 * parcelamento. São o cadastro que o negócio usa hoje e o checkout amanhã.
 */
@Injectable()
export class CommercialTermsRepository {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly events: DomainEventWriter) {}

  createCoupon(orgId: OrgId, input: CreateCouponInput): Promise<{ coupon: Coupon; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const code = normalizeCouponCode(input.code);
      await this.ensureFreeCode(tx, orgId, code);
      const [row] = await tx.insert(coupons).values({
        id: input.id, orgId, code, description: input.description ?? null, valueType: input.valueType, basisPoints: input.basisPoints ?? 0, amount: toCents(input.amount),
        appliesTo: input.appliesTo ?? "once", cycles: input.cycles ?? null, minimumSubtotal: input.minimumSubtotal ? toCents(input.minimumSubtotal) : null,
        startsAt: input.startsAt ? new Date(input.startsAt) : null, endsAt: input.endsAt ? new Date(input.endsAt) : null, maxRedemptions: input.maxRedemptions ?? null, active: input.active ?? true,
      }).returning();
      if (!row) throw new Error("Coupon insert returned no row.");
      await this.events.append(tx, { orgId, type: "coupon.created", data: { couponId: row.id, code } });
      return { coupon: toCoupon(row), txid: await captureTxid(tx) };
    });
  }

  updateCoupon(orgId: OrgId, id: CouponId, input: UpdateCouponInput): Promise<{ coupon: Coupon; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const code = input.code !== undefined ? normalizeCouponCode(input.code) : undefined;
      if (code) await this.ensureFreeCode(tx, orgId, code, id);
      const { amount, minimumSubtotal, startsAt, endsAt, code: _code, ...plain } = input;
      const [row] = await tx.update(coupons).set({
        ...plain,
        ...(code ? { code } : {}),
        ...(amount !== undefined ? { amount: toCents(amount) } : {}),
        ...(minimumSubtotal !== undefined ? { minimumSubtotal: minimumSubtotal ? toCents(minimumSubtotal) : null } : {}),
        ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : null } : {}),
        ...(endsAt !== undefined ? { endsAt: endsAt ? new Date(endsAt) : null } : {}),
        updatedAt: new Date(),
      }).where(and(eq(coupons.orgId, orgId), eq(coupons.id, id))).returning();
      if (!row) throw new NotFoundException("Cupom não encontrado.");
      await this.events.append(tx, { orgId, type: "coupon.updated", data: { couponId: id, fields: Object.keys(input) } });
      return { coupon: toCoupon(row), txid: await captureTxid(tx) };
    });
  }

  /** Cupom já usado não some (negócios guardam a foto dele): desative em vez de excluir. */
  removeCoupon(orgId: OrgId, id: CouponId): Promise<{ txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [usage] = await tx.select({ total: count() }).from(dealAdjustments).where(and(eq(dealAdjustments.orgId, orgId), eq(dealAdjustments.couponId, id)));
      if ((usage?.total ?? 0) > 0) throw new DomainError("INVALID_STATE", "Este cupom já foi usado em negócios. Desative-o em vez de excluir.");
      const [row] = await tx.delete(coupons).where(and(eq(coupons.orgId, orgId), eq(coupons.id, id))).returning();
      if (!row) throw new NotFoundException("Cupom não encontrado.");
      await this.events.append(tx, { orgId, type: "coupon.deleted", data: { couponId: id, code: row.code } });
      return { txid: await captureTxid(tx) };
    });
  }

  createPolicy(orgId: OrgId, input: CreateInstallmentPolicyInput): Promise<{ policy: InstallmentPolicyRecord; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      validatePolicy(input.maxInstallments, input.interestFreeInstallments);
      if (input.isDefault) await tx.update(installmentPolicies).set({ isDefault: false }).where(eq(installmentPolicies.orgId, orgId));
      const [row] = await tx.insert(installmentPolicies).values({
        id: input.id, orgId, name: input.name, maxInstallments: input.maxInstallments, interestFreeInstallments: input.interestFreeInstallments,
        monthlyInterestBasisPoints: input.monthlyInterestBasisPoints, minimumInstallment: toCents(input.minimumInstallment),
        upfrontDiscountBasisPoints: input.upfrontDiscountBasisPoints ?? 0, isDefault: input.isDefault ?? false, active: input.active ?? true,
      }).returning();
      if (!row) throw new Error("Installment policy insert returned no row.");
      await this.events.append(tx, { orgId, type: "installment_policy.created", data: { policyId: row.id, name: row.name } });
      return { policy: toPolicy(row), txid: await captureTxid(tx) };
    });
  }

  updatePolicy(orgId: OrgId, id: InstallmentPolicyId, input: UpdateInstallmentPolicyInput): Promise<{ policy: InstallmentPolicyRecord; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [before] = await tx.select().from(installmentPolicies).where(and(eq(installmentPolicies.orgId, orgId), eq(installmentPolicies.id, id))).limit(1);
      if (!before) throw new NotFoundException("Política de parcelamento não encontrada.");
      validatePolicy(input.maxInstallments ?? before.maxInstallments, input.interestFreeInstallments ?? before.interestFreeInstallments);
      if (input.isDefault) await tx.update(installmentPolicies).set({ isDefault: false }).where(and(eq(installmentPolicies.orgId, orgId), ne(installmentPolicies.id, id)));
      const { minimumInstallment, ...plain } = input;
      const [row] = await tx.update(installmentPolicies).set({ ...plain, ...(minimumInstallment !== undefined ? { minimumInstallment: toCents(minimumInstallment) } : {}), updatedAt: new Date() }).where(eq(installmentPolicies.id, id)).returning();
      if (!row) throw new NotFoundException("Política de parcelamento não encontrada.");
      await this.events.append(tx, { orgId, type: "installment_policy.updated", data: { policyId: id, fields: Object.keys(input) } });
      return { policy: toPolicy(row), txid: await captureTxid(tx) };
    });
  }

  removePolicy(orgId: OrgId, id: InstallmentPolicyId): Promise<{ txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.delete(installmentPolicies).where(and(eq(installmentPolicies.orgId, orgId), eq(installmentPolicies.id, id))).returning();
      if (!row) throw new NotFoundException("Política de parcelamento não encontrada.");
      await this.events.append(tx, { orgId, type: "installment_policy.deleted", data: { policyId: id, name: row.name } });
      return { txid: await captureTxid(tx) };
    });
  }

  private async ensureFreeCode(tx: SparkDb, orgId: OrgId, code: string, except?: CouponId) {
    const [clash] = await tx.select({ id: coupons.id }).from(coupons).where(and(eq(coupons.orgId, orgId), eq(coupons.code, code), ...(except ? [ne(coupons.id, except)] : []))).limit(1);
    if (clash) throw new DomainError("ALREADY_EXISTS", `Já existe um cupom com o código ${code}.`);
  }
}

function validatePolicy(maxInstallments: number, interestFree: number) {
  if (interestFree > maxInstallments) throw new DomainError("VALIDATION_FAILED", "As parcelas sem juros não podem passar do máximo de parcelas.");
}

async function captureTxid(tx: SparkDb): Promise<number> {
  const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  if (!rows[0]) throw new Error("Could not obtain transaction id.");
  return Number(rows[0].txid);
}

function toCoupon(row: typeof coupons.$inferSelect): Coupon {
  return { ...row, amount: money(row.amount), minimumSubtotal: row.minimumSubtotal === null ? null : money(row.minimumSubtotal), startsAt: row.startsAt?.toISOString() ?? null, endsAt: row.endsAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } as Coupon;
}

function toPolicy(row: typeof installmentPolicies.$inferSelect): InstallmentPolicyRecord {
  return { ...row, minimumInstallment: money(row.minimumInstallment), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } as InstallmentPolicyRecord;
}
