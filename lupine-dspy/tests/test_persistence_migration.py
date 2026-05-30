"""Tests for the ATLAS formal-provenance migration (§14.3)."""

from lupine_dspy.persistence.migrations import (
    FORMAL_PROVENANCE_VERSION,
    apply_formal_provenance_migration,
    column_names,
    open_db,
)


def _migrated_conn():
    conn = open_db(":memory:")
    applied = apply_formal_provenance_migration(conn)
    return conn, applied


class TestFormalProvenanceMigration:
    def test_adds_all_columns(self):
        conn, applied = _migrated_conn()
        assert applied is True
        assert "theorem_dependencies" in column_names(conn, "claims")
        assert "formal_status" in column_names(conn, "claims")
        assert "proof_check_passed" in column_names(conn, "evidence")
        assert "atlas_revision" in column_names(conn, "research_runs")

    def test_records_schema_version(self):
        conn, _ = _migrated_conn()
        row = conn.execute("SELECT MAX(version) FROM schema_version").fetchone()
        assert row[0] == FORMAL_PROVENANCE_VERSION

    def test_idempotent(self):
        conn, first = _migrated_conn()
        assert first is True
        # Second application is a no-op and must not raise.
        second = apply_formal_provenance_migration(conn)
        assert second is False
        # Columns still present exactly once (no duplicate-column error).
        assert "theorem_dependencies" in column_names(conn, "claims")

    def test_formal_status_default_and_check(self):
        conn, _ = _migrated_conn()
        conn.execute(
            "INSERT INTO research_runs (run_id) VALUES ('r1')"
        )
        conn.execute(
            "INSERT INTO claims (claim_id, run_id, description) VALUES ('c1', 'r1', 'demo')"
        )
        conn.commit()
        row = conn.execute(
            "SELECT formal_status, theorem_dependencies FROM claims WHERE claim_id='c1'"
        ).fetchone()
        assert row[0] == "unverified"
        assert row[1] == "[]"

    def test_formal_status_check_rejects_bad_value(self):
        conn, _ = _migrated_conn()
        conn.execute("INSERT INTO research_runs (run_id) VALUES ('r2')")
        conn.commit()
        raised = False
        try:
            conn.execute(
                "INSERT INTO claims (claim_id, run_id, description, formal_status) "
                "VALUES ('c2', 'r2', 'demo', 'bogus')"
            )
            conn.commit()
        except Exception:
            raised = True
        assert raised, "CHECK constraint should reject an invalid formal_status"

    def test_proof_check_passed_is_boolean_int(self):
        conn, _ = _migrated_conn()
        conn.execute("INSERT INTO research_runs (run_id) VALUES ('r3')")
        conn.execute("INSERT INTO claims (claim_id, run_id, description) VALUES ('c3','r3','d')")
        conn.execute(
            "INSERT INTO evidence (evidence_id, claim_id, summary, proof_check_passed) "
            "VALUES ('e1', 'c3', 'lake build green', 1)"
        )
        conn.commit()
        row = conn.execute(
            "SELECT proof_check_passed FROM evidence WHERE evidence_id='e1'"
        ).fetchone()
        assert row[0] == 1

    def test_atlas_revision_on_research_runs(self):
        conn, _ = _migrated_conn()
        conn.execute(
            "INSERT INTO research_runs (run_id, atlas_revision) VALUES ('r4', 'atlas@deadbeef')"
        )
        conn.commit()
        row = conn.execute(
            "SELECT atlas_revision FROM research_runs WHERE run_id='r4'"
        ).fetchone()
        assert row[0] == "atlas@deadbeef"
