CREATE TABLE contact_companies (
 org_id uuid NOT NULL REFERENCES organizations(id),
 contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
 company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (org_id, contact_id, company_id)
);
CREATE INDEX contact_companies_company_idx ON contact_companies(org_id, company_id);
ALTER TABLE contact_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY contact_companies_isolation_by_org ON contact_companies FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON contact_companies TO app_user;
INSERT INTO contact_companies (org_id, contact_id, company_id)
 SELECT c.org_id, c.id, c.company_id FROM contacts c JOIN companies p ON p.id = c.company_id AND p.org_id = c.org_id WHERE c.company_id IS NOT NULL;
CREATE FUNCTION preserve_contact_company_link() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.company_id IS NOT NULL THEN
 INSERT INTO contact_companies(org_id, contact_id, company_id) VALUES (NEW.org_id, NEW.id, NEW.company_id) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER preserve_contact_company_link AFTER INSERT OR UPDATE OF company_id ON contacts FOR EACH ROW EXECUTE FUNCTION preserve_contact_company_link();
ALTER PUBLICATION electric_publication_default ADD TABLE contact_companies;
