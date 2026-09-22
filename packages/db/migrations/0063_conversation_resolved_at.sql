-- Base do tempo de resolução (roadmap Fase 2, "métricas de atendimento"):
-- carimbada só quando a conversa fecha, limpa se reabrir. Não dá pra usar
-- updated_at pra isso — qualquer edição já muda essa coluna.
ALTER TABLE conversations ADD COLUMN resolved_at timestamptz;
