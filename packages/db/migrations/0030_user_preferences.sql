-- Preferências de interface por pessoa: sidebar fixada, colunas, layout.
-- Vivem no banco para seguir o usuário entre dispositivos (packages/core/schema/userPreference).
CREATE TABLE user_preferences (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_preferences_user_key UNIQUE (org_id, user_id, key)
);
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_preferences_isolation_by_org ON user_preferences FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON user_preferences TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE user_preferences;
