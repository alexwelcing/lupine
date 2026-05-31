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


def test_team_queue_decomposes_priority_sources_into_agent_roles() -> None:
    registry = registry_tools.load_registry()
    queue = registry_tools.team_queue(registry, max_priority=2)

    assert queue["schema"] == "lupine.research.source_intake_queue.v1"
    assert queue["counters"]["sources"] >= 6
    assert queue["counters"]["work_units"] >= queue["counters"]["sources"] * 3
    assert {
        "source_inspector",
        "sampler_builder",
        "claim_guardian",
        "fixture_builder",
        "phoenix_reporter",
    }.issubset(queue["counters"]["roles"])

    units = {unit["unit_id"]: unit for unit in queue["work_units"]}
    omat_sampler = units["source-intake:omat24-aimd-pbe-1000-npt:hf_parquet_sampler"]
    gst_import = units["source-intake:gst225-cambridge-gap-trajectories:archive_trajectory_importer"]
    report = units["source-intake:lupine-science:publish-ribbon"]

    assert omat_sampler["role"] == "sampler_builder"
    assert "source-intake:omat24-aimd-pbe-1000-npt:inspect" in omat_sampler["depends_on"]
    assert gst_import["status"] == "queued"
    assert any("Lupine.Science" in output for output in report["outputs"])


def test_targeted_team_queue_preserves_state_phase_boundaries() -> None:
    registry = registry_tools.load_registry()
    queue = registry_tools.team_queue(
        registry,
        claims={"state_condition_coverage", "phase_change_labels"},
        max_priority=2,
    )

    source_ids = {source_id for unit in queue["work_units"] for source_id in unit["source_ids"]}
    assert "omat24-aimd-pbe-1000-npt" in source_ids
    assert "omat24-aimd-pbe-3000-npt" in source_ids
    assert "gst225-cambridge-gap-trajectories" in source_ids
    assert "lemat-traj" not in source_ids

    assemble = next(
        unit for unit in queue["work_units"] if unit["unit_id"] == "source-intake:state-phase-seed-v1:assemble"
    )
    assert assemble["claim_ids"] == ["state_condition_coverage", "phase_change_labels"]
    assert any("separate fields" in check for check in assemble["acceptance_checks"])
    assert "claim_guardian" in queue["counters"]["roles"]
    assert assemble["source_ids"] == [
        "gst225-cambridge-gap-trajectories",
        "omat24-aimd-pbe-1000-npt",
        "omat24-aimd-pbe-3000-npt",
    ]


def test_surface_payload_is_public_ribbon_ready() -> None:
    registry = registry_tools.load_registry()
    payload = registry_tools.surface_payload(registry, max_priority=2)

    assert payload["schema"] == "lupine.research.source_ribbon_surface.v1"
    assert payload["registry_path"] == "data/research_sources/materials_research_sources_v1.json"
    assert payload["summary"]["verified_sources"] >= 8
    assert payload["queue"]["counters"]["work_units"] >= 20
    assert payload["active_sources"][0]["source_id"] == "gst225-cambridge-gap-trajectories"
    assert any(unit["role"] == "phoenix_reporter" for unit in payload["queue"]["priority_units"])
    assert "claim_guardrail" in payload
