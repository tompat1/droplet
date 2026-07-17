PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS site_content (
  content_key TEXT PRIMARY KEY,
  content_value TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);
