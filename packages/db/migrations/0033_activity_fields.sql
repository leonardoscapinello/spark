-- Atividade com os campos que um CRM precisa (paridade com o Pipedrive):
-- duração para reservar na agenda, local, e quem executa.
ALTER TABLE activities ADD COLUMN duration_minutes integer NOT NULL DEFAULT 30;
ALTER TABLE activities ADD COLUMN location text;
ALTER TABLE activities ADD COLUMN owner_id uuid REFERENCES users(id) ON DELETE SET NULL;
