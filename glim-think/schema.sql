-- Core ledger tables for glim-think

CREATE TABLE IF NOT EXISTS records (
  record_id TEXT PRIMARY KEY,
  element TEXT,
  potential_id TEXT,
  potential_label TEXT,
  pair_style TEXT,
  property TEXT,
  reference REAL,
  predicted REAL,
  unit TEXT,
  provenance TEXT,
  agent_id TEXT,
  timestamp TEXT
);

CREATE TABLE IF NOT EXISTS claims (
  claim_id TEXT PRIMARY KEY,
  agent_id TEXT,
  claim_type TEXT,
  evidence_ids TEXT,
  confidence REAL,
  status TEXT DEFAULT 'Proposed',
  timestamp TEXT,
  description TEXT
);

-- Agent-specific state tables
CREATE TABLE IF NOT EXISTS manifold_runs (
  family TEXT,
  element TEXT,
  claim_id TEXT,
  pr REAL,
  timestamp TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (family, element)
);

CREATE TABLE IF NOT EXISTS causal_screens (
  grouping TEXT PRIMARY KEY,
  timestamp TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS theories (
  theory_id TEXT PRIMARY KEY,
  observation_claim_id TEXT,
  explanation TEXT,
  prediction TEXT,
  test_strategy TEXT,
  discriminative_property TEXT,
  timestamp TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS experiment_runs (
  run_id TEXT PRIMARY KEY,
  potential_label TEXT,
  element TEXT,
  status TEXT,
  records_count INTEGER,
  timestamp TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orchestrator_state (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pending_experiments (
  experiment_id TEXT PRIMARY KEY,
  run_id TEXT,
  element TEXT,
  potential_label TEXT,
  potential_id TEXT,
  pair_style TEXT,
  structure TEXT DEFAULT 'fcc',
  properties TEXT,
  discriminative_property TEXT,
  hypothesis_id TEXT,
  spec TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

-- Deployment observability: GitHub Actions report here
CREATE TABLE IF NOT EXISTS deployments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo TEXT NOT NULL,
  workflow TEXT NOT NULL,
  run_id TEXT NOT NULL,
  status TEXT NOT NULL,
  commit_sha TEXT,
  branch TEXT,
  service TEXT NOT NULL,
  run_url TEXT,
  started_at TEXT,
  completed_at TEXT DEFAULT (datetime('now')),
  logs TEXT
);
CREATE INDEX IF NOT EXISTS idx_deployments_service ON deployments(service);
CREATE INDEX IF NOT EXISTS idx_deployments_completed_at ON deployments(completed_at DESC);
