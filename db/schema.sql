CREATE TABLE IF NOT EXISTS wedding_invitations (
  id text PRIMARY KEY,
  group_name text NOT NULL,
  code text NOT NULL UNIQUE CHECK (code = upper(code)),
  members jsonb NOT NULL CHECK (jsonb_typeof(members) = 'array'),
  attendance jsonb NOT NULL DEFAULT '[]',
  songs jsonb NOT NULL DEFAULT '[]',
  attendance_updated_at timestamptz,
  songs_updated_at timestamptz,
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS wedding_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  attendance_close timestamptz NOT NULL,
  songs_close timestamptz NOT NULL,
  catalog_updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wedding_rate_limits (
  client_key text PRIMARY KEY,
  count integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS wedding_sync_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  last_export_at timestamptz,
  last_ack_at timestamptz
);
INSERT INTO wedding_sync_state(singleton) VALUES (true) ON CONFLICT DO NOTHING;
ALTER TABLE wedding_sync_state ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
ALTER TABLE wedding_sync_state ADD COLUMN IF NOT EXISTS synced_version bigint NOT NULL DEFAULT -1;
ALTER TABLE wedding_sync_state ADD COLUMN IF NOT EXISTS lease_token text;
ALTER TABLE wedding_sync_state ADD COLUMN IF NOT EXISTS lease_until timestamptz;
CREATE OR REPLACE FUNCTION wedding_mark_dirty() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE wedding_sync_state SET version=version+1 WHERE singleton=true;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS wedding_invitation_dirty ON wedding_invitations;
CREATE TRIGGER wedding_invitation_dirty AFTER INSERT OR UPDATE OR DELETE ON wedding_invitations FOR EACH STATEMENT EXECUTE FUNCTION wedding_mark_dirty();
DROP TRIGGER IF EXISTS wedding_config_dirty ON wedding_config;
CREATE TRIGGER wedding_config_dirty AFTER INSERT OR UPDATE OR DELETE ON wedding_config FOR EACH STATEMENT EXECUTE FUNCTION wedding_mark_dirty();
