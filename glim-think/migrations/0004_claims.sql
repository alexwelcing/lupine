-- 0004_claims.sql
-- Bring the existing `claims` table up to parity with lupine-distill's
-- claims schema so the worker can be the canonical home for adjudicated
-- research verdicts (CrossStyleAlignment, DimensionalityRanking,
-- ManifoldEvolution, HyperRibbonConfirmed, ...).
--
-- The bootstrap `schema.sql` created `claims` with columns:
--   claim_id, agent_id, claim_type, evidence_ids, confidence, status,
--   timestamp, description
--
-- lupine-distill writes via columns:
--   claim_id, agent_id, claim_type, claim_data, evidence_ids, confidence,
--   status, description, created_at
--
-- This migration adds the two missing columns (claim_data, created_at),
-- backfills created_at from the existing `timestamp`, and adds indexes.
-- Distill is the producer (write side); the worker is the consumer (read
-- side, via /claims, /lab dashboard, Theorist, Critique-drain cron).

ALTER TABLE claims ADD COLUMN claim_data TEXT NOT NULL DEFAULT '{}';
ALTER TABLE claims ADD COLUMN created_at TEXT;

UPDATE claims SET created_at = COALESCE(timestamp, strftime('%Y-%m-%dT%H:%M:%SZ','now')) WHERE created_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_claims_status     ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_type       ON claims(claim_type);
CREATE INDEX IF NOT EXISTS idx_claims_agent      ON claims(agent_id);
CREATE INDEX IF NOT EXISTS idx_claims_created_at ON claims(created_at DESC);
