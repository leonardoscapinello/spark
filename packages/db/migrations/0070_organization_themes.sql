CREATE TABLE organization_themes (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  accent_color text NOT NULL DEFAULT '#1B45E8',
  accent_strong_color text NOT NULL DEFAULT '#1539C5',
  ground_color text NOT NULL DEFAULT '#EFF0EB',
  surface_color text NOT NULL DEFAULT '#FFFFFF',
  surface_2_color text NOT NULL DEFAULT '#FBFBF9',
  ink_color text NOT NULL DEFAULT '#1A1A1A',
  ink_muted_color text NOT NULL DEFAULT '#646462',
  line_color text NOT NULL DEFAULT '#E9EAE6',
  status_success_color text NOT NULL DEFAULT '#2F9270',
  status_warning_color text NOT NULL DEFAULT '#B87518',
  status_danger_color text NOT NULL DEFAULT '#C94B5A',
  font_body text NOT NULL DEFAULT 'inter',
  font_display text NOT NULL DEFAULT 'inter',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_themes_colors_check CHECK (
    accent_color ~ '^#[0-9A-Fa-f]{6}$' AND
    accent_strong_color ~ '^#[0-9A-Fa-f]{6}$' AND
    ground_color ~ '^#[0-9A-Fa-f]{6}$' AND
    surface_color ~ '^#[0-9A-Fa-f]{6}$' AND
    surface_2_color ~ '^#[0-9A-Fa-f]{6}$' AND
    ink_color ~ '^#[0-9A-Fa-f]{6}$' AND
    ink_muted_color ~ '^#[0-9A-Fa-f]{6}$' AND
    line_color ~ '^#[0-9A-Fa-f]{6}$' AND
    status_success_color ~ '^#[0-9A-Fa-f]{6}$' AND
    status_warning_color ~ '^#[0-9A-Fa-f]{6}$' AND
    status_danger_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  CONSTRAINT organization_themes_fonts_check CHECK (
    font_body IN ('inter', 'system', 'rounded', 'serif') AND
    font_display IN ('inter', 'system', 'rounded', 'serif')
  )
);

ALTER TABLE organization_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY organization_themes_isolation_by_org ON organization_themes FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE ON organization_themes TO app_user;
INSERT INTO organization_themes (org_id) SELECT id FROM organizations ON CONFLICT DO NOTHING;
ALTER PUBLICATION electric_publication_default ADD TABLE organization_themes;
