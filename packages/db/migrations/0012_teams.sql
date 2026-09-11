CREATE TABLE teams (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE UNIQUE INDEX teams_org_name_unique ON teams (org_id, lower(name));

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY teams_isolation_by_org ON teams
  FOR ALL TO app_user
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE TABLE team_members (
  org_id uuid NOT NULL REFERENCES organizations(id),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, user_id)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_members_isolation_by_org ON team_members
  FOR ALL TO app_user
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE INDEX team_members_org_user_idx ON team_members (org_id, user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON teams, team_members TO app_user;
