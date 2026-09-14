-- Mensagens crescem no mesmo ritmo de eventos e seguem a mesma regra do
-- ADR-0021/stack: partição mensal. A tabela auxiliar mantém unicidade global
-- de id e de identificador externo, que o Postgres não permite declarar
-- diretamente numa tabela particionada sem incluir created_at.

ALTER PUBLICATION electric_publication_default DROP TABLE messages;
ALTER TABLE messages RENAME TO messages_legacy;
DROP INDEX messages_org_conversation_created_idx;
DROP INDEX messages_org_external_unique;

CREATE TABLE message_registry (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  external_id text,
  created_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX message_registry_org_external_uidx ON message_registry (org_id, external_id) WHERE external_id IS NOT NULL;
REVOKE ALL ON TABLE message_registry FROM app_user;

CREATE TABLE messages (
  id uuid NOT NULL,
  org_id uuid NOT NULL REFERENCES organizations(id),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id),
  author_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),
  status text NOT NULL CHECK (status IN ('received', 'draft', 'queued', 'sent', 'delivered', 'read', 'failed')),
  body text NOT NULL,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT messages_id_created_at_pk PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

DO $$
DECLARE month_start date := date '2026-09-01'; next_month date; partition_name text;
BEGIN
  WHILE month_start < date '2028-01-01' LOOP
    next_month := (month_start + interval '1 month')::date;
    partition_name := format('messages_y%sm%s', extract(year FROM month_start)::int, lpad(extract(month FROM month_start)::int::text, 2, '0'));
    EXECUTE format('CREATE TABLE %I PARTITION OF messages FOR VALUES FROM (%L) TO (%L)', partition_name, month_start, next_month);
    month_start := next_month;
  END LOOP;
END $$;
CREATE TABLE messages_default PARTITION OF messages DEFAULT;

CREATE OR REPLACE FUNCTION register_message_identity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO message_registry (id, org_id, external_id, created_at)
  VALUES (NEW.id, NEW.org_id, NEW.external_id, NEW.created_at)
  ON CONFLICT (id) DO UPDATE SET
    org_id = EXCLUDED.org_id,
    external_id = COALESCE(EXCLUDED.external_id, message_registry.external_id),
    created_at = EXCLUDED.created_at;
  RETURN NEW;
END $$;
CREATE TRIGGER messages_registry_guard BEFORE INSERT OR UPDATE OF org_id, external_id, created_at ON messages
  FOR EACH ROW EXECUTE FUNCTION register_message_identity();
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Reinstala as garantias que pertenciam à tabela anterior.
CREATE TRIGGER messages_conversation_contact_guard BEFORE INSERT OR UPDATE OF org_id, conversation_id, contact_id ON messages
  FOR EACH ROW EXECUTE FUNCTION enforce_parent_attribute('conversations', 'conversation_id', 'contact_id', 'contact_id');
CREATE TRIGGER messages_conversation_tenant_guard BEFORE INSERT OR UPDATE OF org_id, conversation_id ON messages
  FOR EACH ROW EXECUTE FUNCTION enforce_same_org_fk('conversations', 'id', 'conversation_id');
CREATE TRIGGER messages_contact_tenant_guard BEFORE INSERT OR UPDATE OF org_id, contact_id ON messages
  FOR EACH ROW EXECUTE FUNCTION enforce_same_org_fk('contacts', 'id', 'contact_id');
CREATE TRIGGER messages_author_tenant_guard BEFORE INSERT OR UPDATE OF org_id, author_user_id ON messages
  FOR EACH ROW EXECUTE FUNCTION enforce_same_org_fk('users', 'id', 'author_user_id');

INSERT INTO messages (id, org_id, conversation_id, contact_id, author_user_id, direction, status, body, external_id, created_at, updated_at)
SELECT id, org_id, conversation_id, contact_id, author_user_id, direction, status, body, external_id, created_at, created_at
FROM messages_legacy;
DROP TABLE messages_legacy;

CREATE INDEX messages_org_conversation_created_idx ON messages (org_id, conversation_id, created_at DESC);
CREATE INDEX messages_org_status_created_idx ON messages (org_id, status, created_at DESC);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_isolation_by_org ON messages FOR ALL TO app_user
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE messages;
