CREATE TABLE IF NOT EXISTS site_content (
  id integer PRIMARY KEY CHECK (id = 1),
  content jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
