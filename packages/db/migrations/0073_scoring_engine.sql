BEGIN;
ALTER TABLE contacts DROP CONSTRAINT contacts_score_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_score_check CHECK (score BETWEEN 0 AND 1000);
ALTER TABLE contacts ADD COLUMN score_calculated_at timestamptz;
ALTER TABLE contacts ADD COLUMN score_previous_week integer CHECK (score_previous_week BETWEEN 0 AND 1000);
ALTER TABLE contacts ADD COLUMN score_has_evidence boolean NOT NULL DEFAULT false;
ALTER TABLE audiences DROP CONSTRAINT audiences_minimum_score_check;
ALTER TABLE audiences ADD CONSTRAINT audiences_minimum_score_check CHECK (minimum_score IS NULL OR minimum_score BETWEEN 0 AND 1000);
-- Historical manual values remain distinguishable: calculated_at is NULL until evaluated.
CREATE TABLE score_models (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL REFERENCES organizations(id),
 scope text NOT NULL, definition jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 created_by uuid REFERENCES users(id), UNIQUE(org_id, scope, id)
);
CREATE TABLE score_policies (
 org_id uuid NOT NULL REFERENCES organizations(id), scope text NOT NULL,
 model_id uuid NOT NULL, PRIMARY KEY(org_id,scope),
 FOREIGN KEY(org_id,scope,model_id) REFERENCES score_models(org_id,scope,id)
);
CREATE TABLE score_signals (
 org_id uuid NOT NULL REFERENCES organizations(id), source_key text NOT NULL,
 contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
 scope text NOT NULL DEFAULT 'general', signal text NOT NULL,
 occurred_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
 units integer NOT NULL DEFAULT 1 CHECK(units BETWEEN 1 AND 100), PRIMARY KEY(org_id,source_key)
);
CREATE INDEX score_signals_contact_idx ON score_signals(org_id,contact_id,occurred_at);
CREATE TABLE score_signal_days (
 org_id uuid NOT NULL REFERENCES organizations(id), contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
 scope text NOT NULL, signal text NOT NULL, day date NOT NULL, count integer NOT NULL,
 PRIMARY KEY(org_id,contact_id,scope,signal,day)
);
CREATE TABLE score_jobs (
 org_id uuid NOT NULL REFERENCES organizations(id), contact_id uuid PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
 available_at timestamptz NOT NULL DEFAULT now(), lease_id uuid, leased_at timestamptz,
 attempts integer NOT NULL DEFAULT 0, last_error text
);
CREATE INDEX score_jobs_due_idx ON score_jobs(available_at) WHERE lease_id IS NULL;
CREATE INDEX score_jobs_lease_idx ON score_jobs(leased_at) WHERE lease_id IS NOT NULL;
CREATE TABLE score_rebuilds (
 org_id uuid PRIMARY KEY REFERENCES organizations(id), cursor uuid, requested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE score_rebuilds ENABLE ROW LEVEL SECURITY;
CREATE POLICY score_rebuilds_org ON score_rebuilds FOR ALL TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON score_rebuilds TO app_user;
CREATE TABLE score_results (
 org_id uuid NOT NULL REFERENCES organizations(id), contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
 scope text NOT NULL, model_id uuid NOT NULL REFERENCES score_models(id), value integer NOT NULL CHECK(value BETWEEN 0 AND 1000),
 has_evidence boolean NOT NULL, contributions jsonb NOT NULL, calculated_at timestamptz NOT NULL,
 PRIMARY KEY(org_id,contact_id,scope)
);
CREATE TABLE score_snapshots (
 id uuid NOT NULL DEFAULT gen_random_uuid(), org_id uuid NOT NULL REFERENCES organizations(id),
 contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE, scope text NOT NULL,
 model_id uuid NOT NULL REFERENCES score_models(id), value integer NOT NULL CHECK(value BETWEEN 0 AND 1000),
 has_evidence boolean NOT NULL, contributions jsonb NOT NULL,
 captured_at timestamptz NOT NULL, day date NOT NULL,
 PRIMARY KEY(id,day), UNIQUE(org_id,contact_id,scope,day)
) PARTITION BY RANGE(day);
DO $$ DECLARE start_date date; end_date date; part_name text; BEGIN
 FOR n IN 0..3 LOOP
  start_date := (date_trunc('month',CURRENT_DATE)+make_interval(months=>n))::date;
  end_date := (start_date+interval '1 month')::date;
  part_name := 'score_snapshots_y'||to_char(start_date,'YYYY')||'m'||to_char(start_date,'MM');
  EXECUTE format('CREATE TABLE %I PARTITION OF score_snapshots FOR VALUES FROM (%L) TO (%L)',part_name,start_date,end_date);
 END LOOP;
END $$;
CREATE TABLE score_snapshots_default PARTITION OF score_snapshots DEFAULT;
CREATE INDEX score_snapshots_contact_idx ON score_snapshots(org_id,contact_id,scope,day DESC);
-- Immutable model versions; new behavior requires publishing a new row.
CREATE FUNCTION score_model_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Score model versions are immutable'; END $$;
CREATE TRIGGER score_model_immutable BEFORE UPDATE ON score_models FOR EACH ROW EXECUTE FUNCTION score_model_immutable();
-- Transport/aggregation only; scoring weights and evaluation live in core.
CREATE FUNCTION score_signal_ingested() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM contacts WHERE id=NEW.contact_id AND org_id=NEW.org_id) THEN RAISE EXCEPTION 'Invalid score contact scope'; END IF;
 INSERT INTO score_signal_days(org_id,contact_id,scope,signal,day,count)
 VALUES(NEW.org_id,NEW.contact_id,NEW.scope,NEW.signal,(NEW.occurred_at AT TIME ZONE 'UTC')::date,NEW.units)
 ON CONFLICT(org_id,contact_id,scope,signal,day) DO UPDATE SET count=LEAST(1000000,score_signal_days.count+EXCLUDED.count);
 INSERT INTO score_jobs(org_id,contact_id) VALUES(NEW.org_id,NEW.contact_id)
 ON CONFLICT(contact_id) DO UPDATE SET available_at=LEAST(score_jobs.available_at,now());
 RETURN NEW;
