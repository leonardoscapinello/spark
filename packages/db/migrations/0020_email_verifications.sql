CREATE TABLE email_verifications (
  org_id uuid NOT NULL REFERENCES organizations(id),
  email text NOT NULL,
  status text NOT NULL CHECK (status IN ('safe','invalid','disabled','disposable','inbox_full','catch_all','role_account','spamtrap','unknown')),
  overall_score integer CHECK (overall_score BETWEEN 0 AND 100),
  is_safe_to_send boolean NOT NULL,
  is_valid_syntax boolean NOT NULL,
  is_disposable boolean NOT NULL,
  is_role_account boolean NOT NULL,
  can_connect_smtp boolean NOT NULL,
  has_inbox_full boolean NOT NULL,
  is_catch_all boolean NOT NULL,
  is_deliverable boolean NOT NULL,
  is_disabled boolean NOT NULL,
  is_spamtrap boolean NOT NULL,
  is_free_email boolean NOT NULL,
  mx_accepts_mail boolean NOT NULL,
  mx_records jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_result jsonb NOT NULL,
  provider_connection_id uuid NOT NULL REFERENCES integration_connections(id),
  checked_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, email)
);
CREATE INDEX email_verifications_org_expiry_idx ON email_verifications (org_id, expires_at);
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY email_verifications_isolation_by_org ON email_verifications FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON email_verifications TO app_user;
