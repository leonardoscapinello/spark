import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, text, timestamp, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { users } from "./users.js";
import { APP_ROLE } from "../roles.js";

export const companies = pgTable(
  "companies",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    parentCompanyId: uuid("parent_company_id").references((): AnyPgColumn => companies.id, { onDelete: "set null" }),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    legalName: text("legal_name"),
    taxId: text("tax_id"),
    website: text("website"),
    industry: text("industry"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    pgPolicy("companies_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
