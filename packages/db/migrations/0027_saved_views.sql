CREATE TABLE saved_views (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  entity_type text NOT NULL,
  name text NOT NULL,
  filters text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX saved_views_org_entity_idx ON saved_views (org_id, entity_type);
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_views_isolation_by_org ON saved_views FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON saved_views TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE saved_views;
