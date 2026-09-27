BEGIN;

ALTER TABLE stages ADD COLUMN IF NOT EXISTS is_entry boolean NOT NULL DEFAULT false;

-- Preserva nome, identidade e histórico da primeira etapa existente.
WITH first_stages AS (
  SELECT DISTINCT ON (pipeline_id) id
  FROM stages
  WHERE archived_at IS NULL
  ORDER BY pipeline_id, sort_order, created_at, id
)
UPDATE stages SET is_entry = true, updated_at = now()
WHERE id IN (SELECT id FROM first_stages);

-- Funis sem etapas ativas também recebem uma entrada.
INSERT INTO stages (id, org_id, pipeline_id, name, sort_order, is_entry)
SELECT gen_random_uuid(), p.org_id, p.id, 'Entrada de lead', 0, true
FROM pipelines p
WHERE NOT EXISTS (SELECT 1 FROM stages s WHERE s.pipeline_id = p.id AND s.is_entry);

CREATE UNIQUE INDEX stages_pipeline_entry_unique ON stages (pipeline_id) WHERE is_entry;
ALTER TABLE stages ADD CONSTRAINT stages_entry_active_check CHECK (NOT is_entry OR archived_at IS NULL);

COMMIT;
