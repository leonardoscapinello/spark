ALTER TABLE conversations ADD COLUMN first_response_due_at timestamptz;
ALTER TABLE conversations ADD COLUMN first_responded_at timestamptz;
UPDATE conversations SET first_response_due_at = created_at + CASE WHEN priority = 'priority' THEN interval '15 minutes' ELSE interval '60 minutes' END;
ALTER TABLE conversations ALTER COLUMN first_response_due_at SET NOT NULL;
CREATE INDEX conversations_org_sla_idx ON conversations (org_id, first_response_due_at) WHERE status = 'open' AND first_responded_at IS NULL;
ALTER PUBLICATION electric_publication_default ADD TABLE teams;
