import { index, pgPolicy, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations.js";
import { deals } from "./deals.js";
import { users } from "./users.js";
import { APP_ROLE } from "../roles.js";

export const dealFollowers = pgTable("deal_followers", {
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  dealId: uuid("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.dealId, table.userId] }),
  index("deal_followers_org_user_idx").on(table.orgId, table.userId, table.dealId),
  pgPolicy("deal_followers_isolation_by_org", {
    for: "all",
    to: APP_ROLE,
    using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid`,
  }),
]).enableRLS();
