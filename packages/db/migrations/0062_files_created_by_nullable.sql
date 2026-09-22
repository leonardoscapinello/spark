-- Mídia recebida por um canal (WhatsApp, e-mail...) vira um `files` sem
-- autor humano — a ingestão é automática, não um upload de alguém da equipe.
ALTER TABLE files ALTER COLUMN created_by DROP NOT NULL;
