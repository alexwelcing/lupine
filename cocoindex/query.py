#!/usr/bin/env python3
"""
Semantic + keyword search over the cocoindex evidence index (./evidence.db).

Two modes:
  --semantic "<q>"   embed the query and return nearest-neighbor chunks
                     (needs sqlite-vec; falls back to keyword if unavailable)
  --keyword "<q>"    plain SQL LIKE over text (always works)

Both rank by relevance and join back the source kind/ref_id so results are
actionable. Designed to be called from the command line AND from the Hermes
`cocoindex` skill (`python query.py --semantic "..."`).

Examples:
    python query.py --semantic "which coordination strategies beat the baseline"
    python query.py --keyword "aluminium cohesive" --limit 5
    python query.py --semantic "hyper-ribbon error manifold" --kind hypothesis
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import pathlib

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

# Reuse the pipeline's embedder (real model with offline fallback) so query
# embeddings match index embeddings.
import main as pipeline  # noqa: E402


def _load_vec(conn: sqlite3.Connection) -> bool:
    """Try to load sqlite-vec. Returns False (→ keyword fallback) if absent."""
    try:
        import sqlite_vec  # type: ignore
        conn.enable_load_extension(True)
        sqlite_vec.load(conn)
        conn.enable_load_extension(False)
        return True
    except Exception:
        return False


def _table_exists(conn: sqlite3.Connection, table: str) -> bool:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ).fetchone()
    return row is not None


def semantic_search(conn: sqlite3.Connection, query: str, limit: int,
                    kind_filter: str | None) -> list[dict]:
    vec_ok = _load_vec(conn)
    if not vec_ok:
        print("[query] sqlite-vec unavailable; falling back to keyword search",
              file=sys.stderr)
        return keyword_search(conn, query, limit, kind_filter)
    if not _table_exists(conn, "evidence_chunks"):
        return []
    # Embed the query through the same path the indexer used (real model or
    # hash-vector fallback), so query/index vector spaces match.
    qvec = pipeline._fallback_vector(query) if pipeline._FALLBACK_ACTIVE \
        else np.asarray(_safe_embed(query), dtype=np.float32)
    blob = np.asarray(qvec, dtype=np.float32).tobytes()
    # vec0 virtual table created by cocoindex exposes a `distance` ordering
    # via MATCH. Fall back to a manual cosine if the virtual table is absent
    # (e.g. user built evidence.db before sqlite-vec target wiring).
    rows = _try_vec0_query(conn, blob, limit, kind_filter)
    if rows is None:
        rows = _manual_cosine(conn, blob, limit, kind_filter)
    return rows


def _safe_embed(text: str):
    """Async-safe embed: run pipeline._embed under a fresh event loop."""
    import asyncio
    try:
        return asyncio.run(pipeline._embed(text))
    except Exception as e:  # noqa: BLE001
        print(f"[query] embed failed ({e}); using fallback", file=sys.stderr)
        return pipeline._fallback_vector(text)


def _try_vec0_query(conn, blob: bytes, limit: int, kind_filter: str | None):
    """Use the vec0 virtual table if cocoindex created one. Returns None if
    the virtual table isn't present (caller falls back to manual cosine)."""
    has_vec0 = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'evidence_chunks_vec%'"
    ).fetchone()
    if not has_vec0:
        return None
    try:
        sql = (
            "SELECT e.id, e.source_file, e.kind, e.ref_id, e.text, "
            "e.chunk_start, e.chunk_end, v.distance "
            "FROM evidence_chunks_vec_row v "
            "JOIN evidence_chunks e ON e.rowid = v.rowid "
            "WHERE v.embedding MATCH ? AND k = ? "
            + ("AND e.kind = ? " if kind_filter else "")
            + "ORDER BY v.distance"
        )
        params: list = [blob, limit] + ([kind_filter] if kind_filter else [])
        cur = conn.execute(sql, params)
        return [_row(r, score=-float(r[7])) for r in cur.fetchall()]
    except sqlite3.OperationalError:
        return None


