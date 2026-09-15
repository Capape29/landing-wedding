CREATE TABLE IF NOT EXISTS wedding_youtube_cache (
  query text PRIMARY KEY, results jsonb NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS wedding_youtube_metadata (
  video_id text PRIMARY KEY, title text NOT NULL, channel text NOT NULL, fetched_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wedding_youtube_daily (
  day date PRIMARY KEY, count integer NOT NULL
);
