-- Notas: o que aconteceu, ao lado das atividades, que são o que vai acontecer.
-- Sem chave estrangeira para negócio/pessoa/empresa porque a nota sobrevive ao
-- arquivamento deles (exclusão é lógica no sistema inteiro — ADR-0012).
CREATE TABLE notes (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  deal_id uuid,
  contact_id uuid,
  company_id uuid,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  author_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notes_deal_idx ON notes (org_id, deal_id, created_at DESC);
CREATE INDEX notes_contact_idx ON notes (org_id, contact_id, created_at DESC);
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY notes_isolation_by_org ON notes FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON notes TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE notes;
