CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  parent_company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL,
  legal_name text,
  tax_id text,
  website text,
  industry text,
  email text,
  phone text,
  address text,
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY companies_isolation_by_org ON companies
  FOR ALL TO app_user
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS companies_org_updated_idx ON companies (org_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS companies_org_owner_idx ON companies (org_id, owner_id);
CREATE INDEX IF NOT EXISTS contacts_org_company_idx ON contacts (org_id, company_id);
CREATE INDEX IF NOT EXISTS deals_org_company_idx ON deals (org_id, company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON companies TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE companies;

UPDATE permission_groups
SET capabilities = capabilities || '["companies:read", "companies:write"]'::jsonb,
    updated_at = now()
WHERE name IN ('Proprietário', 'Administrador', 'Gerente', 'Agente')
  AND NOT capabilities @> '["companies:read", "companies:write"]'::jsonb;

UPDATE permission_groups
SET capabilities = capabilities || '["companies:read"]'::jsonb,
    updated_at = now()
WHERE name = 'Visualizador'
  AND NOT capabilities @> '["companies:read"]'::jsonb;
