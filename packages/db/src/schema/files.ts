import { sql } from "drizzle-orm";
import { bigint, index, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { integrationConnections } from "./integrations.js";
import { organizations } from "./organizations.js";
import { users } from "./users.js";

export const files = pgTable("files", {
  id: idColumn(), orgId: uuid("org_id").notNull().references(() => organizations.id),
  storageConnectionId: uuid("storage_connection_id").notNull().references(() => integrationConnections.id),
  /** Nulo quando o arquivo veio de ingestão automática (mídia recebida por um canal), não de upload humano. */
  createdBy: uuid("created_by").references(() => users.id), name: text("name").notNull(),
  objectKey: text("object_key").notNull(), mimeType: text("mime_type").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(), folder: text("folder"), status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(), deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [index("files_org_created_idx").on(table.orgId, table.createdAt), index("files_org_folder_idx").on(table.orgId, table.folder), pgPolicy("files_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` })]).enableRLS();
