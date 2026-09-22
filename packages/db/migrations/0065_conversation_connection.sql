-- Cada conexão (cada número de WhatsApp, por exemplo) é a própria caixa de
-- entrada — o mesmo cliente pode escrever pra dois números nossos e isso
-- são duas conversas, não uma só (pedido do usuário, 22/09).
ALTER TABLE conversations ADD COLUMN connection_id uuid REFERENCES integration_connections(id) ON DELETE SET NULL;
CREATE INDEX conversations_org_connection_idx ON conversations (org_id, connection_id);
