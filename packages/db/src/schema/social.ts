import {
  boolean,
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { SocialPostStatus, SocialPublishMode, SocialService } from "@spark/core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { integrationConnections } from "./integrations.js";
import { users } from "./users.js";

export const socialChannels = pgTable(
  "social_channels",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnections.id),
    externalId: text("external_id").notNull(),
    service: text("service").$type<SocialService>().notNull(),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    active: boolean("active").notNull().default(true),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("social_channels_connection_external_uidx").on(
      table.connectionId,
      table.externalId,
    ),
    index("social_channels_org_service_idx").on(table.orgId, table.service),
    pgPolicy("social_channels_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();

export const socialPosts = pgTable(
  "social_posts",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => socialChannels.id),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnections.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    text: text("text").notNull(),
    status: text("status").$type<SocialPostStatus>().notNull(),
    publishMode: text("publish_mode").$type<SocialPublishMode>().notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    externalId: text("external_id"),
    providerStatus: text("provider_status"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("social_posts_org_scheduled_idx").on(table.orgId, table.scheduledAt),
    index("social_posts_org_status_idx").on(table.orgId, table.status),
    pgPolicy("social_posts_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
