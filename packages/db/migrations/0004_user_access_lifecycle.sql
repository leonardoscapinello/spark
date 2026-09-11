ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS activated_at timestamptz;

UPDATE users
SET activated_at = created_at
WHERE invited_at IS NULL
  AND activated_at IS NULL;
