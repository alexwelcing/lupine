from __future__ import annotations

import json
from pathlib import Path

import mlip_distill_growth_loop as growth


def test_local_artifact_cases_use_candidate_correction_when_executable_correction_is_empty(tmp_path: Path) -> None:
    artifact_dir = tmp_path / "run" / "artifacts" / "distill_accuracy_energy_volume_chgnet"
    artifact_dir.mkdir(parents=True)
    payload = {
        "schema": "lupine.mlip.cell_artifact.v1",
        "cell_id": "distill_accuracy:energy_volume:chgnet",
        "row_id": "energy_volume",
        "mlip_id": "chgnet",
        "distill_runtime": {
            "support_model": {
                "correction": {},
                "candidate_correction": {"energy_bias_ev_per_atom": -1.4},
                "diagnostics": {"energy_correction_gate": "blocked_large_bias"},
            }
        },
        "predictions": [
            {
                "structure_id": "case-1",
                "energy_ev_per_atom": 1.0,
                "reference": {"energy_ev_per_atom": 0.9},
            }
        ],
    }
    (artifact_dir / "cell_result.json").write_text(json.dumps(payload), encoding="utf-8")

    [case] = growth.local_artifact_cases(tmp_path / "run")

    assert case["support"]["correction"] == {"energy_bias_ev_per_atom": -1.4}
    assert case["support"]["diagnostics"]["energy_correction_gate"] == "blocked_large_bias"


def test_local_artifact_cases_prefer_rank_aware_ribbon_candidate(tmp_path: Path) -> None:
    artifact_dir = tmp_path / "run" / "artifacts" / "distill_accuracy_stress_chgnet"
    artifact_dir.mkdir(parents=True)
    ribbon = {
        "schema": "lupine.distill.ribbon_residual_correction.v1",
        "field": "stress_gpa",
        "feature_names": ["scalar:energy_ev_per_atom"],
        "feature_mean": [0.0],
        "feature_scale": [1.0],
        "intercept": [0.1],
        "coefficients": [[0.0]],
        "support_lift_fraction": 0.5,
    }
    payload = {
        "schema": "lupine.mlip.cell_artifact.v1",
        "cell_id": "distill_accuracy:stress:chgnet",
        "row_id": "stress",
        "mlip_id": "chgnet",
        "distill_runtime": {
            "support_model": {
                "correction": {"stress_bias_gpa": [0.1]},
                "candidate_correction": {"ribbon_residual_correction_v1": ribbon},
                "diagnostics": {"stress_correction_gate": "passed"},
            }
        },
        "predictions": [
            {
                "structure_id": "case-1",
                "stress_gpa": [1.0],
                "reference": {"stress_gpa": [1.1]},
            }
        ],
    }
    (artifact_dir / "cell_result.json").write_text(json.dumps(payload), encoding="utf-8")

    [case] = growth.local_artifact_cases(tmp_path / "run")

    assert case["support"]["correction"] == {"ribbon_residual_correction_v1": ribbon}


def test_local_artifact_cases_replay_raw_baseline_prediction_when_available(tmp_path: Path) -> None:
    baseline_dir = tmp_path / "run" / "artifacts" / "baseline_energy_volume_chgnet"
    distill_dir = tmp_path / "run" / "artifacts" / "distill_accuracy_energy_volume_chgnet"
    baseline_dir.mkdir(parents=True)
    distill_dir.mkdir(parents=True)
    baseline = {
        "schema": "lupine.mlip.cell_artifact.v1",
        "cell_id": "baseline:energy_volume:chgnet",
        "row_id": "energy_volume",
        "mlip_id": "chgnet",
        "predictions": [
            {
                "structure_id": "case-1",
                "energy_ev_per_atom": 1.0,
                "reference": {"energy_ev_per_atom": 0.5},
            }
        ],
    }
    distill = {
        "schema": "lupine.mlip.cell_artifact.v1",
        "cell_id": "distill_accuracy:energy_volume:chgnet",
        "row_id": "energy_volume",
        "mlip_id": "chgnet",
        "distill_runtime": {
            "support_model": {
                "correction": {"energy_bias_ev_per_atom": -0.4},
                "candidate_correction": {},
                "diagnostics": {},
            }
        },
        "predictions": [
            {
                "structure_id": "case-1",
                "energy_ev_per_atom": 0.6,
                "distill": {"decision": "accept"},
                "reference": {"energy_ev_per_atom": 0.5},
            }
        ],
    }
    (baseline_dir / "cell_result.json").write_text(json.dumps(baseline), encoding="utf-8")
    (distill_dir / "cell_result.json").write_text(json.dumps(distill), encoding="utf-8")

    [case] = growth.local_artifact_cases(tmp_path / "run")

    assert case["prediction"] == {
        "structure_id": "case-1",
        "energy_ev_per_atom": 1.0,
    }
    assert case["group_id"] == "energy_volume:chgnet"


def test_cloud_campaign_cases_mine_completed_artifacts(monkeypatch) -> None:
    campaign = {"campaign_id": "cmp"}
    baseline_cell = {
        "cell_id": "cmp:baseline:energy_volume:mace",
        "variant_id": "baseline",
        "row_id": "energy_volume",
        "mlip_id": "mace",
    }
    distill_cell = {
        "cell_id": "cmp:distill_accuracy:energy_volume:mace",
        "variant_id": "distill_accuracy",
        "row_id": "energy_volume",
        "mlip_id": "mace",
        "depends_on_cell_id": baseline_cell["cell_id"],
    }

    monkeypatch.setattr(growth.campaign_tools, "load_campaign", lambda _path: campaign)
    monkeypatch.setattr(growth.campaign_tools, "expand_cells", lambda _campaign, scope: [baseline_cell, distill_cell])
    monkeypatch.setattr(growth.evidence_collect, "artifact_url", lambda cell: f"gs://bucket/{cell['cell_id']}.json")

    def fake_load(url: str):
        if "baseline" in url:
            return {
                "predictions": [
                    {
                        "structure_id": "s1",
                        "energy_ev_per_atom": 1.0,
                        "reference": {"energy_ev_per_atom": 0.25},
                    }
                ]
            }
        return {
            "distill_runtime": {
                "support_model": {
                    "correction": {},
                    "candidate_correction": {"energy_bias_ev_per_atom": -0.5},
                    "diagnostics": {"support_lift_fraction": 0.4},
                }
            }
        }

    monkeypatch.setattr(growth, "load_gcs_json", fake_load)

    [case] = growth.cloud_campaign_cases(Path("campaign.json"), "promotion-canary", "baseline-error")

    assert case["case_id"] == "cmp:distill_accuracy:energy_volume:mace:0"
    assert case["group_id"] == "energy_volume:mace"
    assert case["prediction"] == {"structure_id": "s1", "energy_ev_per_atom": 1.0}
    assert case["support"]["correction"] == {"energy_bias_ev_per_atom": -0.5}
    assert case["weight"] > 1.0
