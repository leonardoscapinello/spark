ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS lead_status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_lead_status_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_lead_status_check
  CHECK (lead_status IN ('new', 'qualified', 'nurturing', 'customer', 'unqualified'));

CREATE INDEX IF NOT EXISTS contacts_org_owner_idx ON contacts (org_id, owner_id);
CREATE INDEX IF NOT EXISTS contacts_org_lead_status_idx ON contacts (org_id, lead_status);

ALTER PUBLICATION electric_publication_default ADD TABLE users;
