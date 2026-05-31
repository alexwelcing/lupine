from __future__ import annotations

import json

import research_source_registry as registry_tools


def test_materials_research_source_registry_validates() -> None:
    registry = registry_tools.load_registry()
    issues = registry_tools.validate_registry(registry)

    assert issues == []


def test_registry_has_broad_verified_sources() -> None:
    registry = registry_tools.load_registry()
    sources = registry_tools.source_map(registry)

    for source_id in [
        "omat24-aimd-pbe-1000-npt",
        "omat24-aimd-pbe-3000-npt",
        "lemat-traj",
        "gst225-cambridge-gap-trajectories",
        "hpcsd-high-pressure-crystal-structures",
        "mattersim-v1",
        "openkim",
    ]:
        assert source_id in sources
        assert sources[source_id]["verification"]["status"] == "verified_live"


def test_state_phase_ingest_plan_keeps_state_and_phase_sources_distinct() -> None:
    registry = registry_tools.load_registry()
    rows = registry_tools.ingest_plan(
        registry,
        claims={"state_condition_coverage", "phase_change_labels"},
        max_priority=2,
    )

    source_ids = {row["source_id"] for row in rows}
    assert "omat24-aimd-pbe-1000-npt" in source_ids
    assert "omat24-aimd-pbe-3000-npt" in source_ids
    assert "gst225-cambridge-gap-trajectories" in source_ids
    assert "mptrj-materials-project" not in source_ids

    omat_claims = next(row for row in rows if row["source_id"] == "omat24-aimd-pbe-1000-npt")["claim_ids"]
    gst_claims = next(row for row in rows if row["source_id"] == "gst225-cambridge-gap-trajectories")["claim_ids"]
    assert "state_condition_coverage" in omat_claims
    assert "phase_change_labels" not in omat_claims
    assert "phase_change_labels" in gst_claims


def test_phase_reference_requires_phase_label_capability() -> None:
    registry = registry_tools.load_registry()
    broken = json.loads(json.dumps(registry))
    source = next(item for item in broken["sources"] if item["source_id"] == "gst225-cambridge-gap-trajectories")
    source["capabilities"]["phase_label"] = False

    issues = registry_tools.validate_registry(broken)

    assert any("phase_label_reference" in issue for issue in issues)


def test_summary_tracks_ready_queue_and_claims() -> None:
    registry = registry_tools.load_registry()
    summary = registry_tools.registry_summary(registry)

    assert summary["sources_total"] >= 10
    assert summary["verified_sources"] >= 8
    assert summary["claims"]["state_condition_coverage"] >= 2
    assert summary["claims"]["phase_change_labels"] >= 1
    assert summary["ready_queue"][0]["source_id"] == "gst225-cambridge-gap-trajectories"
