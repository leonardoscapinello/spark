import { pgTable, pgPolicy, uuid, primaryKey } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations.js";
import { users } from "./users.js";
import { permissionGroups } from "./permission-groups.js";
import { APP_ROLE } from "../roles.js";

/**
 * Junção muitos-para-muitos entre usuário e grupo (docs/adr/0029). orgId
 * aqui é redundante com users.org_id/permission_groups.org_id — mantido
 * mesmo assim pra seguir a mesma política de RLS simples (igualdade
 * direta) que toda outra tabela usa, em vez de RLS por subquery.
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
    pgPolicy("user_permission_groups_isolamento_por_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
