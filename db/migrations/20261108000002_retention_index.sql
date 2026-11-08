-- migrate:up
CREATE INDEX IF NOT EXISTS idx_contact_messages_retention
  ON contact_messages (status, replied_at, created_at);

-- migrate:down
DROP INDEX IF EXISTS idx_contact_messages_retention;
