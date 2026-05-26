from __future__ import annotations

import math

from mlip_phoenix_trace import (
    growth_report_to_spans,
    promotion_packet_to_spans,
    sanitize,
)

SAMPLE_PACKET = {
    "schema": "lupine.mlip.local_to_cloud_promotion.v1",
    "created_at": "2026-05-25T00:00:00Z",
    "local_run_dir": "tmp/mlip-local/run",
    "cloud_run_id": "mlip-cloud-test",
    "gate": {
        "status": "hold_local",
        "objective": "accuracy",
        "complete_triplets": 2,
        "blockers": ["state-coupled hypothesis has downstream regressions: stress:mace-mp-0"],
        "warnings": [],
        "mean_distill_accuracy_delta": -0.0792,
        "mean_accelerate_accuracy_delta": -0.0792,
        "mean_accelerate_loss_vs_distill": 0.0,
        "mean_speedup_accelerate_vs_distill": 1.25,
        "state_hypothesis": {
            "hypothesis_id": "distill.energy_state_lifts_lattice_observables",
            "motivation": "Distill first improves the energy state; downstream rows falsify that lift.",
            "anchor_row_id": "energy_volume",
            "downstream_rows": ["elastic_constants", "forces", "relaxation_stability", "stress"],
            "verdict": "refuted_downstream_regression",
            "energy_anchor_complete": 1,
            "energy_anchor_mean_delta": 0.2078,
            "downstream_complete": 1,
            "downstream_win_count": 0,
            "downstream_regression_count": 1,
        },
    },
    "thresholds": {
        "objective": "accuracy",
        "required_variants": ["baseline", "distill_accuracy"],
        "require_energy_anchor": True,
        "block_downstream_regressions": True,
        "min_accuracy_delta": 0.0,
        "min_speedup": 1.10,
        "max_accelerate_loss": 0.02,
    },
    "summary": {
        "cells": 4,
        "triplets": 2,
        "complete_triplets": 2,
        "energy_anchor_triplets": 1,
        "downstream_regressions": 1,
    },
    "triplets": [
        {
            "triplet_id": "energy_volume:mace-mp-0",
            "row_id": "energy_volume",
            "mlip_id": "mace-mp-0",
            "row_role": "energy_anchor",
            "energy_anchor": True,
            "complete": True,
            "metric_direction": "lower_error_is_better",
            "promotion_delta_metric": "primary_error_reduction",
            "accelerate_promotion_delta_metric": "primary_error_reduction",
            "promotion_delta_distill": 0.2078,
            "promotion_delta_accelerate": 0.2078,
            "primary_error_delta_distill": 0.2078,
            "primary_error_delta_accelerate": 0.2078,
            "accuracy_score_delta_distill": -0.2078,
            "accuracy_score_delta_accelerate": -0.2078,
            "accuracy_delta_distill": 0.2078,
            "accuracy_delta_accelerate": 0.2078,
            "accelerate_loss_vs_distill": 0.0,
            "speedup_accelerate_vs_baseline": 1.125,
            "speedup_accelerate_vs_distill": 1.25,
            "cells": {
                "baseline": {
                    "accuracy_score": 0.4116,
                    "accuracy_error": 0.4116,
                    "accuracy_metric": "energy_mae_ev_per_atom",
                    "metric_direction": "lower_error_is_better",
                    "speed_score": 8.0,
                },
                "distill_accuracy": {
                    "accuracy_score": 0.2038,
                    "accuracy_error": 0.2038,
                    "accuracy_metric": "energy_mae_ev_per_atom",
                    "metric_direction": "lower_error_is_better",
                    "speed_score": 7.2,
                    "distill_policy_hash": "sha256:policy",
                    "support_manifest_hash": "sha256:support",
                },
                "distill_accuracy_accelerate": {
                    "accuracy_score": 0.2038,
                    "accuracy_error": 0.2038,
                    "accuracy_metric": "energy_mae_ev_per_atom",
                    "metric_direction": "lower_error_is_better",
                    "speed_score": 9.0,
                    "distill_policy_hash": "sha256:policy",
                    "support_manifest_hash": "sha256:support",
                },
            },
        },
        {
            "triplet_id": "stress:mace-mp-0",
            "row_id": "stress",
            "mlip_id": "mace-mp-0",
            "row_role": "downstream_observable",
            "energy_anchor": False,
            "complete": True,
            "metric_direction": "lower_error_is_better",
            "promotion_delta_metric": "primary_error_reduction",
            "promotion_delta_distill": -0.3662,
            "primary_error_delta_distill": -0.3662,
            "accuracy_score_delta_distill": -0.3662,
            "cells": {
                "baseline": {
                    "accuracy_score": 0.10,
                    "accuracy_error": 0.10,
                    "accuracy_metric": "stress_mae_gpa",
                    "metric_direction": "lower_error_is_better",
                    "speed_score": 4.0,
                },
                "distill_accuracy": {
                    "accuracy_score": 0.4662,
                    "accuracy_error": 0.4662,
                    "accuracy_metric": "stress_mae_gpa",
                    "metric_direction": "lower_error_is_better",
                    "speed_score": 3.8,
                },
            },
        },
    ],
}


