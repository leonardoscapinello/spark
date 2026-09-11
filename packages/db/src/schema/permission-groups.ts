import { pgTable, pgPolicy, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn } from "./_helpers.js";
import { organizations } from "./organizations.js";
import { APP_ROLE } from "../roles.js";

/** Mirrors PermissionGroupSchema (packages/core/src/policy/permissionGroup.ts). */
export const permissionGroups = pgTable(
  "permission_groups",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    /** array of Capability (packages/core/src/policy/capability.ts) —
     * jsonb for the same reason as contacts.tags: a simple list, same
     * convention as the rest of the schema. */
    capabilities: jsonb("capabilities").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    pgPolicy("permission_groups_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
