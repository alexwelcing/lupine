"""Research-persistence layer for lupine-dspy.

Tracks claims, evidence, and research runs for the autoresearch loop, plus the
ATLAS formal-provenance migration (ATLAS_Lean_Integration_Review.md §14.3).

The canonical claims/benchmarks store is the Rust ``lupine-distill`` SQLite DB
(``lupine-distill/src/db/schema.rs``); this Python layer mirrors its
conventions (a ``schema_version`` table, idempotent ``CREATE TABLE IF NOT
EXISTS``) for the dspy-side research-persistence tables and applies the formal
provenance columns on top.
"""

from __future__ import annotations

from .migrations import (  # noqa: F401
    FORMAL_PROVENANCE_VERSION,
    apply_formal_provenance_migration,
    column_names,
    open_db,
)

__all__ = [
    "FORMAL_PROVENANCE_VERSION",
    "apply_formal_provenance_migration",
    "column_names",
    "open_db",
]
