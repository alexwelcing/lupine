-- 0002_critiques.sql
-- Persistence for peer-review critiques (gaps surfaced by external reviews,
-- e.g. swarm_preprint_review/critique11.md). Each row is a question that
-- the agent fleet should respond to with markdown evidence stored in R2.

CREATE TABLE IF NOT EXISTS critiques (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  question TEXT NOT NULL,
  target_hypothesis_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending','in_progress','completed')) DEFAULT 'pending',
  response_md TEXT,
  response_artifact_key TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_critiques_status ON critiques(status);
CREATE INDEX IF NOT EXISTS idx_critiques_source ON critiques(source);
CREATE INDEX IF NOT EXISTS idx_critiques_target ON critiques(target_hypothesis_id);

-- Seed: 4 gaps extracted from swarm_preprint_review/critique11.md.
-- Each maps to one of the four active hypotheses (h1..h4).
INSERT OR IGNORE INTO critiques
  (id, source, question, target_hypothesis_id, status, created_at)
VALUES
  (
    'c11_hyperribbon_classifier',
    'critique11',
    'Strengthen hyper-ribbon discriminative tests against null Gaussian benchmarks at small n (3-12)',
    'h1_hyperribbon',
    'pending',
    datetime('now')
  ),
  (
    'c11_mlip_evidence',
    'critique11',
    'Provide direct MLIP error-manifold evidence (CHGNet, MACE-MP, M3GNet) on elastic constants',
    'h4_mlip_invariance',
    'pending',
    datetime('now')
  ),
  (
    'c11_pearl_identification',
    'critique11',
    'Formal Pearl identification proof (back-door/front-door) for element confounding in materials benchmarking',
    'h2_bccfcc',
    'pending',
    datetime('now')
  ),
  (
    'c11_simpson_signreversal',
    'critique11',
    'True sign-reversal Simpson examples in physical sciences (not just magnitude attenuation)',
    'h3_ecological',
    'pending',
    datetime('now')
  );
