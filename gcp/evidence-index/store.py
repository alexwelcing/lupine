"""
Storage layer for the evidence-index service.

Two backends behind one interface:
  - PostgresStore (production): Cloud SQL Postgres + pgvector, concurrent-safe,
    ivfflat ANN index. Used when EVIDENCE_DB_URL is a postgres:// URL.
  - SqliteStore (dev/test): local SQLite, brute-force cosine. Used when
    EVIDENCE_DB_URL is a file path or unset. No pgvector dependency.

Same schema concept either way: evidence_chunks(id, source, kind, ref_id,
text, embedding, metadata, created_at). The embedding column is vector(384)
in Postgres, BLOB in SQLite — both 384-dim float32 underneath.
"""
from __future__ import annotations

import json
import sqlite3
import time
from dataclasses import dataclass, field
from typing import Any, Protocol

import numpy as np

EMBED_DIM = 384


@dataclass
class EvidenceRecord:
    id: str
    source: str          # "coordination_trace" | "hypothesis" | "claim" | ...
    kind: str            # same as source, kept for compat with cocoindex schema
    ref_id: str          # trace_id / hypothesis id / claim id
    text: str
    embedding: list[float]
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class SearchHit:
    id: str
    kind: str
    ref_id: str
    text: str
    score: float
    metadata: dict[str, Any]


class EvidenceStore(Protocol):
    async def ingest(self, rec: EvidenceRecord) -> None: ...
    async def search_semantic(self, query_vec: list[float], limit: int,
                              kind_filter: str | None) -> list[SearchHit]: ...
    async def search_keyword(self, terms: list[str], limit: int,
                             kind_filter: str | None) -> list[SearchHit]: ...
    async def count(self) -> int: ...


# ─── SQLite (dev / test / local) ─────────────────────────────────────────────

