-- Migration 0001: research hypotheses persistence
-- Tracks the active research hypotheses that the agent fleet tests.
-- Status lifecycle: proposed -> testing -> (confirmed | refuted)

CREATE TABLE IF NOT EXISTS hypotheses (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  status        TEXT NOT NULL CHECK(status IN ('proposed','testing','confirmed','refuted')),
  confidence    REAL,
  evidence_ids  TEXT,
  agent_id      TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hypotheses_status     ON hypotheses(status);
CREATE INDEX IF NOT EXISTS idx_hypotheses_created_at ON hypotheses(created_at);

-- Seed the four hypotheses currently hardcoded in /health.
-- Use INSERT OR IGNORE so re-running the migration is a no-op.
INSERT OR IGNORE INTO hypotheses (id, title, status, confidence, evidence_ids, agent_id, created_at, updated_at) VALUES
  ('h1_hyperribbon', 'Hyper-ribbon universality across 559 classical potentials',     'testing', NULL, NULL, NULL, datetime('now'), datetime('now')),
  ('h2_bccfcc',      'BCC/FCC error correlation dichotomy (causal shield)',           'testing', NULL, NULL, NULL, datetime('now'), datetime('now')),
  ('h4_mlip_invariance', 'MLIP manifold equivalence (MACE-MP, CHGNet, M3GNet)',       'testing', NULL, NULL, NULL, datetime('now'), datetime('now')),
  ('h3_ecological',  'Ecological fallacy in one-number benchmarking',                 'testing', NULL, NULL, NULL, datetime('now'), datetime('now'));
