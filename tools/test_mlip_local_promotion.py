from __future__ import annotations

import json
from pathlib import Path

import mlip_local_promotion as promotion
import pytest


def write_cell(
    run_dir: Path,
    *,
    variant_id: str,
    row_id: str = "energy_volume",
    mlip_id: str = "chgnet",
    accuracy: float,
    speed: float,
    error: float | None = None,
    primary_metric: str = "energy_mae_ev_per_atom",
) -> None:
    artifact_dir = run_dir / "artifacts" / f"{variant_id}_{row_id}_{mlip_id}"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema": "lupine.mlip.cell_artifact.v1",
        "cell_id": f"local:{variant_id}:{row_id}:{mlip_id}",
        "variant_id": variant_id,
        "row_id": row_id,
        "mlip_id": mlip_id,
        "distill_profile": "off" if variant_id == "baseline" else "accuracy",
        "accuracy": {
            "score": accuracy,
            "primary_metric": primary_metric,
            "error": 1.0 - accuracy if error is None else error,
        },
        "speed": {"score": speed, "unit": "structures_per_second"},
        "checkpoint": {"mode": "read-write", "loaded_predictions": 0, "written_predictions": 1},
    }
    (artifact_dir / "cell_result.json").write_text(json.dumps(payload), encoding="utf-8")


def test_promotion_gate_promotes_accuracy_pair_and_builds_accuracy_canary_commands(tmp_path: Path) -> None:
    run_dir = tmp_path / "run"
    write_cell(run_dir, variant_id="baseline", accuracy=0.70, speed=10.0)
    write_cell(run_dir, variant_id="distill_accuracy", accuracy=0.76, speed=9.0)

    cells = promotion.load_cells(run_dir)
    triplets = promotion.group_triplets(cells, promotion.VARIANT_SCOPES["accuracy"])
    gate = promotion.evaluate_gate(
        triplets,
        objective="accuracy",
        min_complete_triplets=1,
        min_accuracy_delta=0.01,
        min_accelerate_accuracy_delta=0.0,
        max_accelerate_loss=0.02,
        min_speedup=1.10,
        require_energy_anchor=True,
        block_downstream_regressions=True,
    )
    canaries = promotion.build_cloud_canaries(
        triplets=triplets,
        backends={"chgnet": {"target_job": "mlip-cell-chgnet"}},
        required_variants=promotion.VARIANT_SCOPES["accuracy"],
        project="proj",
        region="us-central1",
        cloud_run_id="cloud-run",
        manifest_url="gs://inputs/manifest.json",
        support_manifest_url="gs://inputs/support.json",
        artifact_prefix="gs://outputs/mlip",
        worker_url="https://worker.test",
        distill_policy_url="gs://policies/v2.json",
        checkpoint_mode="read-write",
        limit=1,
        min_accuracy_delta=0.01,
    )

    assert gate["status"] == "promote_to_gcp_canary"
    assert gate["mean_distill_accuracy_delta"] == pytest.approx(0.06)
    assert gate["state_hypothesis"]["verdict"] == "testing_energy_anchor"
    assert triplets[0]["promotion_delta_metric"] == "primary_error_reduction"
    assert canaries[0]["target_job"] == "mlip-cell-chgnet"
    command = canaries[0]["commands"]["distill_accuracy"]["powershell"]
    assert "gcloud run jobs execute mlip-cell-chgnet" in command
    assert "^|^run-cell|--run-id=cloud-run" in command
    assert "|--distill-policy-url=gs://policies/v2.json" in command
    assert "distill_accuracy_accelerate" not in canaries[0]["commands"]


def test_promotion_gate_holds_when_distill_does_not_improve_accuracy(tmp_path: Path) -> None:
    run_dir = tmp_path / "run"
    write_cell(run_dir, variant_id="baseline", accuracy=0.70, speed=10.0)
    write_cell(run_dir, variant_id="distill_accuracy", accuracy=0.69, speed=9.0)
    write_cell(run_dir, variant_id="distill_accuracy_accelerate", accuracy=0.68, speed=12.0)

    gate = promotion.evaluate_gate(
        promotion.group_triplets(promotion.load_cells(run_dir), promotion.VARIANT_SCOPES["accuracy"]),
        objective="accuracy",
        min_complete_triplets=1,
        min_accuracy_delta=0.0,
        min_accelerate_accuracy_delta=-0.02,
        max_accelerate_loss=0.02,
        min_speedup=1.10,
        require_energy_anchor=True,
        block_downstream_regressions=True,
    )

    assert gate["status"] == "hold_local"
    assert any("energy_volume anchor must improve" in blocker for blocker in gate["blockers"])


