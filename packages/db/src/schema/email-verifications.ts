import {
  boolean,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { EmailVerificationStatus } from "@spark/core";
import { APP_ROLE } from "../roles.js";
import { organizations } from "./organizations.js";
import { integrationConnections } from "./integrations.js";

export const emailVerifications = pgTable(
  "email_verifications",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    email: text("email").notNull(),
    status: text("status").$type<EmailVerificationStatus>().notNull(),
    overallScore: integer("overall_score"),
    isSafeToSend: boolean("is_safe_to_send").notNull(),
    isValidSyntax: boolean("is_valid_syntax").notNull(),
    isDisposable: boolean("is_disposable").notNull(),
    isRoleAccount: boolean("is_role_account").notNull(),
    canConnectSmtp: boolean("can_connect_smtp").notNull(),
    hasInboxFull: boolean("has_inbox_full").notNull(),
    isCatchAll: boolean("is_catch_all").notNull(),
    isDeliverable: boolean("is_deliverable").notNull(),
    isDisabled: boolean("is_disabled").notNull(),
    isSpamtrap: boolean("is_spamtrap").notNull(),
    isFreeEmail: boolean("is_free_email").notNull(),
    mxAcceptsMail: boolean("mx_accepts_mail").notNull(),
    mxRecords: jsonb("mx_records").$type<string[]>().notNull().default([]),
    rawResult: jsonb("raw_result").$type<Record<string, unknown>>().notNull(),
    providerConnectionId: uuid("provider_connection_id")
      .notNull()
      .references(() => integrationConnections.id),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.orgId, table.email] }),
    index("email_verifications_org_expiry_idx").on(table.orgId, table.expiresAt),
    pgPolicy("email_verifications_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
