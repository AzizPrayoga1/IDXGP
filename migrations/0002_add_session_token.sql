-- Migration 0002: Session token + PIN salt + login attempts
ALTER TABLE users ADD COLUMN token TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN token_expires_at INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN pin_salt TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS login_attempts (
  user_id TEXT,
  ip TEXT DEFAULT '',
  endpoint TEXT NOT NULL DEFAULT '',
  ts INTEGER NOT NULL,
  success INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON login_attempts(user_id, endpoint, ts);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, endpoint, ts);
