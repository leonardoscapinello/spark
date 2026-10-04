ALTER TABLE service_categories
  ADD COLUMN default_impact_id uuid,
  ADD COLUMN default_urgency_id uuid,
  ADD CONSTRAINT service_categories_default_impact_fk FOREIGN KEY(org_id,default_impact_id) REFERENCES service_levels(org_id,id),
  ADD CONSTRAINT service_categories_default_urgency_fk FOREIGN KEY(org_id,default_urgency_id) REFERENCES service_levels(org_id,id);
