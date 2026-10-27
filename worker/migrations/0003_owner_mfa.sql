ALTER TABLE admin_sessions ADD COLUMN auth_fingerprint TEXT;

CREATE TABLE IF NOT EXISTS admin_totp_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_counter INTEGER NOT NULL
);

INSERT OR IGNORE INTO admin_totp_state (id, last_counter) VALUES (1, -1);
