-- ATLAS-Lean formal foundations: theorem inventory + per-facet reference state.
--
-- Bridges the ATLAS-Lean formal layer (Lean/Mathlib proofs) into the glim-think
-- multi-agent control plane. Per ATLAS_Lean_Integration_Review §8.4: each facet
-- (specialist agent) imports/verifies/extends a bounded set of theorems and
-- carries only REFERENCES (name + module + revision), never the proofs.
--
-- `atlas_theorems` lives in the shared D1 ledger (env.LEDGER) so the whole fleet
-- can query the inventory by facet; agents load their facet's rows into bounded
-- DO-local state via GlimThinkAgent.loadAtlasContext().

CREATE TABLE IF NOT EXISTS atlas_theorems (
  id INTEGER PRIMARY KEY,
  facet TEXT NOT NULL,
  theorem_name TEXT NOT NULL,
  module TEXT NOT NULL,
  revision TEXT NOT NULL,
  status TEXT CHECK(status IN ('imported','verified','extended','failed')),
  used_in_hypotheses INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Facet is the dominant query axis (each agent loads only its own theorems).
CREATE INDEX IF NOT EXISTS idx_atlas_theorems_facet ON atlas_theorems(facet);
-- Status rollups feed the theorem_inventory_summary telemetry config.
CREATE INDEX IF NOT EXISTS idx_atlas_theorems_status ON atlas_theorems(status);
-- A theorem is uniquely identified by (facet, name, module, revision); guard
-- against duplicate imports of the same revision into the same facet.
CREATE UNIQUE INDEX IF NOT EXISTS idx_atlas_theorems_identity
  ON atlas_theorems(facet, theorem_name, module, revision);

-- Per-facet ATLAS reference state (§8.4). One row per facet records which
-- ATLAS + Mathlib revision that facet is pinned to and a JSON inventory summary
-- of the theorems it depends on. theorem_inventory is a JSON document
-- ({ theorems: [{ name, module, revision, status }], total, by_status })
-- kept small (references only — no proof bodies) so DO state stays bounded.
CREATE TABLE IF NOT EXISTS atlas_facet_state (
  facet TEXT PRIMARY KEY,
  atlas_revision TEXT,
  mathlib_revision TEXT,
  theorem_inventory TEXT,            -- JSON: bounded reference inventory
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
