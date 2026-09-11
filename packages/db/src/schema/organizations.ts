import { pgTable, pgPolicy, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { APP_ROLE } from "../roles.js";

/**
 * Mirrors OrganizationSchema (packages/core/src/schema/organization.ts).
 * The organization IS the tenant — it has no orgId, the RLS policy
 * compares against its own `id` (docs/adr/0022-um-so-banco-postgres.md).
 */
export const organizations = pgTable(
  "organizations",
  {
    id: idColumn(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    pgPolicy("organizations_isolation", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.id} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
