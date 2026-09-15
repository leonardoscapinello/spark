CREATE TABLE deal_followers (
  org_id uuid NOT NULL REFERENCES organizations(id),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (deal_id, user_id)
);

CREATE INDEX deal_followers_org_user_idx ON deal_followers (org_id, user_id, deal_id);
ALTER TABLE deal_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY deal_followers_isolation_by_org ON deal_followers
  FOR ALL TO app_user
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON deal_followers TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE deal_followers;
