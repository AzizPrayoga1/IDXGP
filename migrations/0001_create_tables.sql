-- Migration 0001: Users, groups, and group_tickers tables
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  pin_hash TEXT NOT NULL DEFAULT '',
  pin_salt TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_preset INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_groups_user_id ON groups(user_id);

CREATE TABLE IF NOT EXISTS group_tickers (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  ticker TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_group_tickers_group_id ON group_tickers(group_id);
CREATE INDEX IF NOT EXISTS idx_group_tickers_ticker ON group_tickers(ticker);
