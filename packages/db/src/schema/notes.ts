import { sql } from "drizzle-orm";
import { boolean, check, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { users } from "./users.js";
import { contacts } from "./contacts.js";
import { companies } from "./companies.js";
import { deals } from "./deals.js";

/** Notas de negócio, pessoa ou empresa (packages/core/schema/note). */
export const notes = pgTable(
  "notes",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    authorId: uuid("author_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("notes_has_target_check", sql`num_nonnulls(${t.dealId}, ${t.contactId}, ${t.companyId}) >= 1`),
    pgPolicy("notes_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
