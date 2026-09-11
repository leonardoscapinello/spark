ALTER TABLE events DROP CONSTRAINT IF EXISTS events_org_id_organizations_id_fk;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_contact_id_contacts_id_fk;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_deal_id_deals_id_fk;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_company_id_companies_id_fk;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_deal_id_fkey;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_company_id_fkey;

ALTER TABLE events
  ADD CONSTRAINT events_org_id_organizations_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE events
  ADD CONSTRAINT events_contact_id_contacts_id_fk
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE events
  ADD CONSTRAINT events_deal_id_deals_id_fk
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;
ALTER TABLE events
  ADD CONSTRAINT events_company_id_companies_id_fk
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
