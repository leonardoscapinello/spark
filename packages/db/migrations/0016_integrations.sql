CREATE TABLE integration_connections (
  id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations(id),
  provider text NOT NULL CHECK (provider IN ('smtp','google_workspace','instagram','buffer','s3','reoon')),
  name text NOT NULL, status text NOT NULL DEFAULT 'not_configured' CHECK (status IN ('not_configured','connected','error','disabled')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb, credentials_configured boolean NOT NULL DEFAULT false, credential_hint text,
  last_checked_at timestamptz, last_error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX integration_connections_org_provider_idx ON integration_connections (org_id, provider);
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY integration_connections_isolation_by_org ON integration_connections FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE TABLE integration_secrets (
  connection_id uuid PRIMARY KEY REFERENCES integration_connections(id) ON DELETE CASCADE, org_id uuid NOT NULL REFERENCES organizations(id),
  ciphertext text NOT NULL, iv text NOT NULL, auth_tag text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE integration_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY integration_secrets_isolation_by_org ON integration_secrets FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON integration_connections, integration_secrets TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE integration_connections;

UPDATE permission_groups SET capabilities = capabilities || '["integrations:read", "integrations:manage"]'::jsonb, updated_at = now()
WHERE name IN ('Proprietário','Administrador') AND NOT capabilities @> '["integrations:read", "integrations:manage"]'::jsonb;
UPDATE permission_groups SET capabilities = capabilities || '["integrations:read"]'::jsonb, updated_at = now()
WHERE name IN ('Gerente','Agente','Visualizador') AND NOT capabilities @> '["integrations:read"]'::jsonb;
