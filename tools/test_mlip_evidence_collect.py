from __future__ import annotations

import mlip_evidence_collect as collect
import pytest


def test_compute_pairs_requires_real_baseline_and_distill_errors() -> None:
    cells = [
        {
            "cell_id": "c:baseline:energy:chgnet",
            "row_id": "energy_volume",
            "mlip_id": "chgnet",
            "variant_id": "baseline",
            "status": "completed",
            "native_error": 0.40,
            "checkpoint_url": "gs://bucket/checkpoint.json",
        },
        {
            "cell_id": "c:distill:energy:chgnet",
            "row_id": "energy_volume",
            "mlip_id": "chgnet",
            "variant_id": "distill_accuracy",
            "status": "completed",
            "native_error": 0.25,
            "checkpoint_url": "gs://bucket/checkpoint.json",
        },
    ]

    pairs = collect.compute_pairs(cells)

    assert pairs[0]["verdict"] == "distill_improved"
    assert pairs[0]["error_delta"] == 0.15000000000000002
    assert pairs[0]["lift_fraction"] == pytest.approx(0.375)
    assert pairs[0]["shared_checkpoint_url"] == "gs://bucket/checkpoint.json"


def test_compute_pairs_treats_float_dust_as_unchanged() -> None:
    cells = [
        {
            "cell_id": "c:baseline:forces:mace",
            "row_id": "forces",
            "mlip_id": "mace",
            "variant_id": "baseline",
            "status": "completed",
            "native_error": 0.0825466227819718,
        },
        {
            "cell_id": "c:distill:forces:mace",
            "row_id": "forces",
            "mlip_id": "mace",
            "variant_id": "distill_accuracy",
            "status": "completed",
            "native_error": 0.08254662278197175,
        },
    ]

    pairs = collect.compute_pairs(cells)

    assert pairs[0]["verdict"] == "unchanged"


def test_compute_triplets_marks_kart_win_when_accuracy_and_speed_improve() -> None:
    cells = [
        {
            "cell_id": "c:baseline:energy:chgnet",
            "row_id": "energy_volume",
            "mlip_id": "chgnet",
            "variant_id": "baseline",
            "status": "completed",
            "native_error": 0.40,
            "speed_score": 1.0,
            "checkpoint_url": "gs://bucket/checkpoint.json",
        },
        {
            "cell_id": "c:accuracy:energy:chgnet",
            "row_id": "energy_volume",
            "mlip_id": "chgnet",
            "variant_id": "distill_accuracy",
            "status": "completed",
            "native_error": 0.30,
            "speed_score": 0.80,
            "checkpoint_url": "gs://bucket/checkpoint.json",
        },
        {
            "cell_id": "c:accelerate:energy:chgnet",
            "row_id": "energy_volume",
            "mlip_id": "chgnet",
            "variant_id": "distill_accuracy_accelerate",
            "status": "completed",
            "native_error": 0.305,
            "speed_score": 1.0,
            "checkpoint_url": "gs://bucket/checkpoint.json",
        },
    ]

    triplet = collect.compute_triplets(cells)[0]

    assert triplet["verdict"] == "kart_win"
    assert triplet["accuracy_lift_fraction"] == pytest.approx(0.25)
    assert triplet["accelerate_lift_fraction"] == pytest.approx(0.2375)
    assert triplet["speedup_accelerate_vs_accuracy"] == pytest.approx(1.25)


def test_compute_triplets_blocks_accelerate_accuracy_regression() -> None:
    cells = [
        {
            "cell_id": "c:baseline:stress:orb",
            "row_id": "stress",
            "mlip_id": "orb-v3",
            "variant_id": "baseline",
            "status": "completed",
            "native_error": 1.0,
            "speed_score": 1.0,
        },
        {
            "cell_id": "c:accuracy:stress:orb",
            "row_id": "stress",
            "mlip_id": "orb-v3",
            "variant_id": "distill_accuracy",
            "status": "completed",
            "native_error": 0.50,
            "speed_score": 0.7,
        },
        {
            "cell_id": "c:accelerate:stress:orb",
            "row_id": "stress",
            "mlip_id": "orb-v3",
            "variant_id": "distill_accuracy_accelerate",
            "status": "completed",
            "native_error": 0.53,
            "speed_score": 1.1,
        },
    ]

    triplet = collect.compute_triplets(cells)[0]

    assert triplet["verdict"] == "accelerate_accuracy_regressed"


