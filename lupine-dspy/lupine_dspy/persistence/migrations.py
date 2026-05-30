"""SQLite migration: ATLAS formal provenance for research persistence (§14.3).

Adds formal-proof-dependency tracking to the dspy research-persistence tables:

    | Table           | Added column            | Type | Description                          |
    |-----------------|-------------------------|------|--------------------------------------|
    | claims          | theorem_dependencies    | JSON | ATLAS/ODF theorems the claim needs   |
    | claims          | formal_status           | TEXT | proved/conjectured/refuted/unverified|
    | evidence        | proof_check_passed      | BOOL | did Lake build verify the proof?     |
    | research_runs   | atlas_revision          | TEXT | ATLAS version used during this run   |

Convention (mirrors ``lupine-distill/src/db/schema.rs``):
  - A ``schema_version`` table records applied migration versions.
  - All DDL is idempotent: ``CREATE TABLE IF NOT EXISTS`` + guarded
    ``ALTER TABLE ... ADD COLUMN`` (SQLite has no ``ADD COLUMN IF NOT EXISTS``,
    so we introspect ``PRAGMA table_info`` first).
  - The base tables (claims/evidence/research_runs) are created here if absent
    so the migration is self-contained for the dspy-side store. The canonical
    ``claims`` shape lives in the Rust engine; the columns created here are the
    subset the dspy persistence layer reads/writes.

SQLite stores BOOL as INTEGER (0/1); ``formal_status`` is a TEXT with a CHECK
constraint enforcing the four allowed values.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

# Bump when adding a new migration in this module.
FORMAL_PROVENANCE_VERSION = 1

# Allowed values for claims.formal_status (§14.3).
FORMAL_STATUS_VALUES = ("proved", "conjectured", "refuted", "unverified")

# Base tables (created only if missing). The canonical producer is the Rust
# lupine-distill schema; these mirror the columns the dspy layer needs.
_BASE_TABLES_DDL = """
CREATE TABLE IF NOT EXISTS schema_version (
    version    INTEGER NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS research_runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id      TEXT UNIQUE NOT NULL,
    started_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    finished_at TEXT,
    notes       TEXT
);

CREATE TABLE IF NOT EXISTS claims (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id    TEXT UNIQUE NOT NULL,
    run_id      TEXT REFERENCES research_runs(run_id),
    description TEXT NOT NULL,
    confidence  REAL NOT NULL DEFAULT 0.0,
    status      TEXT NOT NULL DEFAULT 'proposed',
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS evidence (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id TEXT UNIQUE NOT NULL,
    claim_id    TEXT REFERENCES claims(claim_id),
    summary     TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
"""

# Columns added by this migration: (table, column, column_ddl).
_FORMAL_PROVENANCE_COLUMNS: tuple[tuple[str, str, str], ...] = (
    ("claims", "theorem_dependencies", "theorem_dependencies TEXT NOT NULL DEFAULT '[]'"),
    (
        "claims",
        "formal_status",
        "formal_status TEXT NOT NULL DEFAULT 'unverified' "
        "CHECK (formal_status IN ('proved', 'conjectured', 'refuted', 'unverified'))",
    ),
    ("evidence", "proof_check_passed", "proof_check_passed INTEGER NOT NULL DEFAULT 0"),
    ("research_runs", "atlas_revision", "atlas_revision TEXT"),
)


def open_db(path: str | Path) -> sqlite3.Connection:
    """Open (or create) the research-persistence SQLite DB with sane pragmas.

    Use ``":memory:"`` for an ephemeral DB (tests). Foreign keys are enabled to
    match the Rust engine's behavior.
    """
    conn = sqlite3.connect(str(path))
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def column_names(conn: sqlite3.Connection, table: str) -> set[str]:
    """Return the set of column names on ``table`` (empty if table is absent)."""
    cur = conn.execute(f"PRAGMA table_info({table})")
    return {row[1] for row in cur.fetchall()}


def _current_version(conn: sqlite3.Connection) -> int:
    """Highest applied migration version, or 0 if none/absent."""
    try:
        cur = conn.execute("SELECT COALESCE(MAX(version), 0) FROM schema_version")
        row = cur.fetchone()
        return int(row[0]) if row and row[0] is not None else 0
    except sqlite3.OperationalError:
        return 0


def apply_formal_provenance_migration(conn: sqlite3.Connection) -> bool:
    """Apply the §14.3 formal-provenance migration. Idempotent.

    Ensures the base tables exist, then adds each formal-provenance column that
    is not already present. Records ``FORMAL_PROVENANCE_VERSION`` in
    ``schema_version``.

    Returns:
        ``True`` if the migration did work this call; ``False`` if it was
        already applied (no-op).
    """
    conn.executescript(_BASE_TABLES_DDL)

    if _current_version(conn) >= FORMAL_PROVENANCE_VERSION:
        return False

    for table, column, column_ddl in _FORMAL_PROVENANCE_COLUMNS:
        existing = column_names(conn, table)
        if column not in existing:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column_ddl}")

    conn.execute(
        "INSERT INTO schema_version (version) VALUES (?)",
        (FORMAL_PROVENANCE_VERSION,),
    )
    conn.commit()
    return True


__all__ = [
    "FORMAL_PROVENANCE_VERSION",
    "FORMAL_STATUS_VALUES",
    "open_db",
    "column_names",
    "apply_formal_provenance_migration",
]
