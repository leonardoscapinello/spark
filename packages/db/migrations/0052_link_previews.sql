CREATE TABLE link_previews (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  url text NOT NULL,
  url_hash text NOT NULL,
  canonical_url text,
  title text,
  description text,
  image_url text,
  site_name text,
  favicon_url text,
  status text NOT NULL,
  http_status integer,
  fetched_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  failure_count integer NOT NULL DEFAULT 0,
  etag text,
  last_modified text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT link_previews_status_check CHECK (status = ANY (ARRAY['ready', 'failed'])),
  CONSTRAINT link_previews_hash_check CHECK (url_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT link_previews_failure_count_check CHECK (failure_count >= 0),
  CONSTRAINT link_previews_http_status_check CHECK (http_status IS NULL OR http_status BETWEEN 100 AND 599)
);
CREATE UNIQUE INDEX link_previews_org_url_hash_uidx ON link_previews (org_id, url_hash);
CREATE INDEX link_previews_org_expires_idx ON link_previews (org_id, expires_at);
ALTER TABLE link_previews ENABLE ROW LEVEL SECURITY;
CREATE POLICY link_previews_isolation_by_org ON link_previews FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON link_previews TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE link_previews;
