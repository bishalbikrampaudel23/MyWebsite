CREATE TABLE IF NOT EXISTS visitor_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'read', 'replied')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS visitor_queries_created_at
  ON visitor_queries (created_at DESC);

CREATE TABLE IF NOT EXISTS query_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query_id INTEGER NOT NULL REFERENCES visitor_queries (id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS query_replies_query_id
  ON query_replies (query_id, created_at);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip_hash TEXT PRIMARY KEY,
  window_started INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