END $$;
CREATE TRIGGER score_signal_ingested AFTER INSERT ON score_signals FOR EACH ROW EXECUTE FUNCTION score_signal_ingested();
CREATE FUNCTION score_event_ingested() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.contact_id IS NOT NULL AND NEW.type NOT LIKE 'score.%' THEN
  INSERT INTO score_signals(org_id,source_key,contact_id,signal,occurred_at)
  VALUES(NEW.org_id,'event:'||NEW.id,NEW.contact_id,NEW.type,NEW.occurred_at) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER score_event_ingested AFTER INSERT ON events FOR EACH ROW EXECUTE FUNCTION score_event_ingested();
CREATE FUNCTION score_contact_created() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN INSERT INTO score_jobs(org_id,contact_id) VALUES(NEW.org_id,NEW.id) ON CONFLICT DO NOTHING; RETURN NEW; END $$;
CREATE TRIGGER score_contact_created AFTER INSERT ON contacts FOR EACH ROW EXECUTE FUNCTION score_contact_created();
INSERT INTO score_jobs(org_id,contact_id) SELECT org_id,id FROM contacts WHERE deleted_at IS NULL;
ALTER TABLE score_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY score_models_org ON score_models FOR ALL TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid) WITH CHECK(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON score_models TO app_user;
ALTER TABLE score_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY score_policies_org ON score_policies FOR ALL TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid) WITH CHECK(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON score_policies TO app_user;
ALTER TABLE score_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY score_signals_org ON score_signals FOR ALL TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid) WITH CHECK(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON score_signals TO app_user;
ALTER TABLE score_signal_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY score_signal_days_org ON score_signal_days FOR ALL TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid) WITH CHECK(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON score_signal_days TO app_user;
ALTER TABLE score_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY score_jobs_org ON score_jobs FOR ALL TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid) WITH CHECK(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON score_jobs TO app_user;
ALTER TABLE score_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY score_results_org ON score_results FOR ALL TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid) WITH CHECK(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON score_results TO app_user;
ALTER TABLE score_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY score_snapshots_org ON score_snapshots FOR ALL TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid) WITH CHECK(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON score_snapshots TO app_user;
REVOKE UPDATE,DELETE ON score_models FROM app_user;
REVOKE UPDATE,DELETE ON score_signals FROM app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE score_snapshots;
COMMIT;
