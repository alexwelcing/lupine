from __future__ import annotations

import mlip_evidence_replay_policy as replay


def test_summarize_replay_promotes_zero_regression_lift() -> None:
    pairs = [
        {
            "baseline_error": 1.0,
            "replayed_distill_error": 0.25,
            "lift_fraction": 0.75,
            "verdict": "distill_improved",
        },
        {
            "baseline_error": 2.0,
            "replayed_distill_error": 2.0,
            "lift_fraction": 0.0,
            "verdict": "unchanged",
        },
    ]

    summary = replay.summarize_replay(pairs)

    assert summary["flagship_eligible"] is True
    assert summary["status"] == "promotable_policy_replay"
    assert summary["pairs_improved"] == 1
    assert summary["pairs_regressed"] == 0


def test_summarize_replay_blocks_regression() -> None:
    summary = replay.summarize_replay(
        [
            {
                "baseline_error": 1.0,
                "replayed_distill_error": 1.2,
                "lift_fraction": -0.2,
                "verdict": "distill_regressed",
            }
        ]
    )

    assert summary["flagship_eligible"] is False
    assert summary["status"] == "blocked_policy_replay"
    assert "no replayed pair may regress" in summary["failed_conditions"]