def test_sanitize_drops_none_and_nonfinite() -> None:
    assert sanitize({
        "keep": 1.0,
        "drop_none": None,
        "drop_nan": math.nan,
        "drop_inf": math.inf,
        "json": {"b": 2, "a": 1},
    }) == {
        "keep": 1.0,
        "json": '{"a": 1, "b": 2}',
    }


def test_promotion_root_records_energy_hypothesis_contract() -> None:
    root, children = promotion_packet_to_spans(SAMPLE_PACKET)

    assert len(children) == 2
    assert root["mlip.metric_contract.energy_anchor_required"] is True
    assert root["mlip.metric_contract.physical_error_reduction_preferred"] is True
    assert root["mlip.hypothesis.anchor_row_id"] == "energy_volume"
    assert root["mlip.hypothesis.verdict"] == "refuted_downstream_regression"
    assert root["mlip.gate.mean_distill_promotion_delta"] == -0.0792
    assert root["mlip.summary.downstream_regressions"] == 1


def test_promotion_child_separates_error_reduction_from_raw_score_delta() -> None:
    _, children = promotion_packet_to_spans(SAMPLE_PACKET)
    energy = next(child for child in children if child["mlip.triplet.row_id"] == "energy_volume")

    assert energy["mlip.triplet.energy_anchor"] is True
    assert energy["mlip.triplet.row_role"] == "energy_anchor"
    assert energy["mlip.triplet.promotion_delta_metric"] == "primary_error_reduction"
    assert energy["mlip.triplet.promotion_delta_distill"] == 0.2078
    assert energy["mlip.triplet.primary_error_delta_distill"] == 0.2078
    assert energy["mlip.triplet.accuracy_score_delta_distill"] == -0.2078
    assert energy["mlip.triplet.baseline.accuracy_error"] == 0.4116
    assert energy["mlip.triplet.distill_accuracy.distill_policy_hash"] == "sha256:policy"


def test_downstream_regression_preserved_as_refutation_evidence() -> None:
    _, children = promotion_packet_to_spans(SAMPLE_PACKET)
    stress = next(child for child in children if child["mlip.triplet.row_id"] == "stress")

    assert stress["mlip.triplet.energy_anchor"] is False
    assert stress["mlip.triplet.row_role"] == "downstream_observable"
    assert stress["mlip.triplet.promotion_delta_distill"] == -0.3662
    assert stress["mlip.triplet.primary_error_delta_distill"] == -0.3662


def test_growth_spans_carry_energy_anchor_contract() -> None:
    report = {
        "schema": "lupine.distill.growth_loop_report.v1",
        "created_at": "2026-05-25T00:00:00Z",
        "case_summary": {"count": 8, "row_counts": {"energy_volume": 4}},
        "search": {"rounds": 3, "beam_width": 4, "report_top_k": 16},
        "results": [
            {
                "objective": "accuracy",
                "promotion_label": "candidate",
                "best_candidate": {
                    "accuracy_delta_mean": 0.04,
                    "refusal_rate": 0.0,
                    "blocked_correction_rate": 0.2,
                    "policy_limits_id": "limits:a",
                    "ribbon_version": "hyperribbon:v1",
                },
            }
        ],
    }

    root, children = growth_report_to_spans(report)

    assert root["mlip.metric_contract.promotion_delta_positive_is_better"] is True
    assert root["mlip.hypothesis.anchor_row_id"] == "energy_volume"
    assert root["mlip.case_summary.count"] == 8
    assert children[0]["mlip.objective"] == "accuracy"
    assert children[0]["mlip.best.accuracy_delta_mean"] == 0.04


def _run() -> None:
    tests = [
        test_sanitize_drops_none_and_nonfinite,
        test_promotion_root_records_energy_hypothesis_contract,
        test_promotion_child_separates_error_reduction_from_raw_score_delta,
        test_downstream_regression_preserved_as_refutation_evidence,
        test_growth_spans_carry_energy_anchor_contract,
    ]
    for test in tests:
        test()


if __name__ == "__main__":
    _run()
