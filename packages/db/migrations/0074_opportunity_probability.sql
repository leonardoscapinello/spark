-- Forecasts are server-owned and independent from stage passage probability.
ALTER TABLE deals ADD COLUMN probability_basis_points integer CHECK (probability_basis_points BETWEEN 0 AND 10000),
 ADD COLUMN probability_calculated_at timestamptz,
 ADD COLUMN probability_version text,
 ADD COLUMN probability_sample_size integer CHECK (probability_sample_size >= 0);
CREATE TABLE opportunity_jobs (
 org_id uuid NOT NULL REFERENCES organizations(id), deal_id uuid PRIMARY KEY REFERENCES deals(id) ON DELETE CASCADE,
 available_at timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 0, last_error text
);
CREATE INDEX opportunity_jobs_due ON opportunity_jobs(available_at) WHERE attempts < 10;
CREATE TABLE opportunity_baselines (
 org_id uuid NOT NULL REFERENCES organizations(id), pipeline_id uuid PRIMARY KEY REFERENCES pipelines(id) ON DELETE CASCADE,
 won integer NOT NULL DEFAULT 0, lost integer NOT NULL DEFAULT 0, typical_won_days double precision,
 calculated_at timestamptz
);
CREATE TABLE opportunity_predictions (
 org_id uuid NOT NULL REFERENCES organizations(id), deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
 day date NOT NULL, calculated_at timestamptz NOT NULL, version text NOT NULL,
 basis_points integer NOT NULL CHECK (basis_points BETWEEN 0 AND 10000),
 evidence jsonb NOT NULL, PRIMARY KEY(org_id,deal_id,day)
);
CREATE INDEX opportunity_predictions_day ON opportunity_predictions(org_id,day);
CREATE INDEX deals_probability_person ON deals(org_id,contact_id,status) WHERE deleted_at IS NULL;
CREATE INDEX deals_probability_company ON deals(org_id,company_id,status) WHERE deleted_at IS NULL;
CREATE INDEX activities_probability_deal ON activities(org_id,deal_id,scheduled_at);
CREATE INDEX activities_probability_contact ON activities(org_id,contact_id,scheduled_at);
CREATE INDEX contacts_probability_company ON contacts(org_id,company_id) WHERE deleted_at IS NULL;

ALTER TABLE opportunity_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY opportunity_jobs_org ON opportunity_jobs TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid);
CREATE POLICY opportunity_baselines_org ON opportunity_baselines TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid);
CREATE POLICY opportunity_predictions_org ON opportunity_predictions TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON opportunity_jobs,opportunity_baselines,opportunity_predictions TO app_user;

CREATE FUNCTION enqueue_opportunity_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO opportunity_jobs(org_id,deal_id) VALUES(NEW.org_id,NEW.id)
 ON CONFLICT(deal_id) DO UPDATE SET available_at=now(),attempts=0;
 -- Outcome changes invalidate the shared prior; nightly refresh also covers deletions/window expiry.
 IF TG_OP='INSERT' THEN
   INSERT INTO opportunity_baselines(org_id,pipeline_id) VALUES(NEW.org_id,NEW.pipeline_id) ON CONFLICT DO NOTHING;
 ELSIF NEW.status IS DISTINCT FROM OLD.status OR NEW.pipeline_id IS DISTINCT FROM OLD.pipeline_id OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
   INSERT INTO opportunity_baselines(org_id,pipeline_id) VALUES(NEW.org_id,NEW.pipeline_id)
   ON CONFLICT(pipeline_id) DO UPDATE SET calculated_at=NULL;
   UPDATE opportunity_baselines SET calculated_at=NULL WHERE pipeline_id=OLD.pipeline_id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER opportunity_deal_insert AFTER INSERT ON deals FOR EACH ROW EXECUTE FUNCTION enqueue_opportunity_change();
CREATE TRIGGER opportunity_deal_change AFTER UPDATE OF status,stage_id,pipeline_id,contact_id,company_id,deleted_at,is_archived ON deals FOR EACH ROW EXECUTE FUNCTION enqueue_opportunity_change();

-- Only queue direct relationships here. Company peers receive updated aggregates on their daily pass.
CREATE FUNCTION enqueue_opportunity_contact() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO opportunity_jobs(org_id,deal_id)
 SELECT org_id,id FROM deals WHERE org_id=NEW.org_id AND contact_id=NEW.id AND status='open' AND deleted_at IS NULL AND NOT is_archived
 ON CONFLICT(deal_id) DO UPDATE SET available_at=now(),attempts=0;
 RETURN NEW;
END $$;
CREATE TRIGGER opportunity_contact_score AFTER UPDATE OF score,score_has_evidence,company_id ON contacts FOR EACH ROW EXECUTE FUNCTION enqueue_opportunity_contact();
CREATE FUNCTION enqueue_opportunity_activity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO opportunity_jobs(org_id,deal_id)
 SELECT org_id,id FROM deals WHERE org_id=NEW.org_id AND (id=NEW.deal_id OR contact_id=NEW.contact_id) AND status='open' AND deleted_at IS NULL AND NOT is_archived
 ON CONFLICT(deal_id) DO UPDATE SET available_at=now(),attempts=0;
 RETURN NEW;
END $$;
CREATE TRIGGER opportunity_activity_change AFTER INSERT OR UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION enqueue_opportunity_activity();
INSERT INTO opportunity_jobs(org_id,deal_id) SELECT org_id,id FROM deals WHERE status='open' AND deleted_at IS NULL AND NOT is_archived;
INSERT INTO opportunity_baselines(org_id,pipeline_id) SELECT org_id,id FROM pipelines;
