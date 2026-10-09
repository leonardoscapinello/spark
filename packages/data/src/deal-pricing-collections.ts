import { registerSessionCollection } from "./session-collections.js";
import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { CouponSchema, DealAdjustmentSchema, InstallmentPolicySchema, toCents, type Coupon, type DealAdjustment, type InstallmentPolicyRecord } from "@spark/core";
import {
  commercialTermsControllerCreateCoupon, commercialTermsControllerCreatePolicy, commercialTermsControllerRemoveCoupon, commercialTermsControllerRemovePolicy,
  commercialTermsControllerUpdateCoupon, commercialTermsControllerUpdatePolicy, dealAdjustmentsControllerAdd, dealAdjustmentsControllerChange, dealAdjustmentsControllerRemove,
} from "@spark/api-client";
import { sparkShapeOptions } from "./shape-options.js";
import { confirmed } from "./confirmed.js";

/**
 * Precificação do negócio (ADR-0046). Ajustes do negócio escrevem pela
 * coleção (otimista); cupom aplicado passa pelo comando `applyCoupon` da API,
 * que valida e grava a foto — a linha chega aqui pelo Electric.
 */
export function createDealAdjustmentsCollection() {
  return registerSessionCollection(createCollection(electricCollectionOptions({
    gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "deal_adjustments",
    schema: DealAdjustmentSchema,
    getKey: (item) => item.id,
    shapeOptions: sparkShapeOptions("deal_adjustments"),
    onInsert: async ({ transaction }) => {
      const item = transaction.mutations[0]?.modified;
      if (!item) throw new Error("onInsert called with no pending mutation.");
      return confirmed(await dealAdjustmentsControllerAdd({ id: item.id, dealId: item.dealId, kind: item.kind, label: item.label, valueType: item.valueType, basisPoints: item.basisPoints, amount: toCents(item.amount), appliesTo: item.appliesTo, cycles: item.cycles, sortOrder: item.sortOrder }));
    },
    onUpdate: async ({ transaction }) => {
      const mutation = transaction.mutations[0];
      if (!mutation) throw new Error("onUpdate called with no pending mutation.");
      const item = mutation.modified;
      return confirmed(await dealAdjustmentsControllerChange(mutation.original.id, { label: item.label, valueType: item.valueType, basisPoints: item.basisPoints, amount: toCents(item.amount), appliesTo: item.appliesTo, cycles: item.cycles, sortOrder: item.sortOrder }));
    },
    onDelete: async ({ transaction }) => {
      const mutation = transaction.mutations[0];
      if (!mutation) throw new Error("onDelete called with no pending mutation.");
      return confirmed(await dealAdjustmentsControllerRemove(mutation.original.id));
    },
  })));
}
export type DealAdjustmentsCollection = ReturnType<typeof createDealAdjustmentsCollection>;

/** A coleção recebe centavos na inserção (o schema transforma em Money). */
export function adjustmentForInsert(item: DealAdjustment) { return { ...item, amount: toCents(item.amount) }; }

export function createCouponsCollection() {
  return registerSessionCollection(createCollection(electricCollectionOptions({
    gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "coupons",
    schema: CouponSchema,
    getKey: (item) => item.id,
    shapeOptions: sparkShapeOptions("coupons"),
    onInsert: async ({ transaction }) => {
      const item = transaction.mutations[0]?.modified;
      if (!item) throw new Error("onInsert called with no pending mutation.");
      return confirmed(await commercialTermsControllerCreateCoupon(couponBody(item, true) as Parameters<typeof commercialTermsControllerCreateCoupon>[0]));
    },
    onUpdate: async ({ transaction }) => {
      const mutation = transaction.mutations[0];
      if (!mutation) throw new Error("onUpdate called with no pending mutation.");
      return confirmed(await commercialTermsControllerUpdateCoupon(mutation.original.id, couponBody(mutation.modified, false)));
    },
    onDelete: async ({ transaction }) => {
      const mutation = transaction.mutations[0];
      if (!mutation) throw new Error("onDelete called with no pending mutation.");
      return confirmed(await commercialTermsControllerRemoveCoupon(mutation.original.id));
    },
  })));
}
export type CouponsCollection = ReturnType<typeof createCouponsCollection>;

function couponBody(item: Coupon, withId: boolean) {
  return {
    ...(withId ? { id: item.id } : {}),
    code: item.code, description: item.description, valueType: item.valueType, basisPoints: item.basisPoints, amount: toCents(item.amount),
    appliesTo: item.appliesTo, cycles: item.cycles, minimumSubtotal: item.minimumSubtotal === null ? null : toCents(item.minimumSubtotal),
    startsAt: item.startsAt, endsAt: item.endsAt, maxRedemptions: item.maxRedemptions, active: item.active,
  };
}
export function couponForInsert(item: Coupon) { return { ...item, amount: toCents(item.amount), minimumSubtotal: item.minimumSubtotal === null ? null : toCents(item.minimumSubtotal) }; }

export function createInstallmentPoliciesCollection() {
  return registerSessionCollection(createCollection(electricCollectionOptions({
    gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "installment_policies",
    schema: InstallmentPolicySchema,
    getKey: (item) => item.id,
    shapeOptions: sparkShapeOptions("installment_policies"),
    onInsert: async ({ transaction }) => {
      const item = transaction.mutations[0]?.modified;
      if (!item) throw new Error("onInsert called with no pending mutation.");
      return confirmed(await commercialTermsControllerCreatePolicy({ id: item.id, ...policyBody(item) }));
    },
    onUpdate: async ({ transaction }) => {
      const mutation = transaction.mutations[0];
      if (!mutation) throw new Error("onUpdate called with no pending mutation.");
      return confirmed(await commercialTermsControllerUpdatePolicy(mutation.original.id, policyBody(mutation.modified)));
    },
    onDelete: async ({ transaction }) => {
      const mutation = transaction.mutations[0];
      if (!mutation) throw new Error("onDelete called with no pending mutation.");
      return confirmed(await commercialTermsControllerRemovePolicy(mutation.original.id));
    },
  })));
}
export type InstallmentPoliciesCollection = ReturnType<typeof createInstallmentPoliciesCollection>;

function policyBody(item: InstallmentPolicyRecord) {
  return {
    name: item.name, maxInstallments: item.maxInstallments, interestFreeInstallments: item.interestFreeInstallments, monthlyInterestBasisPoints: item.monthlyInterestBasisPoints,
    minimumInstallment: toCents(item.minimumInstallment), upfrontDiscountBasisPoints: item.upfrontDiscountBasisPoints, isDefault: item.isDefault, active: item.active,
  };
}
export function policyForInsert(item: InstallmentPolicyRecord) { return { ...item, minimumInstallment: toCents(item.minimumInstallment) }; }
