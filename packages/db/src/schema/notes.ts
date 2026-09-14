import { sql } from "drizzle-orm";
import { boolean, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { users } from "./users.js";

/** Notas de negócio, pessoa ou empresa (packages/core/schema/note). */
export const notes = pgTable(
  "notes",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    dealId: uuid("deal_id"),
    contactId: uuid("contact_id"),
    companyId: uuid("company_id"),
    body: text("body").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    authorId: uuid("author_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    pgPolicy("notes_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
