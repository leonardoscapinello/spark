import { sql } from "drizzle-orm";
import { jsonb, pgPolicy, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { users } from "./users.js";

/** Preferência de interface por pessoa (docs: packages/core/schema/userPreference). Uma linha por (org, usuário, chave). */
export const userPreferences = pgTable(
  "user_preferences",
  {
    id: idColumn(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("user_preferences_user_key").on(t.orgId, t.userId, t.key),
    pgPolicy("user_preferences_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
