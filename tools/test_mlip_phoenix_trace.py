#!/usr/bin/env python3
"""Tests for the pure span builders in mlip_phoenix_trace.

These need no network and no opentelemetry SDK — they exercise the
attribute-shaping that turns flywheel JSON into OTLP span attributes.
Run: python tools/test_mlip_phoenix_trace.py
"""

from __future__ import annotations

import math

from mlip_phoenix_trace import (
    growth_report_to_spans,
    promotion_packet_to_spans,
    sanitize,
)

SAMPLE_PACKET = {
    "schema": "lupine.mlip.local_to_cloud_promotion.v1",
    "cloud_run_id": "mlip-cloud-20260524-000000",
    "created_at": "2026-05-24T00:00:00Z",
    "gate": {
        "status": "promote_to_gcp_canary",
        "complete_triplets": 2,
        "blockers": [],
        "mean_distill_accuracy_delta": 0.15,
        "mean_accelerate_accuracy_delta": 0.12,
        "mean_accelerate_loss_vs_distill": 0.01,
        "mean_speedup_accelerate_vs_distill": 1.25,
    },
    "thresholds": {"min_accuracy_delta": 0.0, "min_speedup": 1.10, "max_accelerate_loss": 0.02},
    "summary": {"cells": 6, "triplets": 2},
    "triplets": [
        {
            "triplet_id": "energy:MACE",
            "row_id": "energy",
            "mlip_id": "MACE",
            "complete": True,
            "accuracy_delta_distill": 0.2078,
            "accuracy_delta_accelerate": 0.2078,
            "accelerate_loss_vs_distill": 0.0,
            "speedup_accelerate_vs_baseline": 1.3,
            "speedup_accelerate_vs_distill": 1.25,
            "cells": {
                "baseline": {"accuracy_score": 0.4116, "speed_score": 100.0},
                "distill_accuracy": {"accuracy_score": 0.2038, "speed_score": 98.0},
                "distill_accuracy_accelerate": {"accuracy_score": 0.2038, "speed_score": 125.0},
            },
        },
        {
            "triplet_id": "stress:MACE",
            "row_id": "stress",
            "mlip_id": "MACE",
            "complete": True,
            "accuracy_delta_distill": -0.3662,
            "accuracy_delta_accelerate": -0.1976,
            "accelerate_loss_vs_distill": -0.1686,
            # incomplete speed → None, must be dropped from attributes
            "speedup_accelerate_vs_baseline": None,
            "speedup_accelerate_vs_distill": None,
            "cells": {"baseline": {"accuracy_score": 0.5669, "speed_score": 100.0}},
        },
    ],
}

SAMPLE_GROWTH = {
    "schema": "lupine.distill.growth_loop_report.v1",
    "created_at": "2026-05-24T00:00:00Z",
    "search": {"rounds": 3, "beam_width": 4, "report_top_k": 16},
    "results": [
        {
            "objective": "accuracy",
            "promotion_label": "candidate",
            "best_candidate": {"accuracy_delta_mean": 0.12, "refusal_rate": 0.02, "blocked_correction_rate": 0.1},
        },
        {
            "objective": "accuracy_accelerate",
            "promotion_label": "hold",
            "best_candidate": {"accuracy_delta_mean": -0.01, "refusal_rate": 0.2, "blocked_correction_rate": 0.8},
        },
    ],
}


def test_sanitize_drops_none_and_nonfinite():
    out = sanitize({"a": 1, "b": None, "c": math.nan, "d": math.inf, "e": "x", "f": True})
    assert out == {"a": 1, "e": "x", "f": True}, out


def test_sanitize_stringifies_complex():
    out = sanitize({"k": {"nested": 1}})
    assert out["k"] == '{"nested": 1}', out


def test_promotion_root_attributes():
    root, children = promotion_packet_to_spans(SAMPLE_PACKET)
    assert root["mlip.gate.status"] == "promote_to_gcp_canary"
    assert root["mlip.gate.mean_distill_accuracy_delta"] == 0.15
    assert root["mlip.gate.blocker_count"] == 0
    assert root["mlip.summary.triplets"] == 2
    assert root["mlip.thresholds.min_speedup"] == 1.10
    assert len(children) == 2


def test_promotion_child_metrics_and_none_dropped():
    _root, children = promotion_packet_to_spans(SAMPLE_PACKET)
    energy = next(c for c in children if c["mlip.triplet.id"] == "energy:MACE")
    assert energy["mlip.triplet.accuracy_delta_distill"] == 0.2078
    assert energy["mlip.triplet.speedup_accelerate_vs_baseline"] == 1.3
    assert energy["mlip.triplet.baseline.accuracy_score"] == 0.4116
    assert energy["mlip.triplet.distill_accuracy_accelerate.speed_score"] == 125.0

    stress = next(c for c in children if c["mlip.triplet.id"] == "stress:MACE")
    # None speedups must be absent (OTel rejects None)
    assert "mlip.triplet.speedup_accelerate_vs_baseline" not in stress
    assert "mlip.triplet.speedup_accelerate_vs_distill" not in stress
    # regression preserved as a (negative) metric, not hidden
    assert stress["mlip.triplet.accuracy_delta_distill"] == -0.3662
    # only baseline variant present
    assert "mlip.triplet.baseline.accuracy_score" in stress
    assert "mlip.triplet.distill_accuracy.accuracy_score" not in stress


def test_growth_spans():
    root, children = growth_report_to_spans(SAMPLE_GROWTH)
    assert root["mlip.search.rounds"] == 3
    assert len(children) == 2
    cand = next(c for c in children if c["mlip.objective"] == "accuracy")
    assert cand["mlip.promotion_label"] == "candidate"
    assert cand["mlip.best.accuracy_delta_mean"] == 0.12


def _run() -> int:
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    failures = 0
    for t in tests:
        try:
            t()
            print(f"PASS {t.__name__}")
        except AssertionError as exc:
            failures += 1
            print(f"FAIL {t.__name__}: {exc}")
    print(f"\n{len(tests) - failures}/{len(tests)} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(_run())
