-- Visão salva «só eu» ou «toda a organização». Expand: as existentes eram
-- visíveis a todos e continuam assim (DEFAULT 'org').
ALTER TABLE saved_views ADD COLUMN visibility text NOT NULL DEFAULT 'org';
