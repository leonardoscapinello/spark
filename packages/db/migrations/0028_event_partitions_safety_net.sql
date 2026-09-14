-- events é particionada por mês (ADR-0021). A migration 0000 criou só
-- 2026-09..2026-12: em 2027-01-01, sem partição para janeiro, TODO insert em
-- events falharia — e como o evento entra na mesma transação do write de
-- negócio, criar pessoa/mover negócio/concluir atividade pararia junto.
--
-- Duas camadas:
--   1. partições explícitas até 2027-03, cobrindo o horizonte que o
--      apps/scheduler passa a manter diariamente (packages/db ensureEventPartitions);
--   2. uma partição DEFAULT como rede de segurança: se o scheduler ficar
--      fora do ar além do horizonte, a linha entra aqui em vez de derrubar
--      a transação. Linha na DEFAULT é sinal de operação a fazer, não de
--      dado perdido (ver o comentário em packages/db/src/eventPartitions.ts).
CREATE TABLE IF NOT EXISTS events_y2027m01 PARTITION OF events FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');
CREATE TABLE IF NOT EXISTS events_y2027m02 PARTITION OF events FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');
CREATE TABLE IF NOT EXISTS events_y2027m03 PARTITION OF events FOR VALUES FROM ('2027-03-01') TO ('2027-04-01');
CREATE TABLE IF NOT EXISTS events_default PARTITION OF events DEFAULT;
