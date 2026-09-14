-- Campos obrigatórios e importantes por funil e por etapa, como no Pipedrive:
-- o mesmo campo pode ser obrigatório num funil e livre em outro, e obrigatório
-- numa etapa e não nas seguintes (packages/core/rules/stageFieldRules).
CREATE TABLE stage_field_rules (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  pipeline_id uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  level text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stage_field_rules_stage_field UNIQUE (org_id, stage_id, field_key)
);
CREATE INDEX stage_field_rules_pipeline_idx ON stage_field_rules (org_id, pipeline_id);
ALTER TABLE stage_field_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY stage_field_rules_isolation_by_org ON stage_field_rules FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON stage_field_rules TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE stage_field_rules;
