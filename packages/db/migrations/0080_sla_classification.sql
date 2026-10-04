BEGIN;
ALTER TABLE sla_policies ADD COLUMN impact_id uuid, ADD COLUMN urgency_id uuid,
 ADD FOREIGN KEY (org_id, impact_id) REFERENCES service_levels(org_id, id),
 ADD FOREIGN KEY (org_id, urgency_id) REFERENCES service_levels(org_id, id),
 ADD CHECK ((impact_id IS NULL) = (urgency_id IS NULL));
DROP INDEX sla_policy_scope;
CREATE UNIQUE INDEX sla_policy_scope ON sla_policies(org_id, category_id, priority_id) NULLS NOT DISTINCT WHERE NOT archived AND impact_id IS NULL;
CREATE UNIQUE INDEX sla_policy_classification ON sla_policies(org_id, category_id, impact_id, urgency_id) NULLS NOT DISTINCT WHERE NOT archived AND impact_id IS NOT NULL;
COMMIT;
