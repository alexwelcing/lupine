from __future__ import annotations

import mlip_evidence_report as report


def test_report_renders_only_measured_pair_claims() -> None:
    payload = {
        "generated_at": "2026-05-27T00:00:00Z",
        "campaign_id": "c",
        "fixture_hash": "sha256:fixture",
        "artifact_gcs_prefix": "gs://out",
        "batch_gcs_prefix": "gs://in",
        "summary": {
            "cells_total": 2,
            "cells_completed": 2,
            "cells_failed": 0,
            "cells_missing": 0,
            "pairs_total": 1,
            "pairs_measured": 1,
            "pairs_improved": 1,
            "pairs_regressed": 0,
            "promotion_gate": {
                "status": "promotable_accuracy_candidate",
                "flagship_eligible": True,
                "failed_conditions": [],
            },
        },
        "pairs": [
            {
                "row_label": "Energy-volume",
                "mlip_id": "chgnet",
                "baseline_error": 0.4,
                "distill_error": 0.2,
                "lift_fraction": 0.5,
                "verdict": "distill_improved",
            }
        ],
    }

    rendered = report.render(payload)

    assert "flagship-eligible accuracy candidate" in rendered
    assert "**Result:** pass" in rendered
    assert "| Energy-volume | chgnet | 0.4000 | 0.2000 | 50.0% | distill improved |" in rendered
    assert "No missing cell is" in rendered


def test_report_names_negative_transfer_when_regressions_are_only_finding() -> None:
    payload = {
        "generated_at": "2026-05-27T00:00:00Z",
        "campaign_id": "c",
        "fixture_hash": "sha256:fixture",
        "artifact_gcs_prefix": "gs://out",
        "batch_gcs_prefix": "gs://in",
        "summary": {
            "cells_total": 50,
            "cells_completed": 10,
            "cells_failed": 0,
            "cells_missing": 40,
            "pairs_total": 25,
            "pairs_measured": 2,
            "pairs_improved": 0,
            "pairs_regressed": 1,
            "promotion_gate": {
                "status": "blocked_negative_transfer",
                "flagship_eligible": False,
                "failed_conditions": [
                    "no paired comparison may regress",
                    "at least one paired comparison must improve",
                ],
                "next_action": "reject this ribbon for flagship claims",
            },
        },
        "pairs": [
            {
                "row_label": "Energy-volume",
                "mlip_id": "mace",
                "baseline_error": 1.2,
                "distill_error": 1.3,
                "lift_fraction": -0.083,
                "verdict": "distill_regressed",
            },
            {
                "row_label": "Stress",
                "mlip_id": "mace",
                "baseline_error": 0.8,
                "distill_error": 0.8,
                "lift_fraction": 0.0,
                "verdict": "unchanged",
            },
        ],
    }

    rendered = report.render(payload)

    assert "negative-transfer finding" in rendered
    assert "should refuse or adapt" in rendered
    assert "rejected candidate: negative transfer detected" in rendered
    assert "**Result:** blocked" in rendered
