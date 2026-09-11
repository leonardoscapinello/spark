import { pgTable, pgPolicy, uuid, primaryKey } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations.js";
import { users } from "./users.js";
import { permissionGroups } from "./permission-groups.js";
import { APP_ROLE } from "../roles.js";

/**
 * Many-to-many join between user and group (docs/adr/0029). orgId here is
 * redundant with users.org_id/permission_groups.org_id — kept anyway to
 * follow the same simple RLS policy (direct equality) every other table
 * uses, instead of subquery-based RLS.
 */
export const userPermissionGroups = pgTable(
  "user_permission_groups",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    groupId: uuid("group_id")
      .notNull()
      .references(() => permissionGroups.id),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.groupId] }),
    pgPolicy("user_permission_groups_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
