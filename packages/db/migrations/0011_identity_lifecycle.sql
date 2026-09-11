ALTER TABLE identities DROP CONSTRAINT IF EXISTS identities_org_id_organizations_id_fk;
ALTER TABLE identities DROP CONSTRAINT IF EXISTS identities_contact_id_contacts_id_fk;

ALTER TABLE identities
  ADD CONSTRAINT identities_org_id_organizations_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE identities
  ADD CONSTRAINT identities_contact_id_contacts_id_fk
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
