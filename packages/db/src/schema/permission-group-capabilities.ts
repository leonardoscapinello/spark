import { sql } from "drizzle-orm";
import { index, pgPolicy, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { organizations } from "./organizations.js";
import { permissionGroups } from "./permission-groups.js";

/**
 * Uma linha por capacidade concedida ao grupo (ADR-0035).
 *
 * Em JSON não dava para perguntar «quem pode apagar negócio?» sem abrir todos
 * os grupos em memória. Aqui é um `WHERE capability = ...` com índice — e é a
 * mesma pergunta que a auditoria e o relatório de permissões fazem.
 */
export const permissionGroupCapabilities = pgTable(
  "permission_group_capabilities",
  {
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    groupId: uuid("group_id").notNull().references(() => permissionGroups.id, { onDelete: "cascade" }),
    capability: text("capability").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.capability] }),
    index("permission_group_capabilities_capability_idx").on(t.orgId, t.capability),
    pgPolicy("permission_group_capabilities_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
