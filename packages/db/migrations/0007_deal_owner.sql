ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS deals_org_owner_idx ON deals (org_id, owner_id);
