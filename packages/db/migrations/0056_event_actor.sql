ALTER TABLE events ADD COLUMN actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX events_org_actor_occurred_idx ON events (org_id, actor_user_id, occurred_at DESC);
