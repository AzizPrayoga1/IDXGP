-- Migration 0002: Add salt, session token, rate limit tracking
ALTER TABLE users ADD COLUMN pin_salt TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN token TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN token_expires_at INTEGER DEFAULT NULL;

CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  ip TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  ts INTEGER NOT NULL,
  success INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_ts ON login_attempts(ip, ts);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_ts ON login_attempts(user_id, ts);
