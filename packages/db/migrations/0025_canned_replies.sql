CREATE TABLE canned_replies (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  title text NOT NULL,
  shortcut text NOT NULL,
  body text NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE UNIQUE INDEX canned_replies_org_shortcut_uidx ON canned_replies (org_id, lower(shortcut));
CREATE INDEX canned_replies_org_team_idx ON canned_replies (org_id, team_id);
ALTER TABLE canned_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY canned_replies_isolation_by_org ON canned_replies FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON canned_replies TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE canned_replies;
