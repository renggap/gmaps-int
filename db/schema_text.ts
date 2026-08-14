export const SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS search_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  location TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  result_count INTEGER NOT NULL DEFAULT 0,
  new_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS leads (
  place_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  address TEXT,
  lat REAL,
  lng REAL,
  rating REAL,
  review_count INTEGER,
  website TEXT,
  phone TEXT,
  public_email TEXT,
  source_job_id INTEGER REFERENCES search_jobs(id),
  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  fit_score INTEGER,
  priority TEXT NOT NULL DEFAULT 'WARM' CHECK (priority IN ('HOT','WARM','SKIP')),
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','CONTACTED','REPLIED','BOOKED')),
  last_contacted TEXT,
  next_action TEXT,
  notes TEXT,
  ai_summary TEXT,
  ai_score INTEGER,
  ai_priority TEXT CHECK (ai_priority IN ('HOT','WARM','SKIP')),
  ai_reason TEXT,
  ai_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_job ON leads(source_job_id);
`;
