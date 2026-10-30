CREATE TABLE IF NOT EXISTS admin_credentials (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  totp_iv TEXT NOT NULL,
  totp_ciphertext TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
