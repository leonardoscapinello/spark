import { index, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { contacts } from "./contacts.js";
import { conversations } from "./conversations.js";
import { organizations } from "./organizations.js";
import { users } from "./users.js";

export const messages = pgTable("messages", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").notNull().references(() => contacts.id),
  authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
  direction: text("direction").notNull(),
  status: text("status").notNull(),
  body: text("body").notNull(),
  externalId: text("external_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("messages_org_conversation_created_idx").on(table.orgId, table.conversationId, table.createdAt),
  uniqueIndex("messages_org_external_unique").on(table.orgId, table.externalId).where(sql`${table.externalId} IS NOT NULL`),
  pgPolicy("messages_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();
