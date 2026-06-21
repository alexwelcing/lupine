"""
Tests for the cocoindex evidence pipeline.

These avoid the heavy cocoindex engine (which needs COCOINDEX_DB + the CLI)
and instead unit-test the pure-Python pieces: the record format produced by
seed_data/export_evidence, and the deterministic fallback embedder. The full
engine run is exercised manually via `cocoindex update main.py` (see README).

Run: python -m pytest test_pipeline.py -q   (from the cocoindex/ dir, with .venv)
"""
import json
import pathlib
import sys

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

# Import the pure helpers from main.py without triggering cocoindex App
# registration side-effects: main.py builds the App at import time, which is
# fine because App construction is lazy (no engine start until update()).
import main as pipeline  # noqa: E402


def test_fallback_vector_is_deterministic_and_dim():
    a = pipeline._fallback_vector("hyper-ribbon error manifold")
    b = pipeline._fallback_vector("hyper-ribbon error manifold")
    c = pipeline._fallback_vector("completely different content")
    assert a.shape == (pipeline.EMBED_DIM,)
    assert np.array_equal(a, b), "same text must produce the same vector"
    assert not np.allclose(a, c, atol=1e-6), "different text should differ"
    assert abs(float(np.linalg.norm(a)) - 1.0) < 1e-5, "fallback vector must be unit-norm"


def test_seed_records_are_valid_jsonl_with_text():
    """Every seeded record is parseable JSONL with a non-empty `text` field —
    the contract process_file relies on."""
    data = HERE / "data"
    assert data.exists(), "run `python seed_data.py` first to create ./data"
    files = list(data.glob("*.jsonl"))
    assert len(files) >= 3, f"expected >=3 seed jsonl files, got {len(files)}"
    total = 0
    for f in files:
        with f.open(encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                rec = json.loads(line)
                assert "text" in rec and rec["text"].strip(), f"{f.name}: missing text"
                assert "kind" in rec, f"{f.name}: missing kind"
                total += 1
    assert total >= 5, f"expected >=5 total seeded records, got {total}"


def test_evidence_chunk_dataclass_shape():
    """EvidenceChunk must carry the fields the index query layer relies on."""
    from dataclasses import fields
    names = {f.name for f in fields(pipeline.EvidenceChunk)}
    assert {"id", "source_file", "kind", "ref_id", "text", "embedding"}.issubset(names)


def test_export_evidence_arg_parser_does_not_require_d1():
    """export_evidence.py with no --from-d1 should be a no-op (prints a hint),
    so importing/calling it in CI never hits wrangler."""
    import export_evidence
    rc = export_evidence.main([])  # explicit empty argv — never reads pytest's args
    assert rc == 0


def test_query_keyword_search_returns_results():
    """query.py --keyword is pure SQL and works on the seeded evidence.db
    without the embedder. Validates the query tool end-to-end."""
    import sqlite3
    import query
    db = HERE / "evidence.db"
    if not db.exists():
        import pytest
        pytest.skip("evidence.db not built — run `cocoindex update main.py`")
    conn = sqlite3.connect(str(db))
    try:
        # Seeded coordination_traces.jsonl contains "Fan-out/Merge".
        res = query.keyword_search(conn, "fan out merge", limit=5, kind_filter=None)
        assert len(res) >= 1
        assert any("fan" in r["text"].lower() for r in res)
        # kind filter narrows correctly
        only_hyp = query.keyword_search(conn, "manifold", limit=10, kind_filter="hypothesis")
        assert all(r["kind"] == "hypothesis" for r in only_hyp)
    finally:
        conn.close()


def test_query_missing_db_returns_clean_error():
    """query.py against a nonexistent db exits 2, not a traceback."""
    import query
    rc = query.main(["--keyword", "x", "--db", str(HERE / "nonexistent_test.db")])
    assert rc == 2
