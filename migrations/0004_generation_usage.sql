CREATE TABLE IF NOT EXISTS generation_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_label TEXT,
  pipeline TEXT NOT NULL,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'estimated',
  prompt_chars INTEGER NOT NULL DEFAULT 0,
  reference_count INTEGER NOT NULL DEFAULT 0,
  output_count INTEGER NOT NULL DEFAULT 1,
  output_size TEXT,
  output_quality TEXT,
  estimated_usd REAL NOT NULL DEFAULT 0,
  estimate_basis TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_generation_usage_user_id ON generation_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_usage_created_at ON generation_usage(created_at);
