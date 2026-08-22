CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,
  challenge_date TEXT NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 100),
  deaths INTEGER NOT NULL CHECK (deaths BETWEEN 0 AND 9999),
  time_ms INTEGER NOT NULL CHECK (time_ms BETWEEN 500 AND 3600000),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (challenge_date, player_id)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_scores_daily_rank
  ON scores (challenge_date, deaths, time_ms, created_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  key_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (key_hash, window_start)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_rate_limits_window
  ON rate_limits (window_start);
