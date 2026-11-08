CREATE TABLE IF NOT EXISTS site_content (
  id integer PRIMARY KEY CHECK (id = 1),
  content jsonb NOT NULL CONSTRAINT site_content_json_object_check CHECK (jsonb_typeof(content) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name text NOT NULL CONSTRAINT contact_messages_name_length_check CHECK (char_length(name) BETWEEN 2 AND 100),
  email text NOT NULL CONSTRAINT contact_messages_email_length_check CHECK (char_length(email) BETWEEN 3 AND 150),
  message text NOT NULL CONSTRAINT contact_messages_message_length_check CHECK (char_length(message) BETWEEN 5 AND 3000),
  status text NOT NULL DEFAULT 'unread' CONSTRAINT contact_messages_status_check CHECK (status IN ('unread', 'read', 'replied')),
  read_at timestamptz,
  reply_notes text CONSTRAINT contact_messages_reply_notes_length_check CHECK (reply_notes IS NULL OR char_length(reply_notes) <= 2000),
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);

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
