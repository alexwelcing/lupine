from __future__ import annotations

import json
from pathlib import Path

import mlip_local_promotion as promotion
import pytest


def write_cell(
    run_dir: Path,
    *,
    variant_id: str,
    row_id: str = "forces",
    mlip_id: str = "chgnet",
    accuracy: float,
    speed: float,
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
            "primary_metric": "force_rmse_ev_per_angstrom",
            "error": 1.0 - accuracy,
        },
        "speed": {"score": speed, "unit": "structures_per_second"},
        "checkpoint": {"mode": "read-write", "loaded_predictions": 0, "written_predictions": 1},
    }
    (artifact_dir / "cell_result.json").write_text(json.dumps(payload), encoding="utf-8")


def test_promotion_gate_promotes_accuracy_win_and_builds_canary_commands(tmp_path: Path) -> None:
    run_dir = tmp_path / "run"
    write_cell(run_dir, variant_id="baseline", accuracy=0.70, speed=10.0)
    write_cell(run_dir, variant_id="distill_accuracy", accuracy=0.76, speed=9.0)
    write_cell(run_dir, variant_id="distill_accuracy_accelerate", accuracy=0.75, speed=12.0)

    cells = promotion.load_cells(run_dir)
    triplets = promotion.group_triplets(cells)
    gate = promotion.evaluate_gate(
        triplets,
        min_complete_triplets=1,
        min_accuracy_delta=0.01,
        min_accelerate_accuracy_delta=0.0,
        max_accelerate_loss=0.02,
        min_speedup=1.10,
    )
    canaries = promotion.build_cloud_canaries(
        triplets=triplets,
        backends={"chgnet": {"target_job": "mlip-cell-chgnet"}},
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
    )

    assert gate["status"] == "promote_to_gcp_canary"
    assert gate["mean_distill_accuracy_delta"] == pytest.approx(0.06)
    assert canaries[0]["target_job"] == "mlip-cell-chgnet"
    command = canaries[0]["commands"]["distill_accuracy"]["powershell"]
    assert "gcloud run jobs execute mlip-cell-chgnet" in command
    assert "--distill-policy-url,gs://policies/v2.json" in command


def test_promotion_gate_holds_when_distill_does_not_improve_accuracy(tmp_path: Path) -> None:
    run_dir = tmp_path / "run"
    write_cell(run_dir, variant_id="baseline", accuracy=0.70, speed=10.0)
    write_cell(run_dir, variant_id="distill_accuracy", accuracy=0.69, speed=9.0)
    write_cell(run_dir, variant_id="distill_accuracy_accelerate", accuracy=0.68, speed=12.0)

    gate = promotion.evaluate_gate(
        promotion.group_triplets(promotion.load_cells(run_dir)),
        min_complete_triplets=1,
        min_accuracy_delta=0.0,
        min_accelerate_accuracy_delta=-0.02,
        max_accelerate_loss=0.02,
        min_speedup=1.10,
    )

    assert gate["status"] == "hold_local"
    assert any("distill_accuracy mean delta" in blocker for blocker in gate["blockers"])
