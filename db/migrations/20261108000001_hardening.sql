-- migrate:up
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_messages_status_check'
      AND conrelid = 'contact_messages'::regclass
  ) THEN
    ALTER TABLE contact_messages
      ADD CONSTRAINT contact_messages_status_check
      CHECK (status IN ('unread', 'read', 'replied'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_messages_name_length_check'
      AND conrelid = 'contact_messages'::regclass
  ) THEN
    ALTER TABLE contact_messages
      ADD CONSTRAINT contact_messages_name_length_check
      CHECK (char_length(name) BETWEEN 2 AND 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_messages_email_length_check'
      AND conrelid = 'contact_messages'::regclass
  ) THEN
    ALTER TABLE contact_messages
      ADD CONSTRAINT contact_messages_email_length_check
      CHECK (char_length(email) BETWEEN 3 AND 150);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_messages_message_length_check'
      AND conrelid = 'contact_messages'::regclass
  ) THEN
    ALTER TABLE contact_messages
      ADD CONSTRAINT contact_messages_message_length_check
      CHECK (char_length(message) BETWEEN 5 AND 3000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_messages_reply_notes_length_check'
      AND conrelid = 'contact_messages'::regclass
  ) THEN
    ALTER TABLE contact_messages
      ADD CONSTRAINT contact_messages_reply_notes_length_check
      CHECK (reply_notes IS NULL OR char_length(reply_notes) <= 2000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'site_content_json_object_check'
      AND conrelid = 'site_content'::regclass
  ) THEN
    ALTER TABLE site_content
      ADD CONSTRAINT site_content_json_object_check
      CHECK (jsonb_typeof(content) = 'object');
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contact_messages_set_updated_at ON contact_messages;
CREATE TRIGGER contact_messages_set_updated_at
BEFORE UPDATE ON contact_messages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS site_content_set_updated_at ON site_content;
CREATE TRIGGER site_content_set_updated_at
BEFORE UPDATE ON site_content
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- migrate:down
DROP TRIGGER IF EXISTS site_content_set_updated_at ON site_content;
DROP TRIGGER IF EXISTS contact_messages_set_updated_at ON contact_messages;
DROP FUNCTION IF EXISTS set_updated_at();

ALTER TABLE site_content
  DROP CONSTRAINT IF EXISTS site_content_json_object_check;

ALTER TABLE contact_messages
  DROP CONSTRAINT IF EXISTS contact_messages_reply_notes_length_check,
  DROP CONSTRAINT IF EXISTS contact_messages_message_length_check,
  DROP CONSTRAINT IF EXISTS contact_messages_email_length_check,
  DROP CONSTRAINT IF EXISTS contact_messages_name_length_check,
  DROP CONSTRAINT IF EXISTS contact_messages_status_check;
