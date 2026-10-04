BEGIN;
CREATE TABLE service_categories (id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations(id),
 name text NOT NULL,
 sort_order integer NOT NULL,
 archived boolean NOT NULL,
 parent_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(org_id,id));
CREATE INDEX service_categories_org_idx ON service_categories(org_id);
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_categories_org ON service_categories TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON service_categories TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE service_categories;
CREATE TABLE service_statuses (id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations(id),
 name text NOT NULL,
 sort_order integer NOT NULL,
 archived boolean NOT NULL,
 color text NOT NULL,
 operational_type text NOT NULL,
 pause_first_response boolean NOT NULL,
 pause_total boolean NOT NULL,
 resume_on_inbound boolean NOT NULL,
 budget_minutes integer,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(org_id,id));
CREATE INDEX service_statuses_org_idx ON service_statuses(org_id);
ALTER TABLE service_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_statuses_org ON service_statuses TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON service_statuses TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE service_statuses;
CREATE TABLE service_levels (id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations(id),
 name text NOT NULL,
 sort_order integer NOT NULL,
 archived boolean NOT NULL,
 kind text NOT NULL,
 color text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(org_id,id));
CREATE INDEX service_levels_org_idx ON service_levels(org_id);
ALTER TABLE service_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_levels_org ON service_levels TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON service_levels TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE service_levels;
CREATE TABLE priority_matrix (id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations(id),
 impact_id uuid NOT NULL,
 urgency_id uuid NOT NULL,
 priority_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(org_id,id));
CREATE INDEX priority_matrix_org_idx ON priority_matrix(org_id);
ALTER TABLE priority_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY priority_matrix_org ON priority_matrix TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON priority_matrix TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE priority_matrix;
CREATE TABLE sla_policies (id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations(id),
 name text NOT NULL,
 sort_order integer NOT NULL,
 archived boolean NOT NULL,
 category_id uuid,
 priority_id uuid,
 first_response_minutes integer NOT NULL,
 total_minutes integer NOT NULL,
 warning_percent integer NOT NULL,
 version integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(org_id,id));
CREATE INDEX sla_policies_org_idx ON sla_policies(org_id);
ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY sla_policies_org ON sla_policies TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON sla_policies TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE sla_policies;
ALTER TABLE service_categories ADD FOREIGN KEY(org_id,parent_id) REFERENCES service_categories(org_id,id);
ALTER TABLE priority_matrix ADD FOREIGN KEY(org_id,impact_id) REFERENCES service_levels(org_id,id), ADD FOREIGN KEY(org_id,urgency_id) REFERENCES service_levels(org_id,id), ADD FOREIGN KEY(org_id,priority_id) REFERENCES service_levels(org_id,id), ADD UNIQUE(org_id,impact_id,urgency_id);
ALTER TABLE sla_policies ADD FOREIGN KEY(org_id,category_id) REFERENCES service_categories(org_id,id), ADD FOREIGN KEY(org_id,priority_id) REFERENCES service_levels(org_id,id), ADD CHECK(first_response_minutes > 0 AND total_minutes > 0 AND warning_percent BETWEEN 1 AND 99);
CREATE UNIQUE INDEX sla_policy_scope ON sla_policies(org_id,category_id,priority_id) NULLS NOT DISTINCT WHERE NOT archived;
ALTER TABLE service_statuses ADD CHECK(operational_type IN ('active','waiting','closed')), ADD CHECK(budget_minutes IS NULL OR budget_minutes > 0);
ALTER TABLE service_levels ADD CHECK(kind IN ('impact','urgency','priority'));
COMMIT;
