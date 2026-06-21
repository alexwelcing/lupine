"""
Evidence-index service — Cloud Run (GCP satellite).

The production home of the evidence index. Workers POST coordination traces
here (live); this service embeds them and stores them in Postgres+pgvector
(Cloud SQL). The coordinator's `consultMemory()` calls `/search` before
choosing a strategy — that's the flywheel: past results steer future picks.

Endpoints:
  GET  /health           → {ok, count, embedder_loaded}
  POST /ingest           → embed + upsert one evidence record
  GET  /search?q=...     → semantic nearest-neighbour (or keyword fallback)
  POST /search           → body: {query, limit, kind, mode}
  GET  /count            → total indexed records

Auth: bearer token via EVIDENCE_INGEST_TOKEN env var (constant-time compare).
Read endpoints (/health, /search, /count) are open; write (/ingest) is gated.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import re
import time
from contextlib import asynccontextmanager
from dataclasses import asdict
from typing import Any, AsyncIterator

import numpy as np
from fastapi import FastAPI, Header, HTTPException, Query
from pydantic import BaseModel

from store import (
    EvidenceRecord,
    PostgresStore,
    SearchHit,
    SqliteStore,
    EvidenceStore,
)

EMBED_DIM = 384
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# ─── Embedder singleton (loaded once at startup, warm for all requests) ───────

_embedder: Any = None
_embedder_loaded: bool = False


def _load_embedder() -> None:
    global _embedder, _embedder_loaded
    try:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer(EMBED_MODEL)
        _embedder_loaded = True
    except Exception as e:
        print(f"[evidence] embedder load failed ({e}); using hash-vector fallback")
        _embedder = None
        _embedder_loaded = False


def embed(text: str) -> list[float]:
    """Real sentence-transformers embed, or deterministic hash-vector fallback."""
    if _embedder is not None:
        vec = _embedder.encode(text, normalize_embeddings=True)
        if int(np.asarray(vec).shape[-1]) == EMBED_DIM:
            return np.asarray(vec, dtype=np.float32).tolist()
    return _fallback_embed(text)


def _fallback_embed(text: str) -> list[float]:
    """Deterministic lexical embedding used when the real model is unavailable.

    The previous SHA-byte fallback produced stable vectors but no relationship
    between overlapping texts, so offline/dev semantic search could rank an
    unrelated record above one sharing the query terms. Hash tokens into a
    signed bag-of-words vector instead: still cheap and deterministic, but
    lexical overlap now creates cosine overlap while CI remains HF-independent.
    """
    tokens = re.findall(r"[a-z0-9][a-z0-9_-]*", text.lower())
    arr = np.zeros(EMBED_DIM, dtype=np.float32)
    for token in tokens:
        h = hashlib.sha256(token.encode("utf-8")).digest()
        idx = int.from_bytes(h[:4], "big") % EMBED_DIM
        sign = 1.0 if h[4] & 1 else -1.0
        arr[idx] += sign
    n = float(np.linalg.norm(arr))
    if n == 0.0:
        return arr.tolist()
    return (arr / n).astype(np.float32).tolist()


# ─── Store lifecycle ─────────────────────────────────────────────────────────

store: EvidenceStore | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    global store
    _load_embedder()
    db_url = os.environ.get("EVIDENCE_DB_URL")
    if db_url and db_url.startswith("postgres"):
        store = await PostgresStore.create(db_url)
        print(f"[evidence] Postgres+pgvector store ready: {db_url[:40]}...")
    else:
        db_path = os.environ.get("EVIDENCE_DB_PATH", "/tmp/evidence.db")
        store = SqliteStore(db_path)
        print(f"[evidence] SQLite store ready: {db_path}")
    yield
    if hasattr(store, "_pool"):
        await store._pool.close()  # type: ignore[union-attr]


app = FastAPI(
    title="glim-think evidence index",
    description="Live semantic index over coordination traces, hypotheses, and claims.",
    version="1.0.0",
    lifespan=lifespan,
)


# ─── Auth ────────────────────────────────────────────────────────────────────

def _check_auth(authorization: str | None) -> None:
    """App-level bearer auth for data endpoints.

    Cloud Run is deployed with --allow-unauthenticated because Cloudflare
    Workers cannot mint Google identity tokens. The evidence surface is still
    protected: /ingest, /search, and /count require EVIDENCE_INGEST_TOKEN.
    /health is intentionally open for uptime checks.
    """
    token = os.environ.get("EVIDENCE_INGEST_TOKEN", "")
    if not token:
        return  # dev/test mode — no auth configured
    provided = ""
    if authorization and authorization.startswith("Bearer "):
        provided = authorization[7:]
    if not hmac.compare_digest(token, provided):
        raise HTTPException(status_code=401, detail="unauthorized")


# ─── Models ──────────────────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    id: str
    kind: str = "coordination_trace"
    ref_id: str | None = None
    text: str
    metadata: dict[str, Any] = {}


class SearchRequest(BaseModel):
    query: str
    limit: int = 5
    kind: str | None = None
    mode: str = "semantic"  # "semantic" | "keyword"


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "ok": True,
        "count": await store.count() if store else 0,
        "embedder_loaded": _embedder_loaded,
        "embed_model": EMBED_MODEL if _embedder_loaded else "hash-fallback",
    }


@app.post("/ingest")
async def ingest(
    req: IngestRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    _check_auth(authorization)
    if not store:
        raise HTTPException(status_code=503, detail="store not ready")
    t0 = time.monotonic()
    embedding = embed(req.text)
    rec = EvidenceRecord(
        id=req.id,
        source=req.kind,
        kind=req.kind,
        ref_id=req.ref_id or req.id,
        text=req.text,
        embedding=embedding,
        metadata=req.metadata,
    )
    await store.ingest(rec)
    return {"ok": True, "id": req.id, "embed_ms": round((time.monotonic() - t0) * 1000, 1)}


@app.get("/search")
async def search_get(
    q: str = Query(..., min_length=1),
    limit: int = Query(default=5, ge=1, le=50),
    kind: str | None = Query(default=None),
    mode: str = Query(default="semantic"),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    _check_auth(authorization)
    return await _do_search(q, limit, kind, mode)


@app.post("/search")
async def search_post(
    req: SearchRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    _check_auth(authorization)
    return await _do_search(req.query, req.limit, req.kind, req.mode)


async def _do_search(query: str, limit: int, kind: str | None, mode: str) -> dict[str, Any]:
    if not store:
        raise HTTPException(status_code=503, detail="store not ready")
    t0 = time.monotonic()
    if mode == "keyword":
        terms = [t for t in query.lower().split() if len(t) >= 2]
        hits = await store.search_keyword(terms, limit, kind)
    else:
        vec = embed(query)
        hits = await store.search_semantic(vec, limit, kind)
    return {
        "query": query,
        "mode": mode,
        "kind": kind,
        "count": len(hits),
        "search_ms": round((time.monotonic() - t0) * 1000, 1),
        "results": [_hit_dict(h) for h in hits],
    }


@app.get("/count")
async def count(authorization: str | None = Header(default=None)) -> dict[str, int]:
    _check_auth(authorization)
    return {"count": await store.count() if store else 0}


def _hit_dict(h: SearchHit) -> dict[str, Any]:
    return {
        "id": h.id,
        "kind": h.kind,
        "ref_id": h.ref_id,
        "text": h.text[:500],
        "score": round(h.score, 4),
        "metadata": h.metadata,
    }
