-- Migration 0006: research_hits
-- A "hit" is a structured, actionable finding surfaced during M2.7 reasoning:
-- a missing experiment, a contradiction between insights, an independent
-- corroboration of a foundation claim, or a surprising result. The point is
-- to turn narratives into a triagable list ("what could we DO about this?").
-- Hits are extracted from the M2.7 narrative + dedicated HITLIST: block,
-- deduped against recent identical hits, and aged via status transitions.

CREATE TABLE IF NOT EXISTS research_hits (
  id TEXT PRIMARY KEY,
  hypothesis_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('missing_experiment','contradiction','reinforcement','surprise')),
  summary TEXT NOT NULL,
  proposed_action TEXT,
  source_insight_ids TEXT,
  source_claim_id TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','pursuing','resolved','dismissed')),
  dedup_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_hits_status_kind ON research_hits(status, kind);
CREATE INDEX IF NOT EXISTS idx_hits_hypothesis ON research_hits(hypothesis_id);
CREATE INDEX IF NOT EXISTS idx_hits_dedup ON research_hits(dedup_key);
CREATE INDEX IF NOT EXISTS idx_hits_created_at ON research_hits(created_at DESC);
