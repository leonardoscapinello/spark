CREATE TABLE automation_runs (
  id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations(id), automation_id uuid NOT NULL REFERENCES automations(id),
  version_id uuid NOT NULL REFERENCES automation_versions(id), contact_id uuid NOT NULL REFERENCES contacts(id),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','waiting','completed','failed','cancelled')),
  current_node_id text, context jsonb NOT NULL DEFAULT '{}'::jsonb, error text, started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX automation_runs_org_automation_started_idx ON automation_runs (org_id, automation_id, started_at DESC);
CREATE INDEX automation_runs_org_contact_idx ON automation_runs (org_id, contact_id);
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY automation_runs_isolation_by_org ON automation_runs FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE TABLE automation_run_steps (
  id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations(id), run_id uuid NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
  node_id text NOT NULL, attempt integer NOT NULL DEFAULT 1 CHECK (attempt > 0), status text NOT NULL CHECK (status IN ('running','waiting','completed','failed','skipped')),
  result jsonb NOT NULL DEFAULT '{}'::jsonb, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
  CONSTRAINT automation_run_steps_idempotency UNIQUE (run_id, node_id, attempt)
);
CREATE INDEX automation_run_steps_org_run_idx ON automation_run_steps (org_id, run_id, started_at);
ALTER TABLE automation_run_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY automation_run_steps_isolation_by_org ON automation_run_steps FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE TABLE automation_timers (
  id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations(id), run_id uuid NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
  node_id text NOT NULL, fire_at timestamptz NOT NULL, claimed_at timestamptz, completed_at timestamptz
);
CREATE INDEX automation_timers_due_idx ON automation_timers (fire_at) WHERE claimed_at IS NULL AND completed_at IS NULL;
ALTER TABLE automation_timers ENABLE ROW LEVEL SECURITY;
CREATE POLICY automation_timers_isolation_by_org ON automation_timers FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE TABLE automation_jobs (
  id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations(id), run_id uuid NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
  node_id text NOT NULL, available_at timestamptz NOT NULL DEFAULT now(), resume boolean NOT NULL DEFAULT false,
  claimed_at timestamptz, completed_at timestamptz, attempts integer NOT NULL DEFAULT 0
);
CREATE INDEX automation_jobs_available_idx ON automation_jobs (available_at) WHERE claimed_at IS NULL AND completed_at IS NULL;
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY automation_jobs_isolation_by_org ON automation_jobs FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE ON automation_runs, automation_run_steps, automation_timers, automation_jobs TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE automation_runs, automation_run_steps;