class SqliteStore:
    def __init__(self, db_path: str) -> None:
        self._path = db_path
        self._conn = sqlite3.connect(db_path)
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS evidence_chunks (
                id TEXT PRIMARY KEY,
                source TEXT NOT NULL,
                kind TEXT NOT NULL,
                ref_id TEXT NOT NULL,
                text TEXT NOT NULL,
                embedding BLOB,
                metadata TEXT DEFAULT '{}',
                created_at REAL DEFAULT (unixepoch())
            )
        """)
        self._conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_evidence_kind ON evidence_chunks(kind)")
        self._conn.commit()

    async def ingest(self, rec: EvidenceRecord) -> None:
        blob = np.asarray(rec.embedding, dtype=np.float32).tobytes()
        self._conn.execute(
            "INSERT OR REPLACE INTO evidence_chunks "
            "(id, source, kind, ref_id, text, embedding, metadata) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (rec.id, rec.source, rec.kind, rec.ref_id, rec.text, blob,
             json.dumps(rec.metadata)),
        )
        self._conn.commit()

    async def search_semantic(self, query_vec: list[float], limit: int,
                              kind_filter: str | None) -> list[SearchHit]:
        q = np.asarray(query_vec, dtype=np.float32)
        qn = np.linalg.norm(q) or 1.0
        sql = "SELECT id, kind, ref_id, text, metadata, embedding FROM evidence_chunks"
        if kind_filter:
            sql += " WHERE kind = ?"
        rows = self._conn.execute(
            sql, ([kind_filter] if kind_filter else [])
        ).fetchall()
        scored: list[tuple[float, SearchHit]] = []
        for rid, kind, ref_id, text, meta, blob in rows:
            v = np.frombuffer(blob, dtype=np.float32)
            vn = np.linalg.norm(v) or 1.0
            sim = float(np.dot(q, v) / (qn * vn))
            scored.append((sim, SearchHit(
                id=rid, kind=kind, ref_id=ref_id, text=text, score=sim,
                metadata=json.loads(meta) if meta else {},
            )))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [h for _, h in scored[:limit]]

    async def search_keyword(self, terms: list[str], limit: int,
                             kind_filter: str | None) -> list[SearchHit]:
        if not terms:
            return []
        clauses = " OR ".join(["LOWER(text) LIKE ?" for _ in terms])
        params = [f"%{t.lower()}%" for t in terms]
        sql = f"SELECT id, kind, ref_id, text, metadata FROM evidence_chunks WHERE ({clauses})"
        if kind_filter:
            sql += " AND kind = ?"
            params.append(kind_filter)
        sql += " ORDER BY LENGTH(text) ASC LIMIT ?"
        params.append(limit)
        rows = self._conn.execute(sql, params).fetchall()
        return [SearchHit(
            id=r[0], kind=r[1], ref_id=r[2], text=r[3], score=0.0,
            metadata=json.loads(r[4]) if r[4] else {},
        ) for r in rows]

    async def count(self) -> int:
        return self._conn.execute("SELECT COUNT(*) FROM evidence_chunks").fetchone()[0]


# ─── Postgres + pgvector (production) ────────────────────────────────────────

# Imported lazily so the sqlite path (tests) doesn't require asyncpg/pgvector.

class PostgresStore:
    def __init__(self, pool: Any) -> None:
        self._pool = pool

    @classmethod
    async def create(cls, database_url: str) -> "PostgresStore":
        import asyncpg
        # asyncpg's DSN parser doesn't handle ?host=/cloudsql/... reliably.
        # Parse it ourselves and pass host as a kwarg.
        import urllib.parse
        parsed = urllib.parse.urlparse(database_url)
        query = urllib.parse.parse_qs(parsed.query)
        connect_kwargs: dict[str, Any] = {}
        if "host" in query:
            connect_kwargs["host"] = query["host"][0]
            # Rebuild a clean DSN without the host query param.
            clean_url = database_url.split("?")[0]
        else:
            clean_url = database_url
        # Retry — the Cloud SQL socket may not be ready on the very first
        # boot of a cold Cloud Run instance.
        pool = None
        for attempt in range(5):
            try:
                pool = await asyncpg.create_pool(
                    clean_url, min_size=1, max_size=8, **connect_kwargs,
                )
                break
            except (ConnectionRefusedError, OSError) as e:
                if attempt == 4:
                    raise
                import asyncio
                print(f"[evidence] Postgres connect retry {attempt+1}/5: {e}")
                await asyncio.sleep(2 ** attempt)
        store = cls(pool)
        await store._init_schema()
        return store

    async def _init_schema(self) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS evidence_chunks (
                    id TEXT PRIMARY KEY,
                    source TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    ref_id TEXT NOT NULL,
                    text TEXT NOT NULL,
                    embedding vector(384),
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)
            await conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_evidence_kind ON evidence_chunks(kind)")
            # ivfflat ANN index for sub-100ms cosine search at scale.
            # lists=100 is good up to ~100K rows; rebuild for larger corpora.
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_evidence_embedding
                ON evidence_chunks USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100)
            """)

    async def ingest(self, rec: EvidenceRecord) -> None:
        vec_str = "[" + ",".join(f"{x:.8f}" for x in rec.embedding) + "]"
        async with self._pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO evidence_chunks (id, source, kind, ref_id, text, embedding, metadata) "
                "VALUES ($1, $2, $3, $4, $5, $6::vector, $7::jsonb) "
                "ON CONFLICT (id) DO UPDATE SET text=$5, embedding=$6::vector, metadata=$7::jsonb",
                rec.id, rec.source, rec.kind, rec.ref_id, rec.text, vec_str,
                json.dumps(rec.metadata),
            )

    async def search_semantic(self, query_vec: list[float], limit: int,
                              kind_filter: str | None) -> list[SearchHit]:
        vec_str = "[" + ",".join(f"{x:.8f}" for x in query_vec) + "]"
        sql = (
            "SELECT id, kind, ref_id, text, metadata, "
            "1 - (embedding <=> $1::vector) AS cosine_sim "
            "FROM evidence_chunks "
            + ("WHERE kind = $3 " if kind_filter else "")
            + "ORDER BY embedding <=> $1::vector LIMIT $2"
        )
        params: list[Any] = [vec_str, limit]
        if kind_filter:
            params = [vec_str, limit, kind_filter]
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(sql, *params)
        return [SearchHit(
            id=r["id"], kind=r["kind"], ref_id=r["ref_id"], text=r["text"],
            score=float(r["cosine_sim"]),
            metadata=json.loads(r["metadata"]) if r["metadata"] else {},
        ) for r in rows]

    async def search_keyword(self, terms: list[str], limit: int,
                             kind_filter: str | None) -> list[SearchHit]:
        if not terms:
            return []
        import asyncpg
        # ILIKE ANY — simple and correct for a small term set.
        clause = " OR ".join(["text ILIKE $" + str(i + 1) for i in range(len(terms))])
        params = [f"%{t}%" for t in terms]
        sql = f"SELECT id, kind, ref_id, text, metadata FROM evidence_chunks WHERE ({clause})"
        if kind_filter:
            sql += f" AND kind = ${len(params) + 1}"
            params.append(kind_filter)
        sql += f" ORDER BY LENGTH(text) ASC LIMIT ${len(params) + 1}"
        params.append(limit)
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(sql, *params)
        return [SearchHit(
            id=r["id"], kind=r["kind"], ref_id=r["ref_id"], text=r["text"],
            score=0.0,
            metadata=json.loads(r["metadata"]) if r["metadata"] else {},
        ) for r in rows]

    async def count(self) -> int:
        async with self._pool.acquire() as conn:
            return await conn.fetchval("SELECT COUNT(*) FROM evidence_chunks")


def make_store(database_url: str | None) -> EvidenceStore:
    """Factory: Postgres if URL starts with postgres://, else SQLite."""
    if database_url and database_url.startswith("postgres"):
        # PostgresStore.create is async; callers should use it directly.
        raise RuntimeError("For Postgres, await PostgresStore.create(url) directly.")
    return SqliteStore(database_url or ":memory:")