def test_collect_cell_counts_schema_artifact_without_status_as_completed(monkeypatch: pytest.MonkeyPatch) -> None:
    artifact = {
        "schema": "lupine.mlip.cell_artifact.v1",
        "accuracy": {"score": 0.8, "error": 0.2, "unit": "score", "error_unit": "ev_per_atom"},
        "speed": {"score": 3.0, "unit": "structures_per_second"},
        "checkpoint": {"url": "gs://bucket/checkpoint.json"},
    }
    monkeypatch.setattr(collect, "gcloud_cat", lambda _url: artifact)

    cell = collect.collect_cell(
        {
            "cell_id": "c:baseline:energy:chgnet",
            "row_id": "energy_volume",
            "mlip_id": "chgnet",
            "variant_id": "baseline",
            "target_job": "mlip-cell-chgnet",
            "artifact_prefix": "gs://bucket/cell",
        }
    )

    assert cell["status"] == "completed"
    assert cell["native_error"] == 0.2
    assert cell["error_unit"] == "ev_per_atom"
    assert cell["checkpoint_url"] == "gs://bucket/checkpoint.json"


def test_summarize_keeps_missing_artifacts_out_of_claims() -> None:
    cells = [
        {"status": "completed"},
        {"status": "failed"},
        {"status": "missing"},
    ]
    pairs = [
        {"verdict": "distill_improved"},
        {"verdict": "awaiting_pair"},
    ]

    summary = collect.summarize(cells, pairs)

    assert summary["cells_completed"] == 1
    assert summary["cells_failed"] == 1
    assert summary["cells_missing"] == 1
    assert summary["pairs_improved"] == 1
    assert summary["pairs_measured"] == 1
    assert summary["flagship_eligible"] is False
    assert summary["claim_status"] == "running_or_partial"


def test_promotion_gate_blocks_negative_transfer_on_critical_rows() -> None:
    summary = {
        "cells_total": 2,
        "cells_completed": 2,
        "cells_failed": 0,
        "cells_missing": 0,
        "pairs_total": 1,
        "pairs_measured": 1,
        "pairs_improved": 0,
        "pairs_regressed": 1,
        "pairs_unchanged": 0,
    }
    pairs = [
        {
            "row_id": "energy_volume",
            "mlip_id": "orb-v3",
            "baseline_error": 1.0,
            "distill_error": 1.2,
            "lift_fraction": -0.2,
            "verdict": "distill_regressed",
        }
    ]

    gate = collect.promotion_gate(summary, pairs)

    assert gate["flagship_eligible"] is False
    assert gate["status"] == "blocked_negative_transfer"
    assert "no paired comparison may regress" in gate["failed_conditions"]
    assert gate["critical_regressions"][0]["mlip_id"] == "orb-v3"


def test_promotion_gate_allows_completed_zero_regression_lift() -> None:
    summary = {
        "cells_total": 2,
        "cells_completed": 2,
        "cells_failed": 0,
        "cells_missing": 0,
        "pairs_total": 1,
        "pairs_measured": 1,
        "pairs_improved": 1,
        "pairs_regressed": 0,
        "pairs_unchanged": 0,
    }

    gate = collect.promotion_gate(summary, [{"row_id": "energy_volume", "verdict": "distill_improved"}])

    assert gate["flagship_eligible"] is True
    assert gate["status"] == "promotable_accuracy_candidate"


def test_collect_uses_requested_campaign_scope(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, str] = {}

    def fake_expand(_campaign: dict, scope: str = "full") -> list[dict]:
        seen["scope"] = scope
        return []

    monkeypatch.setattr(collect.campaign_tools, "load_campaign", lambda _path: {
        "campaign_id": "c1",
        "profile": "lab",
        "artifact_gcs_prefix": "gs://out",
        "batch_gcs_prefix": "gs://in",
    })
    monkeypatch.setattr(collect.campaign_tools, "expand_cells", fake_expand)
    monkeypatch.setattr(collect.campaign_tools, "evidence_summary", lambda _campaign: {
        "campaign_hash": "sha256:c",
        "fixture_hash": "sha256:f",
    })

    payload = collect.collect(collect.ROOT / "campaign.json", scope="promotion-canary")

    assert payload["scope"] == "promotion-canary"
    assert seen["scope"] == "promotion-canary"
