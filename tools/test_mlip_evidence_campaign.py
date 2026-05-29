from __future__ import annotations

import json
from pathlib import Path

import mlip_evidence_campaign as evidence


def load_default_campaign() -> dict:
    return evidence.load_campaign(evidence.DEFAULT_CAMPAIGN)


def test_default_evidence_campaign_validates() -> None:
    campaign = load_default_campaign()

    assert evidence.validate_campaign(campaign) == []


def test_evidence_campaign_expands_to_paired_5x5x2_cells() -> None:
    campaign = load_default_campaign()
    cells = evidence.expand_cells(campaign)

    assert len(cells) == 50
    assert len([cell for cell in cells if cell["variant_id"] == "baseline"]) == 25
    assert len([cell for cell in cells if cell["variant_id"] == "distill_accuracy"]) == 25

    for distill in [cell for cell in cells if cell["variant_id"] == "distill_accuracy"]:
        baseline = next(cell for cell in cells if cell["cell_id"] == distill["depends_on_cell_id"])
        assert baseline["variant_id"] == "baseline"
        assert baseline["row_id"] == distill["row_id"]
        assert baseline["mlip_id"] == distill["mlip_id"]
        assert baseline["checkpoint_url"] == distill["checkpoint_url"]
        assert baseline["checkpoint_mode"] == "read-write"
        assert distill["checkpoint_mode"] == "read-only"
        assert distill["support_manifest_url"].startswith("gs://")
        assert distill["distill_policy_url"].startswith("gs://")
        assert distill["distill_policy_hash"].startswith("sha256:")


def test_promotion_canary_expands_before_full_5x5() -> None:
    campaign = load_default_campaign()
    cells = evidence.expand_cells(campaign, scope="promotion-canary")
    batches = evidence.expand_batches(campaign, scope="promotion-canary")

    assert len(cells) == 12
    assert {cell["row_id"] for cell in cells} == {"energy_volume", "relaxation_stability"}
    assert {cell["mlip_id"] for cell in cells} == {"mace-mp-0", "chgnet", "orb-v3"}
    assert all(":promotion-canary:" in cell["cell_id"] for cell in cells)
    assert all("/promotion-canary/" in cell["artifact_prefix"] for cell in cells)
    assert all("/promotion-canary/checkpoints/" in cell["checkpoint_url"] for cell in cells)
    assert {batch["scope"] for batch in batches} == {"promotion-canary"}
    assert all("/canary/" in batch["batch_spec_gcs_url"] for batch in batches)
    assert all("/promotion-canary/batches/" in batch["batch_artifact_prefix"] for batch in batches)


def test_evidence_batches_group_one_cloud_run_execution_per_mlip() -> None:
    campaign = load_default_campaign()
    batches = evidence.expand_batches(campaign)

    assert len(batches) == 5
    assert {batch["mlip_id"] for batch in batches} == {"mace-mp-0", "chgnet", "m3gnet", "orb-v3", "sevennet"}
    for batch in batches:
        assert batch["schema"] == "lupine.mlip.batch_spec.v1"
        assert len(batch["cells"]) == 10
        assert len({cell["mlip_id"] for cell in batch["cells"]}) == 1
        assert [cell["variant_id"] for cell in batch["cells"]][0:2] == ["baseline", "distill_accuracy"]
        assert batch["target_job"].startswith("mlip-cell-")
        assert batch["batch_spec_gcs_url"].startswith("gs://")


def test_non_ni_campaign_preserves_fixture_id_in_batches() -> None:
    campaign = evidence.load_campaign(
        evidence.ROOT
        / "data"
        / "mlip_benchmarks"
        / "evidence_campaigns"
        / "mptrj_lane_b_paired_accuracy_v1.json"
    )

    assert evidence.validate_campaign(campaign) == []
    batches = evidence.expand_batches(campaign, scope="promotion-canary")

    assert len(batches) == 4
    assert {batch["mlip_id"] for batch in batches} == {"mace-mp-0", "chgnet", "orb-v3", "sevennet"}
    assert {batch["fixture_id"] for batch in batches} == {"canonical-structures-v2"}
    assert all(
        cell["campaign_id"] == "mptrj-dft-broad-paired-accuracy-v1"
        for batch in batches
        for cell in batch["cells"]
    )


