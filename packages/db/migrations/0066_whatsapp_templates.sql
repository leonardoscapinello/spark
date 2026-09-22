-- Catálogo de modelos aprovados pela Meta, sincronizado por conexão — cada
-- número de WhatsApp tem o seu. Fora da janela de 24h, texto livre é
-- recusado pela Cloud API; só modelo pré-aprovado passa.
CREATE TABLE whatsapp_templates (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  connection_id uuid NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  name text NOT NULL,
  language text NOT NULL,
  category text NOT NULL,
  status text NOT NULL,
  body_text text NOT NULL,
  variable_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX whatsapp_templates_connection_name_language_uidx ON whatsapp_templates (connection_id, name, language);
CREATE INDEX whatsapp_templates_org_connection_idx ON whatsapp_templates (org_id, connection_id);
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY whatsapp_templates_isolation_by_org ON whatsapp_templates FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_templates TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE whatsapp_templates;
