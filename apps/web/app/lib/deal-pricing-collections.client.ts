import { createCouponsCollection, createDealAdjustmentsCollection, createInstallmentPoliciesCollection } from "@spark/data";

let adjustments: ReturnType<typeof createDealAdjustmentsCollection> | undefined;
export function getDealAdjustmentsCollection() { return adjustments ??= createDealAdjustmentsCollection(); }
let coupons: ReturnType<typeof createCouponsCollection> | undefined;
export function getCouponsCollection() { return coupons ??= createCouponsCollection(); }
let policies: ReturnType<typeof createInstallmentPoliciesCollection> | undefined;
export function getInstallmentPoliciesCollection() { return policies ??= createInstallmentPoliciesCollection(); }
