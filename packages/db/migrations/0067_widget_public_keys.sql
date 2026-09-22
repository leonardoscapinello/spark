CREATE TABLE widget_public_keys (public_key text PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations(id), connection_id uuid NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE);
GRANT SELECT ON widget_public_keys TO app_user;
