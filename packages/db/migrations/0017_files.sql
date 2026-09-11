CREATE TABLE files (
  id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations(id),
  storage_connection_id uuid NOT NULL REFERENCES integration_connections(id), created_by uuid NOT NULL REFERENCES users(id),
  name text NOT NULL, object_key text NOT NULL, mime_type text NOT NULL, size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5000000000),
  folder text, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','failed')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE INDEX files_org_created_idx ON files (org_id, created_at DESC);
CREATE INDEX files_org_folder_idx ON files (org_id, folder);
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
CREATE POLICY files_isolation_by_org ON files FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON files TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE files;

UPDATE permission_groups SET capabilities = capabilities || '["files:read", "files:write"]'::jsonb, updated_at = now()
WHERE name IN ('Proprietário','Administrador','Gerente','Agente') AND NOT capabilities @> '["files:read", "files:write"]'::jsonb;
UPDATE permission_groups SET capabilities = capabilities || '["files:read"]'::jsonb, updated_at = now()
WHERE name = 'Visualizador' AND NOT capabilities @> '["files:read"]'::jsonb;
