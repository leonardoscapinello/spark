-- Configuração de integração deixa o JSON (ADR-0035).
--
-- `integration_connections.config` guardava um objeto por provedor. Cada chave
-- ali é um ajuste com nome e valor — «qual página do Instagram», «qual caixa
-- de e-mail» — e é isso que alguém precisa consultar ao auditar uma conexão.
-- Segredo continua fora daqui: vive cifrado em integration_secrets.

CREATE TABLE integration_connection_settings (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  connection_id uuid NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  key text NOT NULL,
  value_text text,
  value_number numeric(20, 6),
  value_boolean boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_connection_settings_unique UNIQUE (connection_id, key),
  CONSTRAINT integration_connection_settings_one_value_check CHECK (
    (CASE WHEN value_text IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN value_number IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN value_boolean IS NOT NULL THEN 1 ELSE 0 END) <= 1
  )
);
CREATE INDEX integration_connection_settings_connection_idx ON integration_connection_settings (org_id, connection_id);

ALTER TABLE integration_connection_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY integration_connection_settings_isolation_by_org ON integration_connection_settings FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON integration_connection_settings TO app_user;

INSERT INTO integration_connection_settings (id, org_id, connection_id, key, value_text, value_number, value_boolean)
SELECT gen_random_uuid(), c.org_id, c.id, entry.key,
  CASE WHEN jsonb_typeof(entry.value) IN ('string','object','array') THEN entry.value#>>'{}' END,
  CASE WHEN jsonb_typeof(entry.value) = 'number' THEN (entry.value#>>'{}')::numeric END,
  CASE WHEN jsonb_typeof(entry.value) = 'boolean' THEN (entry.value#>>'{}')::boolean END
FROM integration_connections c
CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(c.config) = 'object' THEN c.config ELSE '{}'::jsonb END) AS entry(key, value)
WHERE entry.value IS NOT NULL AND entry.value <> 'null'::jsonb
ON CONFLICT (connection_id, key) DO NOTHING;

ALTER PUBLICATION electric_publication_default ADD TABLE integration_connection_settings;
