import { sql } from "drizzle-orm";
import { pgTable, uuid, timestamp, primaryKey, index, pgPolicy } from "drizzle-orm/pg-core";
import { contacts } from "./contacts.js";
import { companies } from "./companies.js";
import { organizations } from "./organizations.js";
import { APP_ROLE } from "../roles.js";
export const contactCompanies = pgTable("contact_companies", {
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.orgId, t.contactId, t.companyId] }),
  index("contact_companies_company_idx").on(t.orgId, t.companyId),
  pgPolicy("contact_companies_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();
