BEGIN;
ALTER TABLE conversations ADD COLUMN service_status_id uuid REFERENCES service_statuses(id), ADD COLUMN category_id uuid REFERENCES service_categories(id), ADD COLUMN impact_id uuid REFERENCES service_levels(id), ADD COLUMN urgency_id uuid REFERENCES service_levels(id), ADD COLUMN service_priority_id uuid REFERENCES service_levels(id);
CREATE TABLE service_cycles (
 id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations(id), conversation_id uuid NOT NULL REFERENCES conversations(id),
 policy_id uuid REFERENCES sla_policies(id), policy_name text, policy_version integer, first_response_minutes integer, total_minutes integer, warning_percent integer NOT NULL,
 opened_at timestamptz NOT NULL, closed_at timestamptz, first_inbound_at timestamptz, first_responded_at timestamptz, UNIQUE(org_id,id)
);
CREATE INDEX service_cycles_org_conversation ON service_cycles(org_id,conversation_id);
CREATE UNIQUE INDEX service_cycle_open ON service_cycles(conversation_id) WHERE closed_at IS NULL;
CREATE TABLE service_segments (
 id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations(id), conversation_id uuid NOT NULL REFERENCES conversations(id), cycle_id uuid NOT NULL,
 status_id uuid REFERENCES service_statuses(id), status_name text NOT NULL, started_at timestamptz NOT NULL, ended_at timestamptz,
 first_counting boolean NOT NULL, total_counting boolean NOT NULL, budget_minutes integer, elapsed_ms bigint NOT NULL DEFAULT 0 CHECK(elapsed_ms>=0),
 FOREIGN KEY(org_id,cycle_id) REFERENCES service_cycles(org_id,id)
);
CREATE INDEX service_segments_org_cycle ON service_segments(org_id,cycle_id);
CREATE UNIQUE INDEX service_segment_open ON service_segments(cycle_id) WHERE ended_at IS NULL;
CREATE TABLE service_cycle_hours (LIKE business_hours INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
ALTER TABLE service_cycle_hours ADD PRIMARY KEY(id), ADD COLUMN cycle_id uuid NOT NULL, ADD FOREIGN KEY(org_id,cycle_id) REFERENCES service_cycles(org_id,id), ADD UNIQUE(org_id,cycle_id,weekday);
CREATE TABLE service_cycle_holidays (LIKE holidays INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
ALTER TABLE service_cycle_holidays ADD PRIMARY KEY(id), ADD COLUMN cycle_id uuid NOT NULL, ADD FOREIGN KEY(org_id,cycle_id) REFERENCES service_cycles(org_id,id);
CREATE INDEX service_cycle_holidays_org_cycle ON service_cycle_holidays(org_id,cycle_id);
ALTER TABLE service_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_cycles_org ON service_cycles TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON service_cycles TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE service_cycles;
ALTER TABLE service_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_segments_org ON service_segments TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON service_segments TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE service_segments;
ALTER TABLE service_cycle_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_cycle_hours_org ON service_cycle_hours TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON service_cycle_hours TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE service_cycle_hours;
ALTER TABLE service_cycle_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_cycle_holidays_org ON service_cycle_holidays TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON service_cycle_holidays TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE service_cycle_holidays;
COMMIT;
