CREATE TABLE calendar_events (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_id text NOT NULL,
  calendar_name text NOT NULL,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  availability text NOT NULL DEFAULT 'busy',
  location text,
  status text NOT NULL DEFAULT 'confirmed',
  synced_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_events_provider_check CHECK (provider = ANY (ARRAY['google_calendar', 'outlook_calendar', 'apple_calendar'])),
  CONSTRAINT calendar_events_availability_check CHECK (availability = ANY (ARRAY['free', 'busy'])),
  CONSTRAINT calendar_events_status_check CHECK (status = ANY (ARRAY['confirmed', 'tentative', 'cancelled'])),
  CONSTRAINT calendar_events_interval_check CHECK (ends_at >= starts_at)
);
CREATE UNIQUE INDEX calendar_events_connection_external_uidx ON calendar_events (connection_id, external_id);
CREATE INDEX calendar_events_owner_time_idx ON calendar_events (org_id, owner_id, starts_at, ends_at);
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY calendar_events_isolation_by_org ON calendar_events FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON calendar_events TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE calendar_events;
