import { sql } from "drizzle-orm";
import { bigint, integer, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { deals } from "./deals.js";
import { products, productVariants } from "./catalog.js";

/**
 * Itens de um negócio (packages/core/schema/dealProduct). O valor do negócio
 * é a soma deles — `deals.amount` é recalculado pela API a cada mudança aqui.
 * Nome e preço ficam gravados na linha: o catálogo muda, o que foi negociado não.
 */
export const dealProducts = pgTable(
  "deal_products",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    dealId: uuid("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    quantityMilli: integer("quantity_milli").notNull(),
    unitAmount: bigint("unit_amount", { mode: "number" }).notNull(),
    discountBasisPoints: integer("discount_basis_points").notNull().default(0),
    taxBasisPoints: integer("tax_basis_points").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    pgPolicy("deal_products_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
