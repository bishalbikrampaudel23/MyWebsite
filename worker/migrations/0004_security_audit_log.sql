CREATE TABLE IF NOT EXISTS security_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'login_failed',
      'login_replay_rejected',
      'login_succeeded',
      'logout',
      'query_submitted',
      'query_marked_read',
      'query_replied'
    )
  ),
  resource_id INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS security_audit_log_created_at
  ON security_audit_log (created_at DESC);