def _manual_cosine(conn, qblob: bytes, limit: int, kind_filter: str | None) -> list[dict]:
    """Brute-force cosine similarity over the embedding BLOB column. Slower but
    always correct; used when the vec0 virtual table isn't available."""
    q = np.frombuffer(qblob, dtype=np.float32)
    qn = np.linalg.norm(q) or 1.0
    sql = "SELECT id, source_file, kind, ref_id, text, chunk_start, chunk_end, embedding FROM evidence_chunks"
    if kind_filter:
        sql += " WHERE kind = ?"
    scored = []
    for r in conn.execute(sql, ([kind_filter] if kind_filter else [])).fetchall():
        v = np.frombuffer(r[7], dtype=np.float32)
        vn = np.linalg.norm(v) or 1.0
        sim = float(np.dot(q, v) / (qn * vn))
        scored.append(_row(r[:7], score=sim))
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]


def keyword_search(conn: sqlite3.Connection, query: str, limit: int,
                   kind_filter: str | None) -> list[dict]:
    if not _table_exists(conn, "evidence_chunks"):
        return []
    # Simple subsequence-ish match: each whitespace token as LIKE OR.
    terms = [t for t in query.lower().split() if len(t) >= 3]
    if not terms:
        return []
    clauses = " OR ".join(["LOWER(text) LIKE ?" for _ in terms])
    params = [f"%{t}%" for t in terms] + ([kind_filter] if kind_filter else [])
    sql = (
        "SELECT id, source_file, kind, ref_id, text, chunk_start, chunk_end FROM evidence_chunks "
        "WHERE (" + clauses + ") " + ("AND kind = ? " if kind_filter else "")
        + "ORDER BY LENGTH(text) ASC LIMIT ?"
    )
    params = [f"%{t}%" for t in terms] + ([kind_filter] if kind_filter else []) + [limit]
    return [_row(r) for r in conn.execute(sql, params).fetchall()]


def _row(r, score: float | None = None) -> dict:
    out = {
        "id": r[0], "source_file": r[1], "kind": r[2], "ref_id": r[3],
        "text": r[4], "chunk_start": r[5], "chunk_end": r[6],
    }
    if score is not None:
        out["score"] = round(score, 4)
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--semantic", metavar="Q", help="semantic nearest-neighbor search")
    g.add_argument("--keyword", metavar="Q", help="plain keyword (LIKE) search")
    ap.add_argument("--kind", default=None,
                    help="filter by kind: coordination_trace|hypothesis|claim|research_question")
    ap.add_argument("--limit", type=int, default=5)
    ap.add_argument("--json", action="store_true", help="emit JSON (for the Hermes skill)")
    ap.add_argument("--db", default=str(HERE / "evidence.db"))
    args = ap.parse_args(argv)

    db = pathlib.Path(args.db)
    if not db.exists():
        msg = (f"evidence index not found at {db}. "
               f"Run `python seed_data.py && cocoindex update main.py` first.")
        print(json.dumps({"error": msg}) if args.json else msg, file=sys.stderr)
        return 2

    conn = sqlite3.connect(str(db))
    try:
        if args.semantic:
            results = semantic_search(conn, args.semantic, args.limit, args.kind)
        else:
            results = keyword_search(conn, args.keyword, args.limit, args.kind)
    finally:
        conn.close()

    if args.json:
        print(json.dumps({"query": args.semantic or args.keyword,
                          "mode": "semantic" if args.semantic else "keyword",
                          "kind": args.kind, "count": len(results),
                          "results": results}, ensure_ascii=False, indent=2))
    else:
        if not results:
            print("(no matches)")
        for i, r in enumerate(results, 1):
            sc = r.get("score")
            head = f"[{i}] {r['kind']}/{r['ref_id']}"
            if sc is not None:
                head += f"  (score {sc:+.3f})" if sc < 0 else f"  (sim {sc:.3f})"
            print(head)
            print(f"    {r['text'][:280].replace(chr(10), ' ')}{'…' if len(r['text'])>280 else ''}")
            print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
