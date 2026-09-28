ALTER TABLE stages ADD COLUMN color text NOT NULL DEFAULT 'neutral';
ALTER TABLE stages ADD CONSTRAINT stages_color_check CHECK (color IN ('neutral','blue','green','red','amber','purple'));
ALTER TABLE stage_field_rules DROP CONSTRAINT IF EXISTS stage_field_rules_level_check;
ALTER TABLE stage_field_rules ADD CONSTRAINT stage_field_rules_level_check CHECK (level IN ('optional','important','required'));
CREATE TABLE deal_tags (
  org_id uuid NOT NULL REFERENCES organizations(id),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(deal_id, tag_id)
);
CREATE INDEX deal_tags_org_tag_idx ON deal_tags(org_id, tag_id);
ALTER TABLE deal_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY deal_tags_isolation_by_org ON deal_tags FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON deal_tags TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE deal_tags;
