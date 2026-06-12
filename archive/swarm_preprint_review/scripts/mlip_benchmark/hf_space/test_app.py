"""Smoke tests for hf_space/app.py callable functions (no GPU, no install).

These tests stub the elastic-constant calculation so they run without ASE,
torch, CHGNet, etc. They cover the data-shaping logic — payload parsing in
predict_batch, error path in predict, BenchmarkRecord conversion — which is
where bugs would actually hide.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

# Stub the spaces module BEFORE importing app, so the @spaces.GPU decorator
# is a no-op. (This also covers the local-dev path where spaces isn't installed.)
sys.modules.setdefault("spaces", type(sys)("spaces"))

# Add hf_space to path
HF_SPACE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(HF_SPACE_DIR))


@pytest.fixture
def app_module(monkeypatch):
    """Import app.py with elastic.elastic_constants stubbed to a known value."""
    import importlib

    # Stub elastic_constants and ElasticResult before app imports them.
    fake_elastic = type(sys)("elastic")
    class FakeResult:
        def __init__(self, element):
            self.element = element
            self.structure = "fcc" if element in ("Al", "Cu") else "bcc"
            self.a0 = 4.05 if element == "Al" else 3.62
            self.c11 = 108.0 if element == "Al" else 168.0
            self.c12 = 61.0 if element == "Al" else 121.0
            self.c44 = 28.5 if element == "Al" else 75.0
            self.energy_per_atom = -3.36 if element == "Al" else -3.50
    fake_elastic.ElasticResult = FakeResult
    def fake_elastic_constants(element, calc, **_kw):
        if element == "BAD":
            raise RuntimeError("synthetic failure")
        return FakeResult(element)
    fake_elastic.elastic_constants = fake_elastic_constants
    monkeypatch.setitem(sys.modules, "elastic", fake_elastic)

    # Stub calculators.make_calculator so it never tries to load real weights.
    fake_calculators = type(sys)("calculators")
    fake_calculators.make_calculator = lambda mlip_id: f"FAKE-{mlip_id}"
    monkeypatch.setitem(sys.modules, "calculators", fake_calculators)

    # Force a clean import
    if "app" in sys.modules:
        del sys.modules["app"]
    import app  # noqa: WPS433
    importlib.reload(app)
    app._CALC_CACHE.clear()
    yield app


def test_predict_single_returns_expected_keys(app_module) -> None:
    out = app_module.predict("Al", "chgnet")
    assert out == {
        "element": "Al", "mlip": "chgnet", "structure": "fcc",
        "a0": 4.05, "c11": 108.0, "c12": 61.0, "c44": 28.5,
        "energy_per_atom": -3.36,
    }


def test_predict_error_path(app_module) -> None:
    out = app_module.predict("BAD", "chgnet")
    assert "error" in out
    assert out["element"] == "BAD"
    assert out["mlip"] == "chgnet"


def test_predict_batch_without_refs_returns_simple_records(app_module) -> None:
    out = app_module.predict_batch("Al,Cu", "chgnet")
    assert len(out) == 2
    assert {r["element"] for r in out} == {"Al", "Cu"}
    for r in out:
        assert "c11" in r and "c12" in r and "c44" in r and "a0" in r
        assert "predicted" not in r  # no refs → not in BenchmarkRecord shape


def test_predict_batch_with_refs_returns_benchmark_records(app_module) -> None:
    refs = json.dumps({
        "Al": {"C11": 108.2, "C12": 61.3, "C44": 28.5, "a0": 4.05},
        "Cu": {"C11": 168.4},
    })
    out = app_module.predict_batch("Al,Cu", "chgnet", refs)
    # Al has 4 props, Cu has 1 → 5 records
    assert len(out) == 5
    al_props = sorted(r["property"] for r in out if r["element"] == "Al")
    assert al_props == ["C11", "C12", "C44", "a0"]
    cu_props = sorted(r["property"] for r in out if r["element"] == "Cu")
    assert cu_props == ["C11"]
    sample = out[0]
    # Must match BenchmarkRecord schema exactly so /ingest/batch accepts it
    for key in ("recordId", "element", "potentialId", "potentialLabel",
                "pairStyle", "property", "reference", "predicted", "unit",
                "provenance", "agentId", "timestamp"):
        assert key in sample, f"BenchmarkRecord missing {key}"
    assert sample["pairStyle"] == "mlip"


def test_predict_batch_continues_past_one_failure(app_module) -> None:
    out = app_module.predict_batch("Al,BAD,Cu", "chgnet")
    assert len(out) == 3
    bad_record = next(r for r in out if r["element"] == "BAD")
    assert "error" in bad_record


def test_calculator_cached_across_calls(app_module) -> None:
    app_module.predict("Al", "chgnet")
    app_module.predict("Cu", "chgnet")
    assert app_module._CALC_CACHE == {"chgnet": "FAKE-chgnet"}, \
        "MLIP calculator must be cached across requests"
