"""
Tests for the evidence-index FastAPI service.

Uses the SQLite store (no Postgres dependency) via FastAPI's TestClient.
The store interface guarantees the Postgres path behaves identically.
"""
import os
import tempfile
import pytest
from fastapi.testclient import TestClient

# Force SQLite mode before importing the app
os.environ["EVIDENCE_DB_PATH"] = os.path.join(tempfile.gettempdir(), "evidence_test.db")
os.environ["EVIDENCE_DB_URL"] = ""  # ensure not postgres

# Remove any stale DB from a prior run
db = os.environ["EVIDENCE_DB_PATH"]
if os.path.exists(db):
    os.remove(db)

from app import app, _load_embedder

# Pre-load embedder so tests use the real model (or fallback if unavailable)
_load_embedder()


@pytest.fixture(scope="module")
def warm_client():
    """Yield a TestClient whose lifespan has run (store initialized).
    FastAPI lifespan only fires under the context-manager protocol."""
    with TestClient(app) as c:
        yield c


def _ingest(client, text, kind="coordination_trace", ref_id="t1", metadata=None):
    resp = client.post("/ingest", json={
        "id": ref_id, "kind": kind, "ref_id": ref_id,
        "text": text, "metadata": metadata or {},
    })
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_health(warm_client):
    resp = warm_client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert "count" in data
    assert "embedder_loaded" in data


def test_ingest_and_count(warm_client):
    before = warm_client.get("/count").json()["count"]
    _ingest(warm_client, "Fan-out/Merge coordination beat the baseline by 18% confidence uplift.",
            ref_id="ingest-test-1")
    after = warm_client.get("/count").json()["count"]
    assert after == before + 1


def test_semantic_search_finds_relevant(warm_client):
    _ingest(warm_client, "The hyper-ribbon error manifold is bounded by 3.1 meV per atom.",
            kind="hypothesis", ref_id="hyp-ribbon")
    _ingest(warm_client, "Race coordination cancelled minimax and zai after workers-ai won.",
            kind="coordination_trace", ref_id="race-1")
    resp = warm_client.post("/search", json={
        "query": "error manifold bounded", "limit": 5, "mode": "semantic",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] >= 1
    top = data["results"][0]
    assert "manifold" in top["text"].lower() or "error" in top["text"].lower()


def test_keyword_search(warm_client):
    _ingest(warm_client, "Aluminium MEAM cohesive energy 3.39 eV predicted.",
            kind="claim", ref_id="claim-al-1")
    resp = warm_client.get("/search", params={"q": "aluminium cohesive", "mode": "keyword"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] >= 1
    assert any("aluminium" in r["text"].lower() for r in data["results"])


def test_kind_filter(warm_client):
    _ingest(warm_client, "Only a hypothesis should match here.", kind="hypothesis", ref_id="hyp-only")
    resp = warm_client.post("/search", json={
        "query": "hypothesis", "limit": 10, "mode": "keyword", "kind": "hypothesis",
    })
    assert resp.status_code == 200
    for r in resp.json()["results"]:
        assert r["kind"] == "hypothesis"


def test_ingest_is_idempotent(warm_client):
    """Same id -> upsert, not duplicate."""
    before = warm_client.get("/count").json()["count"]
    _ingest(warm_client, "same text", ref_id="idempotent-1")
    mid = warm_client.get("/count").json()["count"]
    assert mid == before + 1
    _ingest(warm_client, "updated text", ref_id="idempotent-1")
    after = warm_client.get("/count").json()["count"]
    assert after == mid, "upsert should not create a duplicate"
