-- Caminho exato do shape do Kanban: uma organização, um funil, um estado,
-- somente linhas ativas. Evita varredura de todos os negócios na abertura.
CREATE INDEX deals_board_shape_idx
  ON deals (org_id, pipeline_id, status, stage_id, updated_at DESC)
  WHERE deleted_at IS NULL;
