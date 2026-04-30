//! Database schema — creates and migrates the SQLite tables.

use anyhow::Result;
use rusqlite::Connection;

/// Current schema version. Bump this when adding migrations.
/// v1 — initial tables (benchmarks, hypotheses, experiments, literature, manifolds, claims).
/// v2 — `pc1_alignments` (per-element-pair PC1 cosine similarity cache).
/// v3 — `null_models` (permutation/bootstrap p-values + CIs for every claim).
const SCHEMA_VERSION: u32 = 3;

/// Initialize the database with all tables.
pub fn initialize(conn: &Connection) -> Result<()> {
    // Check current version
    conn.execute_batch("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);")?;
    let current: u32 = conn
        .query_row("SELECT COALESCE(MAX(version), 0) FROM schema_version", [], |r| r.get(0))
        .unwrap_or(0);

    if current >= SCHEMA_VERSION {
        return Ok(());
    }

    conn.execute_batch(
        "
        -- Core benchmark data
        CREATE TABLE IF NOT EXISTS benchmarks (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            record_id       TEXT UNIQUE NOT NULL,
            potential_id     TEXT NOT NULL,
            potential_label  TEXT NOT NULL,
            pair_style       TEXT NOT NULL,
            element          TEXT NOT NULL,
            property         TEXT NOT NULL,
            reference_value  REAL NOT NULL,
            predicted_value  REAL NOT NULL,
            unit             TEXT NOT NULL,
            error_pct        REAL GENERATED ALWAYS AS (
                CASE WHEN reference_value != 0.0
                     THEN (predicted_value - reference_value) / reference_value * 100.0
                     ELSE 0.0
                END
            ) STORED,
            source           TEXT NOT NULL DEFAULT 'csv_import',
            agent_id         TEXT NOT NULL DEFAULT 'seed',
            created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );

        CREATE INDEX IF NOT EXISTS idx_bench_element ON benchmarks(element);
        CREATE INDEX IF NOT EXISTS idx_bench_pair ON benchmarks(pair_style);
        CREATE INDEX IF NOT EXISTS idx_bench_potential ON benchmarks(potential_id);
        CREATE INDEX IF NOT EXISTS idx_bench_property ON benchmarks(property);

        -- Hypothesis registry
        CREATE TABLE IF NOT EXISTS hypotheses (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            hypothesis_id   TEXT UNIQUE NOT NULL,
            class           TEXT NOT NULL,
            title           TEXT NOT NULL,
            description     TEXT NOT NULL,
            testable_prediction TEXT NOT NULL,
            status          TEXT NOT NULL DEFAULT 'proposed',
            confidence      REAL NOT NULL DEFAULT 0.0,
            evidence_for    INTEGER NOT NULL DEFAULT 0,
            evidence_against INTEGER NOT NULL DEFAULT 0,
            created_by      TEXT NOT NULL DEFAULT 'dspy',
            created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );

        -- Experiments designed to test hypotheses
        CREATE TABLE IF NOT EXISTS experiments (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            experiment_id   TEXT UNIQUE NOT NULL,
            hypothesis_id   TEXT REFERENCES hypotheses(hypothesis_id),
            element         TEXT NOT NULL,
            pair_style      TEXT,
            discriminative_property TEXT NOT NULL,
            design_rationale TEXT NOT NULL,
            status          TEXT NOT NULL DEFAULT 'pending',
            result_summary  TEXT,
            verdict         TEXT,
            created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            completed_at    TEXT
        );

        -- Literature entries for intelligence gathering
        CREATE TABLE IF NOT EXISTS literature (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            doi             TEXT UNIQUE,
            arxiv_id        TEXT,
            title           TEXT NOT NULL,
            authors         TEXT,
            year            INTEGER,
            journal         TEXT,
            abstract_text   TEXT,
            elements        TEXT,
            pair_styles     TEXT,
            extracted_values TEXT,
            relevance_score REAL DEFAULT 0.0,
            reviewed        INTEGER NOT NULL DEFAULT 0,
            notes           TEXT,
            fetched_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );

        CREATE INDEX IF NOT EXISTS idx_lit_reviewed ON literature(reviewed);
        CREATE INDEX IF NOT EXISTS idx_lit_elements ON literature(elements);

        -- Cached manifold analysis results
        CREATE TABLE IF NOT EXISTS manifolds (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            grouping_key    TEXT NOT NULL,
            element         TEXT,
            pair_style      TEXT,
            n_records       INTEGER NOT NULL,
            n_potentials    INTEGER NOT NULL,
            eigenvalues     TEXT NOT NULL,
            eigenvectors    TEXT NOT NULL,
            participation_ratio REAL NOT NULL,
            effective_dim   INTEGER NOT NULL,
            explained_variance TEXT NOT NULL,
            computed_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            UNIQUE(grouping_key)
        );

        -- PC1 alignment cache — Hypothesis 3.2 detail rows.
        -- Each row records the cosine similarity between PC1 vectors of
        -- two elements within the same pair_style. UNIQUE on the canonical
        -- ordering enforced by the test_transfer iteration (a < b alphabetic).
        CREATE TABLE IF NOT EXISTS pc1_alignments (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            pair_style      TEXT NOT NULL,
            element_a       TEXT NOT NULL,
            element_b       TEXT NOT NULL,
            cosine_similarity REAL NOT NULL,
            pc1_a           TEXT NOT NULL,
            pc1_b           TEXT NOT NULL,
            n_potentials_a  INTEGER NOT NULL,
            n_potentials_b  INTEGER NOT NULL,
            computed_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            UNIQUE(pair_style, element_a, element_b)
        );

        CREATE INDEX IF NOT EXISTS idx_pc1_pairstyle ON pc1_alignments(pair_style);

        -- Null-model significance results — one row per (test, grouping) pair.
        -- The `null_distribution` column stores a JSON array of permutation /
        -- bootstrap statistics so downstream tooling can plot histograms.
        CREATE TABLE IF NOT EXISTS null_models (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            test_name       TEXT NOT NULL,
            grouping_key    TEXT NOT NULL,
            method          TEXT NOT NULL,
            observed        REAL NOT NULL,
            null_mean       REAL NOT NULL,
            null_std        REAL NOT NULL,
            null_ci_low     REAL NOT NULL,
            null_ci_high    REAL NOT NULL,
            p_value         REAL NOT NULL,
            n_iterations    INTEGER NOT NULL,
            null_distribution TEXT NOT NULL DEFAULT '[]',
            computed_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            UNIQUE(test_name, grouping_key, method)
        );

        CREATE INDEX IF NOT EXISTS idx_null_test ON null_models(test_name);

        -- Agent claims (migrated from JSONL ledger)
        CREATE TABLE IF NOT EXISTS claims (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            claim_id        TEXT UNIQUE NOT NULL,
            agent_id        TEXT NOT NULL,
            claim_type      TEXT NOT NULL,
            claim_data      TEXT NOT NULL,
            evidence_ids    TEXT NOT NULL DEFAULT '[]',
            confidence      REAL NOT NULL DEFAULT 0.0,
            status          TEXT NOT NULL DEFAULT 'proposed',
            description     TEXT NOT NULL,
            created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );

        "
    )?;

    // Version tracking — separate parameterized insert (execute_batch does not bind params).
    conn.execute("INSERT OR REPLACE INTO schema_version (version) VALUES (?1)", [SCHEMA_VERSION])?;

    Ok(())
}

/// Open (or create) the database at the given path.
pub fn open(path: &str) -> Result<Connection> {
    let conn = Connection::open(path)?;

    // Performance pragmas for research workload
    conn.execute_batch(
        "
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA foreign_keys = ON;
        PRAGMA cache_size = -64000;
        "
    )?;

    initialize(&conn)?;
    Ok(conn)
}

/// Open an in-memory database (for tests).
#[allow(dead_code)]
pub fn open_memory() -> Result<Connection> {
    let conn = Connection::open_in_memory()?;
    initialize(&conn)?;
    Ok(conn)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schema_creation() {
        let conn = open_memory().unwrap();
        // Verify tables exist
        let count: u32 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('benchmarks', 'hypotheses', 'experiments', 'literature', 'manifolds', 'claims', 'pc1_alignments', 'null_models')",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 8, "Expected 8 tables");
    }

    #[test]
    fn test_schema_idempotent() {
        let conn = open_memory().unwrap();
        // Running initialize twice should not error
        initialize(&conn).unwrap();
        initialize(&conn).unwrap();
    }
}
