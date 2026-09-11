CREATE TABLE automations (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused')),
  draft_graph jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  current_published_version_id uuid,
  published_version integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX automations_org_updated_idx ON automations (org_id, updated_at DESC);
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY automations_isolation_by_org ON automations FOR ALL TO app_user
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE TABLE automation_versions (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  automation_id uuid NOT NULL REFERENCES automations(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  graph jsonb NOT NULL,
  published_by uuid NOT NULL REFERENCES users(id),
  published_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automation_versions_number_unique UNIQUE (automation_id, version)
);

CREATE INDEX automation_versions_org_automation_idx ON automation_versions (org_id, automation_id, published_at DESC);
ALTER TABLE automation_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY automation_versions_isolation_by_org ON automation_versions FOR ALL TO app_user
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE automations ADD CONSTRAINT automations_current_version_fk
  FOREIGN KEY (current_published_version_id) REFERENCES automation_versions(id) ON DELETE RESTRICT;

CREATE FUNCTION prevent_automation_version_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'automation_versions are immutable';
END;
$$;
CREATE TRIGGER automation_versions_immutable BEFORE UPDATE OR DELETE ON automation_versions
  FOR EACH ROW EXECUTE FUNCTION prevent_automation_version_mutation();

GRANT SELECT, INSERT, UPDATE, DELETE ON automations TO app_user;
GRANT SELECT, INSERT ON automation_versions TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE automations, automation_versions;

UPDATE permission_groups
SET capabilities = capabilities || '["automations:read", "automations:write", "automations:publish"]'::jsonb,
    updated_at = now()
WHERE name IN ('Proprietário', 'Administrador', 'Gerente')
  AND NOT capabilities @> '["automations:read", "automations:write", "automations:publish"]'::jsonb;

UPDATE permission_groups
SET capabilities = capabilities || '["automations:read", "automations:write"]'::jsonb,
    updated_at = now()
WHERE name = 'Agente'
  AND NOT capabilities @> '["automations:read", "automations:write"]'::jsonb;

UPDATE permission_groups
SET capabilities = capabilities || '["automations:read"]'::jsonb,
    updated_at = now()
WHERE name = 'Visualizador'
  AND NOT capabilities @> '["automations:read"]'::jsonb;
