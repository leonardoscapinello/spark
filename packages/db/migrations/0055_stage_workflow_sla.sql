ALTER TABLE stages ADD COLUMN sla_minutes integer;
ALTER TABLE stages ADD COLUMN allow_won boolean NOT NULL DEFAULT true;
ALTER TABLE stages ADD COLUMN allow_lost boolean NOT NULL DEFAULT true;
ALTER TABLE stages ADD COLUMN restrict_transitions boolean NOT NULL DEFAULT false;
ALTER TABLE stages ADD CONSTRAINT stages_sla_minutes_check CHECK (sla_minutes IS NULL OR sla_minutes > 0);

ALTER TABLE deals ADD COLUMN stage_entered_at timestamptz NOT NULL DEFAULT now();
UPDATE deals SET stage_entered_at = updated_at;

CREATE TABLE stage_transitions (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  pipeline_id uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  from_stage_id uuid NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  to_stage_id uuid NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stage_transitions_from_to UNIQUE (org_id, from_stage_id, to_stage_id),
  CONSTRAINT stage_transitions_not_self CHECK (from_stage_id <> to_stage_id)
);
CREATE INDEX stage_transitions_pipeline_idx ON stage_transitions (org_id, pipeline_id, from_stage_id);
ALTER TABLE stage_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY stage_transitions_isolation_by_org ON stage_transitions FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON stage_transitions TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE stage_transitions;

CREATE TABLE business_hours (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  weekday integer NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  start_time text NOT NULL,
  break_start_time text,
  break_end_time text,
  end_time text NOT NULL,
  time_zone text NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_hours_org_weekday UNIQUE (org_id, weekday),
  CONSTRAINT business_hours_weekday_check CHECK (weekday BETWEEN 0 AND 6),
  CONSTRAINT business_hours_range_check CHECK (start_time < end_time)
);
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_hours_isolation_by_org ON business_hours FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON business_hours TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE business_hours;

CREATE TABLE holidays (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'closed',
  start_time text,
  break_start_time text,
  break_end_time text,
  end_time text,
  repeats_annually boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT holidays_date_range_check CHECK (end_date >= start_date),
  CONSTRAINT holidays_kind_check CHECK (kind = ANY (ARRAY['closed', 'reduced']))
);
CREATE INDEX holidays_org_dates_idx ON holidays (org_id, start_date, end_date);
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY holidays_isolation_by_org ON holidays FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON holidays TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE holidays;
