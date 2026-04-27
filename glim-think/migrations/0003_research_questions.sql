-- 0003_research_questions.sql
-- Lab-notebook style Q/A queue for ad-hoc research questions raised
-- during the Lupine Materials Science / IMMI peer-review prep work.
--
-- Distinct from formal peer-review critiques (unit 2's table): this is
-- the running list of "things we're curious about" that an agent or
-- human can answer with a markdown note (and optional R2 artifact).

CREATE TABLE IF NOT EXISTS research_questions (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  asked_by TEXT,
  status TEXT NOT NULL CHECK(status IN ('open','in_progress','answered')) DEFAULT 'open',
  answer_md TEXT,
  answer_artifact_key TEXT,
  target_hypothesis_id TEXT,
  created_at TEXT NOT NULL,
  answered_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_research_questions_status
  ON research_questions(status);

CREATE INDEX IF NOT EXISTS idx_research_questions_created_at
  ON research_questions(created_at DESC);
