import { sql } from "drizzle-orm";
import { check, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { APP_ROLE } from "../roles.js";
import { organizations } from "./organizations.js";

/** Uma linha por organização; a identidade visual é compartilhada por todos. */
export const organizationThemes = pgTable(
  "organization_themes",
  {
    orgId: uuid("org_id").primaryKey().references(() => organizations.id, { onDelete: "cascade" }),
    accentColor: text("accent_color").notNull().default("#1B45E8"),
    accentStrongColor: text("accent_strong_color").notNull().default("#1539C5"),
    groundColor: text("ground_color").notNull().default("#EFF0EB"),
    surfaceColor: text("surface_color").notNull().default("#FFFFFF"),
    surface2Color: text("surface_2_color").notNull().default("#FBFBF9"),
    inkColor: text("ink_color").notNull().default("#1A1A1A"),
    inkMutedColor: text("ink_muted_color").notNull().default("#646462"),
    lineColor: text("line_color").notNull().default("#E9EAE6"),
    statusSuccessColor: text("status_success_color").notNull().default("#2F9270"),
    statusWarningColor: text("status_warning_color").notNull().default("#B87518"),
    statusDangerColor: text("status_danger_color").notNull().default("#C94B5A"),
    fontBody: text("font_body").notNull().default("inter"),
    fontDisplay: text("font_display").notNull().default("inter"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("organization_themes_colors_check", sql`
      ${t.accentColor} ~ '^#[0-9A-Fa-f]{6}$' AND
      ${t.accentStrongColor} ~ '^#[0-9A-Fa-f]{6}$' AND
      ${t.groundColor} ~ '^#[0-9A-Fa-f]{6}$' AND
      ${t.surfaceColor} ~ '^#[0-9A-Fa-f]{6}$' AND
      ${t.surface2Color} ~ '^#[0-9A-Fa-f]{6}$' AND
      ${t.inkColor} ~ '^#[0-9A-Fa-f]{6}$' AND
      ${t.inkMutedColor} ~ '^#[0-9A-Fa-f]{6}$' AND
      ${t.lineColor} ~ '^#[0-9A-Fa-f]{6}$' AND
      ${t.statusSuccessColor} ~ '^#[0-9A-Fa-f]{6}$' AND
      ${t.statusWarningColor} ~ '^#[0-9A-Fa-f]{6}$' AND
      ${t.statusDangerColor} ~ '^#[0-9A-Fa-f]{6}$'`),
    check("organization_themes_fonts_check", sql`${t.fontBody} IN ('geist', 'inter', 'system', 'rounded', 'serif') AND ${t.fontDisplay} IN ('geist', 'inter', 'system', 'rounded', 'serif')`),
    pgPolicy("organization_themes_isolation_by_org", {
      for: "all",
      to: APP_ROLE,
      using: sql`${t.orgId} = current_setting('app.current_org_id', true)::uuid`,
    }),
  ],
).enableRLS();
