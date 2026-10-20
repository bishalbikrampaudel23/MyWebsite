CREATE TABLE IF NOT EXISTS query_submission_limits (
  ip_hash TEXT PRIMARY KEY,
  window_started INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS query_submission_limits_window_started
  ON query_submission_limits (window_started);
