import { pgTable, pgPolicy, text, timestamp, uuid, boolean, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations.js";
import { contacts } from "./contacts.js";
import { APP_ROLE } from "../roles.js";
import { v7 as uuidv7 } from "uuid";

/**
 * Mirrors IdentitySchema (packages/core/src/schema/identity.ts). The
 * table that links a channel (email, WhatsApp, Instagram) to the same
 * contact — without it Spark is just one more of the four systems it
 * replaces (docs/arquitetura/visao-geral.md).
 */
export const identities = pgTable(
  "identities",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    externalValue: text("external_value").notNull(),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // an identity belongs to exactly one contact, per organization and channel
    unique("identities_org_channel_value").on(t.orgId, t.channel, t.externalValue),
    pgPolicy("identities_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
