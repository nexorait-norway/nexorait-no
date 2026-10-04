CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY,
  status TEXT NOT NULL,
  title TEXT,
  payload_json TEXT,
  run_at TEXT,
  error TEXT,
  created_at TEXT,
  finished_at TEXT
);
