from __future__ import annotations

import mlip_kimi_evidence as kimi


def test_kimi_evidence_import_validates() -> None:
    summary = kimi.build_summary()

    assert kimi.validate_summary(summary) == []
    agenda = kimi.build_followup_agenda(summary)
    assert kimi.validate_followup_agenda(agenda, summary) == []


def test_cross_mlip_summary_preserves_sentinels() -> None:
    summary = kimi.build_summary()
    cross = summary["cross_mlip"]

    assert cross["elastic_count"] == 45
    assert cross["correlation_count"] == 45
    assert cross["ensemble_pr_count"] == 105
    assert cross["low_correlations"][0]["key"] == "Fe:mace-chgnet"
    assert cross["top_ensemble_pr"][0]["element"] == "Ta"
    assert any(flag["element"] == "Cr" and flag["model"] == "chgnet" for flag in cross["physical_flags"])
    bootstrap = cross["ensemble_pr_bootstrap"]
    assert bootstrap["replicates"] == kimi.BOOTSTRAP_REPLICATES
    assert bootstrap["by_element"]["Ta"]["point_pr"] > 1.3
    assert bootstrap["by_element"]["Fe"]["point_pr"] < 1.1


def test_irrep_decay_is_real_but_threshold_fails() -> None:
    summary = kimi.build_summary()
    irrep = summary["irrep_vandermonde"]

    assert irrep["passes_threshold"] is False
    assert 0.34 <= irrep["rho"] <= 0.42
    assert irrep["r2"] > 0.95


def test_real_early_exit_stays_below_idealized_bound() -> None:
    summary = kimi.build_summary()
    real_exit = summary["real_early_exit"]

    stop1 = real_exit["speedup_by_stop_layer"]["1"]
    assert stop1["mean_speedup"] < real_exit["theoretical_bounds"]["1"]
    assert real_exit["energy_error_by_stop_layer"]["1"]["mae_ev"] > 0.5
    assert real_exit["adaptive"]["median_speedup"] == 1.0


def test_md_interface_mixed_reference_beats_cu_only() -> None:
    summary = kimi.build_summary()
    md = summary["md_interface"]

    assert md["force_correlations"]["layer_0"]["pearson_r"] > 0.5
    assert md["force_correlations"]["total"]["pearson_r"] > 0.45
    mixed_total = md["mixed_reference_best_thresholds"]["total"]
    cu_total = md["element_specific_best_thresholds"]["total"]
    assert mixed_total["youden_j"] > cu_total["youden_j"]
    force_refusal = md["force_calibrated_refusal"]
    assert force_refusal["force_mae_max"] < 1e-9
    assert force_refusal["best_thresholds"]["layer_0"]["youden_j"] > 0.5
    assert "not a production" in force_refusal["caveat"]


def test_followup_agenda_covers_guided_research_lanes() -> None:
    summary = kimi.build_summary()
    agenda = kimi.build_followup_agenda(summary)
    tasks = agenda["tasks"]
    lanes = {task["lane"] for task in tasks}

    assert lanes == {
        "cloud-reproducibility",
        "formal-verification",
        "mlip-md-interface",
        "publication-review",
        "runtime-acceleration",
        "statistical-validation",
    }
    assert tasks[0]["task_id"] == "kimi-20260607-weak-form-lean"
    assert tasks[0]["status"] == "done"
    assert tasks[0]["priority"] == 1
    assert "rho >= 1.5" in tasks[0]["rationale"]
    assert agenda["summary_sentinels"]["lowest_cross_mlip_correlation"]["key"] == "Fe:mace-chgnet"
    statuses = {task["task_id"]: task["status"] for task in tasks}
    assert statuses["kimi-20260607-force-calibrated-refusal"] == "running"
    assert statuses["kimi-20260607-pr-bootstrap"] == "done"
    assert statuses["kimi-20260607-paper3-lean-verification-review"] == "ready_for_review"
    assert statuses["kimi-20260607-paper4-acceleration-review"] == "ready_for_review"


def test_followup_agenda_is_ready_for_control_plane_dispatch() -> None:
    summary = kimi.build_summary()
    agenda = kimi.build_followup_agenda(summary)

    for task in agenda["tasks"]:
        payload = task["control_plane_payload"]
        assert payload["kind"] == "research_question"
        assert payload["id"].startswith("rq_kimi_")
        assert payload["hypothesis_id"].startswith("h_kimi_")
        assert task["evidence_paths"]
        assert task["gates"]
