import { sql } from "drizzle-orm";
import { index, integer, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { LinkPreview } from "@spark/core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";

export const linkPreviews = pgTable("link_previews", {
  id: idColumn(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  url: text("url").notNull(),
  urlHash: text("url_hash").notNull(),
  canonicalUrl: text("canonical_url"),
  title: text("title"),
  description: text("description"),
  imageUrl: text("image_url"),
  siteName: text("site_name"),
  faviconUrl: text("favicon_url"),
  status: text("status").$type<LinkPreview["status"]>().notNull(),
  httpStatus: integer("http_status"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  failureCount: integer("failure_count").notNull().default(0),
  etag: text("etag"),
  lastModified: text("last_modified"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("link_previews_org_url_hash_uidx").on(table.orgId, table.urlHash),
  index("link_previews_org_expires_idx").on(table.orgId, table.expiresAt),
  pgPolicy("link_previews_isolation_by_org", { for: "all", to: APP_ROLE, using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid` }),
]).enableRLS();
