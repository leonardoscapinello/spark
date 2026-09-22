import { index, pgPolicy, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { APP_ROLE } from "../roles.js";
import { contacts } from "./contacts.js";
import { conversations } from "./conversations.js";
import { files } from "./files.js";
import { organizations } from "./organizations.js";
import { users } from "./users.js";

export const messages = pgTable("messages", {
  id: uuid("id").notNull().$defaultFn(() => uuidv7()),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").notNull().references(() => contacts.id),
  authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
  direction: text("direction").notNull(),
  status: text("status").notNull(),
  body: text("body").notNull(),
  externalId: text("external_id"),
  /** Mídia recebida (áudio, imagem, documento) — o arquivo em si mora em `files` (ADR-0028). */
  attachmentFileId: uuid("attachment_file_id").references(() => files.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  primaryKey({ columns: [table.id, table.createdAt] }),
  index("messages_org_conversation_created_idx").on(table.orgId, table.conversationId, table.createdAt),
  index("messages_org_status_created_idx").on(table.orgId, table.status, table.createdAt),
  pgPolicy("messages_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();
