-- Base da janela de 24h do WhatsApp: só mensagem RECEBIDA reseta a janela,
-- enviar não conta. last_message_at reseta em qualquer envio nosso e não
-- serve pra essa conta — precisa de uma coluna que só o inbound toca.
ALTER TABLE conversations ADD COLUMN last_inbound_message_at timestamptz;
