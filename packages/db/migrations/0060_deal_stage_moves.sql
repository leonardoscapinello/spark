-- Histórico de saída de etapa — base de calculateStageProbability
-- (packages/core/rules/stageWorkflow): a probabilidade de avançar nunca é
-- preenchida na mão, só calculada a partir de quem realmente saiu de cada
-- etapa. Interno, nunca sincronizado a cliente — sem ALTER PUBLICATION.
CREATE TABLE deal_stage_moves (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  pipeline_id uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  from_stage_id uuid REFERENCES stages(id) ON DELETE CASCADE,
  to_stage_id uuid NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX deal_stage_moves_from_stage_idx ON deal_stage_moves (org_id, from_stage_id, occurred_at);
ALTER TABLE deal_stage_moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY deal_stage_moves_isolation_by_org ON deal_stage_moves FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON deal_stage_moves TO app_user;

-- Etapa sem histórico começa otimista, não em zero (STAGE_PROBABILITY_DEFAULT).
ALTER TABLE stages ALTER COLUMN probability SET DEFAULT 100;
