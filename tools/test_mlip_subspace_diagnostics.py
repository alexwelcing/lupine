from __future__ import annotations

import mlip_subspace_diagnostics as diagnostics
import pytest


def test_subspace_diagnostic_reports_complement_concentration() -> None:
    cell = {
        "cell_id": "cmp:baseline:energy_volume:toy",
        "row_id": "energy_volume",
        "mlip_id": "toy-mlip",
        "variant_id": "baseline",
    }
    artifact = {
        "predictions": [
            {
                "structure_id": f"case-{idx}",
                "energy_ev_per_atom": float(idx),
                "stress_gpa": [float(idx), float(idx % 2), float(idx) * 0.25],
                "reference": {"energy_ev_per_atom": float(idx) + (0.3 if idx % 2 else -0.1)},
            }
            for idx in range(1, 7)
        ]
    }

    report = diagnostics.diagnostic_for_cell(cell, artifact, "memory://artifact")

    assert report["status"] == "fit"
    assert report["complement_residual_fraction"] >= 0.0
    assert report["stiff_axis_residual_fraction"] >= 0.0
    assert report["complement_residual_fraction"] + report["stiff_axis_residual_fraction"] == pytest.approx(1.0)
    assert report["projection_distance_proxy"] >= 0.0
    assert report["feature_names"]


def test_subspace_summary_names_complement_visible_gate() -> None:
    summary = diagnostics.summarize_cells(
        [
            {
                "row_id": "energy_volume",
                "complement_residual_fraction": 0.9,
                "stiff_axis_residual_fraction": 0.1,
            },
            {
                "row_id": "relaxation_stability",
                "complement_residual_fraction": 0.1,
                "stiff_axis_residual_fraction": 0.9,
            },
        ],
        min_complement_fraction=0.5,
    )

    assert summary["cells_total"] == 2
    assert summary["cells_measured"] == 2
    assert summary["cells_complement_supported"] == 1
    assert summary["cells_stiff_dominated"] == 1
    assert summary["verdict"] == "complement_signal_visible"
    assert summary["foundation_gate_status"] == "locked"
    assert summary["policy_claim_allowed"] is False
    assert summary["cloud_canary_allowed"] is False
    assert summary["universal_manifold_claim_allowed"] is False
    assert summary["universality_gate_status"] == "blocked_by_surface_area"


def test_subspace_validation_locks_only_diagnostic_contract() -> None:
    cells = [
        {
            "row_id": row_id,
            "mlip_id": mlip_id,
            "variant_id": "baseline",
            "cell_id": f"cmp:baseline:{row_id}:{mlip_id}",
            "artifact_uri": "memory://artifact",
            "prediction_count": 6,
            "status": "fit",
            "complement_residual_fraction": 0.99 if row_id == "energy_volume" else 0.6,
            "stiff_axis_residual_fraction": 0.01 if row_id == "energy_volume" else 0.4,
            "stiff_axis_drift_fraction": 0.01 if row_id == "energy_volume" else 0.4,
            "projection_distance_proxy": 0.2,
            "projected_support_lift_fraction": 0.4,
            "participation_ratio": 1.5,
            "singular_values": [3.0, 1.0],
            "feature_names": ["x", "y"],
            "theorem_development_lanes": [
                {"lane": "stiff_axis_preservation", "runtime_proxy": "stiff_axis_drift_fraction", "status": "measured"},
                {"lane": "orthogonal_complement_lift", "runtime_proxy": "complement_residual_fraction", "status": "measured"},
                {"lane": "projection_tube_refusal", "runtime_proxy": "projection_distance_proxy", "status": "measured"},
                {"lane": "vandermonde_decay", "runtime_proxy": "singular_values", "status": "measured"},
            ],
        }
        for mlip_id in ["mace-mp-0", "chgnet", "orb-v3", "sevennet"]
        for row_id in ["energy_volume", "relaxation_stability"]
    ]
    summary = diagnostics.summarize_cells(cells, min_complement_fraction=0.5)
    report = {
        "schema": diagnostics.SCHEMA,
        "diagnostic_scope": diagnostics.DIAGNOSTIC_SCOPE,
        "basis_space": "feature",
        "campaign_id": "cmp",
        "campaign_hash": "sha256:test",
        "scope": "promotion-canary",
        "variant_id": "baseline",
        "ribbon_version": diagnostics.RIBBON_VERSION,
        "summary": summary,
        "cells": cells,
    }

    validation = diagnostics.validate_report(report)

    assert validation["status"] == "passed"
    assert validation["errors"] == []


def test_subspace_validation_rejects_fraction_leak() -> None:
    report = {
        "schema": diagnostics.SCHEMA,
        "diagnostic_scope": diagnostics.DIAGNOSTIC_SCOPE,
        "basis_space": "feature",
        "ribbon_version": diagnostics.RIBBON_VERSION,
        "summary": {
            "cells_total": 1,
            "cells_measured": 1,
            "policy_claim_allowed": False,
            "cloud_canary_allowed": False,
            "foundation_gate_status": "locked",
            "failed_conditions": [],
            "by_row": {"energy_volume": {"interpretation": "projected_ribbon_candidate"}},
        },
        "cells": [
            {
                "row_id": "energy_volume",
                "mlip_id": "toy-mlip",
                "status": "fit",
                "complement_residual_fraction": 0.8,
                "stiff_axis_residual_fraction": 0.4,
                "projection_distance_proxy": 0.1,
                "projected_support_lift_fraction": 0.2,
                "participation_ratio": 1.0,
                "singular_values": [1.0],
                "theorem_development_lanes": [
                    {"lane": "stiff_axis_preservation"},
                    {"lane": "orthogonal_complement_lift"},
                    {"lane": "projection_tube_refusal"},
                    {"lane": "vandermonde_decay"},
                ],
            }
        ],
    }

    validation = diagnostics.validate_report(report)

    assert validation["status"] == "failed"
    assert any("sum to 1" in error for error in validation["errors"])
