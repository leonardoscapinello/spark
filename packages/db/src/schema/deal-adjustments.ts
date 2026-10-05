import { sql } from "drizzle-orm";
import { bigint, check, index, integer, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { deals } from "./deals.js";
import { coupons } from "./coupons.js";

/**
 * Ajustes do negócio — desconto, cupom, taxa (packages/core/schema/
 * dealPricing, ADR-0046). Cada escrita recalcula `deals.amount` pela cascata.
 */
export const dealAdjustments = pgTable(
  "deal_adjustments",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    dealId: uuid("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    label: text("label").notNull(),
    valueType: text("value_type").notNull(),
    basisPoints: integer("basis_points").notNull().default(0),
    amount: bigint("amount", { mode: "number" }).notNull().default(0),
    appliesTo: text("applies_to").notNull().default("once"),
    cycles: integer("cycles"),
    couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("deal_adjustments_deal_idx").on(t.orgId, t.dealId, t.sortOrder),
    index("deal_adjustments_coupon_idx").on(t.orgId, t.couponId),
    check("deal_adjustments_kind_check", sql`${t.kind} IN ('discount', 'coupon', 'fee')`),
    check("deal_adjustments_value_type_check", sql`${t.valueType} IN ('percent', 'amount')`),
    check("deal_adjustments_applies_to_check", sql`${t.appliesTo} IN ('once', 'recurring')`),
    check("deal_adjustments_basis_points_check", sql`${t.basisPoints} BETWEEN 0 AND 10000`),
    check("deal_adjustments_amount_check", sql`${t.amount} >= 0`),
    pgPolicy("deal_adjustments_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` }),
  ],
).enableRLS();