def test_physical_error_reduction_can_win_even_when_raw_score_decreases(tmp_path: Path) -> None:
    run_dir = tmp_path / "run"
    write_cell(run_dir, variant_id="baseline", accuracy=0.4116, error=0.4116, speed=10.0)
    write_cell(run_dir, variant_id="distill_accuracy", accuracy=0.2038, error=0.2038, speed=9.0)

    triplets = promotion.group_triplets(
        promotion.load_cells(run_dir),
        promotion.VARIANT_SCOPES["accuracy"],
    )
    gate = promotion.evaluate_gate(
        triplets,
        objective="accuracy",
        min_complete_triplets=1,
        min_accuracy_delta=0.0,
        min_accelerate_accuracy_delta=-0.02,
        max_accelerate_loss=0.02,
        min_speedup=1.10,
        require_energy_anchor=True,
        block_downstream_regressions=True,
    )

    assert gate["status"] == "promote_to_gcp_canary"
    assert gate["mean_distill_accuracy_delta"] == pytest.approx(0.2078)
    assert triplets[0]["primary_error_delta_distill"] == pytest.approx(0.2078)
    assert triplets[0]["accuracy_score_delta_distill"] == pytest.approx(-0.2078)


def test_promotion_gate_requires_energy_anchor_before_downstream_motivation(tmp_path: Path) -> None:
    run_dir = tmp_path / "run"
    write_cell(
        run_dir,
        variant_id="baseline",
        row_id="forces",
        primary_metric="force_rmse_ev_per_angstrom",
        accuracy=0.70,
        speed=10.0,
    )
    write_cell(
        run_dir,
        variant_id="distill_accuracy",
        row_id="forces",
        primary_metric="force_rmse_ev_per_angstrom",
        accuracy=0.80,
        speed=9.0,
    )

    gate = promotion.evaluate_gate(
        promotion.group_triplets(promotion.load_cells(run_dir), promotion.VARIANT_SCOPES["accuracy"]),
        objective="accuracy",
        min_complete_triplets=1,
        min_accuracy_delta=0.0,
        min_accelerate_accuracy_delta=-0.02,
        max_accelerate_loss=0.02,
        min_speedup=1.10,
        require_energy_anchor=True,
        block_downstream_regressions=True,
    )

    assert gate["status"] == "hold_local"
    assert gate["state_hypothesis"]["verdict"] == "insufficient_energy_anchor"
    assert any("energy_volume anchor triplet is required" in blocker for blocker in gate["blockers"])


def test_canaries_skip_numerically_neutral_downstream_rows(tmp_path: Path) -> None:
    run_dir = tmp_path / "run"
    write_cell(run_dir, variant_id="baseline", row_id="energy_volume", accuracy=0.0, error=0.40, speed=10.0)
    write_cell(run_dir, variant_id="distill_accuracy", row_id="energy_volume", accuracy=0.0, error=0.20, speed=9.0)
    write_cell(
        run_dir,
        variant_id="baseline",
        row_id="relaxation_stability",
        primary_metric="relaxation_stability_penalty",
        accuracy=0.0,
        error=0.56,
        speed=3.0,
    )
    write_cell(
        run_dir,
        variant_id="distill_accuracy",
        row_id="relaxation_stability",
        primary_metric="relaxation_stability_penalty",
        accuracy=0.0,
        error=0.38,
        speed=2.0,
    )
    write_cell(
        run_dir,
        variant_id="baseline",
        row_id="stress",
        primary_metric="stress_mae_gpa",
        accuracy=0.0,
        error=0.5669407405,
        speed=10.0,
    )
    write_cell(
        run_dir,
        variant_id="distill_accuracy",
        row_id="stress",
        primary_metric="stress_mae_gpa",
        accuracy=0.0,
        error=0.5669405228,
        speed=9.0,
    )

    triplets = promotion.group_triplets(
        promotion.load_cells(run_dir),
        promotion.VARIANT_SCOPES["accuracy"],
    )
    state = promotion.evaluate_state_hypothesis(triplets, min_accuracy_delta=0.0)
    canaries = promotion.build_cloud_canaries(
        triplets=triplets,
        backends={"chgnet": {"target_job": "mlip-cell-chgnet"}},
        required_variants=promotion.VARIANT_SCOPES["accuracy"],
        project="proj",
        region="us-central1",
        cloud_run_id="cloud-run",
        manifest_url="gs://inputs/manifest.json",
        support_manifest_url="gs://inputs/support.json",
        artifact_prefix="gs://outputs/mlip",
        worker_url="https://worker.test",
        distill_policy_url=None,
        checkpoint_mode="read-write",
        limit=5,
        min_accuracy_delta=0.0,
    )

    assert state["downstream_win_count"] == 1
    assert [canary["row_id"] for canary in canaries] == ["energy_volume", "relaxation_stability"]
