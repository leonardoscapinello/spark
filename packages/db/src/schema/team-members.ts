import { pgPolicy, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations.js";
import { teams } from "./teams.js";
import { users } from "./users.js";
import { APP_ROLE } from "../roles.js";

export const teamMembers = pgTable("team_members", {
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.teamId, table.userId] }),
  pgPolicy("team_members_isolation_by_org", {
    for: "all",
    to: APP_ROLE,
    using: sql`${table.orgId} = current_setting('app.current_org_id', true)::uuid`,
  }),
]).enableRLS();
