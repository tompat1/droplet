PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS canvas_assets (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  asset_hash TEXT NOT NULL,
  kind TEXT NOT NULL,
  mime_type TEXT,
  byte_length INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE,
  UNIQUE (canvas_id, asset_hash)
);

CREATE INDEX IF NOT EXISTS idx_canvas_assets_canvas_id ON canvas_assets(canvas_id);

CREATE TABLE IF NOT EXISTS canvas_asset_chunks (
  asset_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (asset_id, chunk_index),
  FOREIGN KEY (asset_id) REFERENCES canvas_assets(id) ON DELETE CASCADE
);