def test_kart_race_campaign_expands_to_three_lanes() -> None:
    campaign = evidence.load_campaign(
        evidence.ROOT
        / "data"
        / "mlip_benchmarks"
        / "evidence_campaigns"
        / "mptrj_lane_b_kart_race_v1.json"
    )

    assert evidence.validate_campaign(campaign) == []
    cells = evidence.expand_cells(campaign)
    batches = evidence.expand_batches(campaign)
    canary_cells = evidence.expand_cells(campaign, scope="promotion-canary")

    assert len(cells) == 60
    assert len(canary_cells) == 24
    assert evidence.evidence_summary(campaign)["distill_accuracy_accelerate_cells"] == 20
    assert {batch["mlip_id"] for batch in batches} == {"mace-mp-0", "chgnet", "orb-v3", "sevennet"}
    assert all(len(batch["cells"]) == 15 for batch in batches)
    for row_id in campaign["rows"]:
        for mlip_id in {"mace-mp-0", "chgnet", "orb-v3", "sevennet"}:
            lane_order = [
                cell["variant_id"]
                for cell in cells
                if cell["row_id"] == row_id and cell["mlip_id"] == mlip_id
            ]
            assert lane_order == ["baseline", "distill_accuracy", "distill_accuracy_accelerate"]
    for distill in [cell for cell in cells if cell["variant_id"] != "baseline"]:
        baseline = next(cell for cell in cells if cell["cell_id"] == distill["depends_on_cell_id"])
        assert baseline["variant_id"] == "baseline"
        assert baseline["checkpoint_url"] == distill["checkpoint_url"]
        assert distill["checkpoint_mode"] == "read-only"


def test_write_batches_materializes_runner_compatible_specs(tmp_path: Path) -> None:
    campaign = load_default_campaign()

    written = evidence.write_batches(campaign, tmp_path)

    assert len(written) == 5
    first = json.loads(Path(written[0]["local_path"]).read_text(encoding="utf-8"))
    assert "batch_spec_gcs_url" not in first
    assert first["schema"] == "lupine.mlip.batch_spec.v1"
    assert first["defaults"]["beat_emit_url"].endswith("/feed/beats")
    assert first["cells"][0]["checkpoint_mode"] == "read-write"
    assert first["cells"][1]["checkpoint_mode"] == "read-only"


def test_command_generation_emits_upload_and_run_batch_commands() -> None:
    campaign = load_default_campaign()
    upload = evidence.command_rows(campaign, "upload", None, evidence.DEFAULT_BATCH_DIR, wait=False)
    run = evidence.command_rows(campaign, "run-batch", 2, evidence.DEFAULT_BATCH_DIR, wait=True)
    canary_run = evidence.command_rows(
        campaign,
        "run-batch",
        None,
        evidence.DEFAULT_BATCH_DIR,
        wait=True,
        scope="promotion-canary",
    )
    canary_upload = evidence.command_rows(
        campaign,
        "upload",
        None,
        evidence.DEFAULT_BATCH_DIR,
        wait=False,
        scope="promotion-canary",
    )

    assert any("ni_fcc_eam_home_turf_v1.json" in command for command in upload)
    assert any("accuracy_policy_registry" not in command and "hyperribbon" in command for command in upload)
    assert len(run) == 2
    assert all(command.startswith("gcloud run jobs execute mlip-cell-") for command in run)
    assert all("--wait" in command for command in run)
    assert all("run-batch,--batch-spec-url,gs://" in command for command in run)
    assert len(canary_run) == 3
    assert all("/canary/" in command for command in canary_run)
    assert len([command for command in canary_upload if "/batches/canary/" in command]) == 3
    assert all("promotion-canary.json" in command for command in canary_upload if "/batches/canary/" in command)
    assert not any("paired-accuracy.json" in command for command in canary_upload if "/batches/canary/" in command)
