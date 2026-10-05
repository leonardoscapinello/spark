import { sql } from "drizzle-orm";
import { bigint, boolean, check, integer, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";

/** Cupom pré-configurado (packages/core/schema/dealPricing, ADR-0046). Código único por organização. */
export const coupons = pgTable(
  "coupons",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    code: text("code").notNull(),
    description: text("description"),
    valueType: text("value_type").notNull(),
    basisPoints: integer("basis_points").notNull().default(0),
    amount: bigint("amount", { mode: "number" }).notNull().default(0),
    appliesTo: text("applies_to").notNull().default("once"),
    cycles: integer("cycles"),
    minimumSubtotal: bigint("minimum_subtotal", { mode: "number" }),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    maxRedemptions: integer("max_redemptions"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("coupons_org_code_idx").on(t.orgId, t.code),
    check("coupons_value_type_check", sql`${t.valueType} IN ('percent', 'amount')`),
    check("coupons_applies_to_check", sql`${t.appliesTo} IN ('once', 'recurring')`),
    check("coupons_basis_points_check", sql`${t.basisPoints} BETWEEN 0 AND 10000`),
    check("coupons_amount_check", sql`${t.amount} >= 0`),
    pgPolicy("coupons_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` }),
  ],
).enableRLS();
