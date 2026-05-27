from __future__ import annotations

import json
from pathlib import Path

import mlip_cell_runner as runner


def test_run_batch_reuses_one_loaded_calculator_and_continues_after_cell_failure(tmp_path: Path, monkeypatch) -> None:
    spec_path = tmp_path / "batch.json"
    beats_path = tmp_path / "beats.jsonl"
    batch_artifacts = tmp_path / "batch-artifacts"
    spec = {
        "schema": "lupine.mlip.batch_spec.v1",
        "batch_id": "batch-001",
        "run_id": "deep-run",
        "campaign_id": "deep-run",
        "batch_artifact_prefix": str(batch_artifacts),
        "defaults": {
            "manifest_url": str(tmp_path / "manifest.json"),
            "artifact_prefix": str(tmp_path / "artifacts"),
            "local_jsonl": str(beats_path),
            "checkpoint_mode": "off",
        },
        "cells": [
            {
                "cell_id": "deep-run:baseline:energy_volume:mace-mp-0:s000",
                "row_id": "energy_volume",
                "mlip_id": "mace-mp-0",
                "variant_id": "baseline",
            },
            {
                "cell_id": "deep-run:baseline:energy_volume:mace-mp-0:s001",
                "row_id": "energy_volume",
                "mlip_id": "mace-mp-0",
                "variant_id": "baseline",
            },
        ],
    }
    spec_path.write_text(json.dumps(spec), encoding="utf-8")
    (tmp_path / "manifest.json").write_text("{}", encoding="utf-8")
    load_calls = []
    cell_calls = []

    monkeypatch.setattr(runner, "load_calculator", lambda mlip_id: load_calls.append(mlip_id) or object())

    def fake_run_cell(args, **kwargs):
        cell_calls.append((args.cell_id, kwargs.get("preloaded_calc") is not None))
        if args.cell_id.endswith("s001"):
            raise RuntimeError("synthetic cell failure")
        return runner.CellResult(
            accuracy_score=0.75,
            accuracy_unit="row_native_physical_score",
            speed_score=1.0,
            speed_unit="structures_per_second",
            artifact_uri=str(tmp_path / "cell_result.json"),
            metrics={
                "run_id": args.run_id,
                "campaign_id": args.campaign_id,
                "cell_id": args.cell_id,
                "row_id": args.row_id,
                "mlip_id": args.mlip_id,
                "variant_id": args.variant_id,
                "status": "completed",
                "accuracy": {"score": 0.75, "unit": "row_native_physical_score"},
                "speed": {"score": 1.0, "unit": "structures_per_second"},
            },
        )

    monkeypatch.setattr(runner, "run_cell", fake_run_cell)

    args = runner.parse_args([
        "run-batch",
        "--batch-spec-url",
        str(spec_path),
        "--local-jsonl",
        str(beats_path),
        "--dev-mode-bypass",
    ])

    summary = runner.run_batch(args)

    assert load_calls == ["mace-mp-0"]
    assert cell_calls == [
        ("deep-run:baseline:energy_volume:mace-mp-0:s000", True),
        ("deep-run:baseline:energy_volume:mace-mp-0:s001", True),
    ]
    assert summary["status"] == "partial"
    assert summary["cells_completed"] == 1
    assert summary["cells_failed"] == 1
    assert (batch_artifacts / "batch_result.json").exists()
    beats = [json.loads(line) for line in beats_path.read_text(encoding="utf-8").splitlines()]
    assert len(beats) == 2
    assert beats[0]["metrics"]["status"] == "completed"
    assert beats[1]["metrics"]["status"] == "failed"


def test_run_batch_refuses_distill_when_baseline_dependency_failed(tmp_path: Path, monkeypatch) -> None:
    spec_path = tmp_path / "batch.json"
    beats_path = tmp_path / "beats.jsonl"
    spec = {
        "schema": "lupine.mlip.batch_spec.v1",
        "batch_id": "batch-002",
        "run_id": "evidence-run",
        "campaign_id": "evidence-run",
        "defaults": {
            "manifest_url": str(tmp_path / "manifest.json"),
            "artifact_prefix": str(tmp_path / "artifacts"),
            "local_jsonl": str(beats_path),
            "checkpoint_mode": "off",
        },
        "cells": [
            {
                "cell_id": "evidence-run:baseline:forces:chgnet",
                "row_id": "forces",
                "mlip_id": "chgnet",
                "variant_id": "baseline",
            },
            {
                "cell_id": "evidence-run:distill_accuracy:forces:chgnet",
                "row_id": "forces",
                "mlip_id": "chgnet",
                "variant_id": "distill_accuracy",
                "depends_on_cell_id": "evidence-run:baseline:forces:chgnet",
            },
        ],
    }
    spec_path.write_text(json.dumps(spec), encoding="utf-8")
    (tmp_path / "manifest.json").write_text("{}", encoding="utf-8")

    monkeypatch.setattr(runner, "load_calculator", lambda mlip_id: object())

    def fake_run_cell(args, **kwargs):
        if args.variant_id == "baseline":
            raise RuntimeError("baseline failed before checkpoint")
        raise AssertionError("distill cell should not execute without its baseline dependency")

    monkeypatch.setattr(runner, "run_cell", fake_run_cell)

    args = runner.parse_args([
        "run-batch",
        "--batch-spec-url",
        str(spec_path),
        "--local-jsonl",
        str(beats_path),
        "--dev-mode-bypass",
    ])

    summary = runner.run_batch(args)

    assert summary["status"] == "partial"
    assert summary["cells_completed"] == 0
    assert summary["cells_failed"] == 2
    assert summary["failed"][1]["error_class"] == "DependencyNotCompleted"
    assert "dependency was not completed" in summary["failed"][1]["error"]
