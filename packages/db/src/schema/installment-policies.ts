import { sql } from "drizzle-orm";
import { bigint, boolean, check, index, integer, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";

/** Política de parcelamento (packages/core/schema/dealPricing, ADR-0046): os juros são da empresa. */
export const installmentPolicies = pgTable(
  "installment_policies",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    name: text("name").notNull(),
    maxInstallments: integer("max_installments").notNull(),
    interestFreeInstallments: integer("interest_free_installments").notNull().default(1),
    monthlyInterestBasisPoints: integer("monthly_interest_basis_points").notNull().default(0),
    minimumInstallment: bigint("minimum_installment", { mode: "number" }).notNull().default(0),
    upfrontDiscountBasisPoints: integer("upfront_discount_basis_points").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("installment_policies_max_check", sql`${t.maxInstallments} BETWEEN 1 AND 48`),
    check("installment_policies_free_check", sql`${t.interestFreeInstallments} BETWEEN 1 AND 48`),
    check("installment_policies_interest_check", sql`${t.monthlyInterestBasisPoints} BETWEEN 0 AND 10000`),
    check("installment_policies_upfront_check", sql`${t.upfrontDiscountBasisPoints} BETWEEN 0 AND 10000`),
    check("installment_policies_minimum_check", sql`${t.minimumInstallment} >= 0`),
    index("installment_policies_org_idx").on(t.orgId),
    pgPolicy("installment_policies_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` }),
  ],
).enableRLS();
