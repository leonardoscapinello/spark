CREATE TABLE conversations (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  contact_id uuid NOT NULL REFERENCES contacts(id),
  channel text NOT NULL CHECK (channel IN ('manual', 'email', 'instagram', 'whatsapp', 'messenger')),
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'snoozed', 'closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'priority')),
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  snoozed_until timestamptz,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX conversations_org_status_activity_idx ON conversations (org_id, status, last_message_at DESC);
CREATE INDEX conversations_org_assignee_status_idx ON conversations (org_id, assignee_id, status);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversations_isolation_by_org ON conversations FOR ALL TO app_user
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE TABLE messages (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id),
  author_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),
  status text NOT NULL CHECK (status IN ('received', 'draft', 'queued', 'sent', 'delivered', 'read', 'failed')),
  body text NOT NULL,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_org_conversation_created_idx ON messages (org_id, conversation_id, created_at);
CREATE UNIQUE INDEX messages_org_external_unique ON messages (org_id, external_id) WHERE external_id IS NOT NULL;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_isolation_by_org ON messages FOR ALL TO app_user
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON conversations, messages TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE conversations, messages;

UPDATE permission_groups
SET capabilities = capabilities || '["inbox:read", "inbox:write"]'::jsonb,
    updated_at = now()
WHERE name IN ('Proprietário', 'Administrador', 'Gerente', 'Agente')
  AND NOT capabilities @> '["inbox:read", "inbox:write"]'::jsonb;

UPDATE permission_groups
SET capabilities = capabilities || '["inbox:read"]'::jsonb,
    updated_at = now()
WHERE name = 'Visualizador'
  AND NOT capabilities @> '["inbox:read"]'::jsonb;
