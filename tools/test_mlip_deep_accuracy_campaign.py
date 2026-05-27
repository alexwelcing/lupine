from __future__ import annotations

import json
from pathlib import Path

import mlip_deep_accuracy_campaign as deep


def write_minimal_manifest(path: Path) -> None:
    path.write_text(
        json.dumps(
            {
                "schema": "lupine.mlip.fixture_manifest.v2",
                "fixture_id": "fixture-dev",
                "reference_provenance": {"dev": {"source": "unit-test"}},
                "row_fixtures": {
                    "energy_volume": {"structures": []},
                    "forces": {"structures": []},
                    "stress": {"structures": []},
                    "elastic_constants": {"structures": []},
                    "relaxation_stability": {"structures": []},
                },
            }
        ),
        encoding="utf-8",
    )


def test_prepare_reuse_manifest_writes_25x2x_shard_plan(tmp_path: Path) -> None:
    manifest = tmp_path / "manifest.json"
    write_minimal_manifest(manifest)
    work_dir = tmp_path / "work"

    code = deep.main(
        [
            "prepare",
            "--run-id",
            "deep-test",
            "--work-dir",
            str(work_dir),
            "--reuse-manifest",
            str(manifest),
            "--shards",
            "2",
            "--batch-size",
            "1",
            "--manifest-input-prefix",
            "gs://inputs/deep",
            "--output-prefix",
            "gs://outputs/deep",
        ]
    )

    assert code == 0
    plan = json.loads((work_dir / "campaign_plan.json").read_text(encoding="utf-8"))
    assert plan["cells_total"] == 25 * 2 * 2
    assert plan["batches_total"] == 25 * 2 * 2
    assert plan["budget_gate"] == "pass"
    assert len(plan["manifests"]) == 2
    assert len(plan["batches"]) == 100
    first_batch = json.loads(Path(plan["batches"][0]["local_path"]).read_text(encoding="utf-8"))
    assert first_batch["schema"] == "lupine.mlip.batch_spec.v1"
    assert first_batch["cells"][0]["checkpoint_url"].startswith("gs://outputs/deep/deep-test/checkpoints/")
    assert "NIST-derived cubic elastic anchors rotate through shard manifests" in plan["innovations_smuggled"]


def test_launch_tranche_dry_run_skips_already_launched_batches(tmp_path: Path, capsys) -> None:
    manifest = tmp_path / "manifest.json"
    write_minimal_manifest(manifest)
    work_dir = tmp_path / "work"
    deep.main(
        [
            "prepare",
            "--run-id",
            "deep-test",
            "--work-dir",
            str(work_dir),
            "--reuse-manifest",
            str(manifest),
            "--shards",
            "1",
            "--batch-size",
            "1",
        ]
    )
    capsys.readouterr()
    plan = json.loads((work_dir / "campaign_plan.json").read_text(encoding="utf-8"))
    first_id = plan["batches"][0]["batch_id"]
    ledger = work_dir / "launch_ledger.jsonl"
    ledger.write_text(json.dumps({"batch_id": first_id, "status": "submitted"}) + "\n", encoding="utf-8")

    code = deep.main(
        [
            "launch-tranche",
            "--plan",
            str(work_dir / "campaign_plan.json"),
            "--ledger",
            str(ledger),
            "--limit",
            "2",
            "--mlip",
            "mace-mp-0",
            "--variant",
            "baseline",
            "--row",
            "energy_volume",
            "--dry-run",
        ]
    )

    assert code == 0
    text = capsys.readouterr().out
    output = json.loads(text[text.index("{"):])
    assert output["dry_run"] is True
    assert output["filters"] == {
        "mlip": "mace-mp-0",
        "variant": "baseline",
        "row": "energy_volume",
    }
    assert output["preview"][0]["batch_id"] != first_id
    assert output["preview"][0]["mlip_id"] == "mace-mp-0"
    assert output["preview"][0]["variant_id"] == "baseline"
    assert output["preview"][0]["row_id"] == "energy_volume"


def test_upload_uses_directory_rsync_for_large_campaign(tmp_path: Path, monkeypatch, capsys) -> None:
    manifest = tmp_path / "manifest.json"
    write_minimal_manifest(manifest)
    work_dir = tmp_path / "work"
    deep.main(
        [
            "prepare",
            "--run-id",
            "deep-test",
            "--work-dir",
            str(work_dir),
            "--reuse-manifest",
            str(manifest),
            "--shards",
            "2",
            "--batch-size",
            "1",
            "--manifest-input-prefix",
            "gs://inputs/deep",
        ]
    )
    capsys.readouterr()
    calls = []

    monkeypatch.setattr(deep, "mkdir_gcs_prefix", lambda prefix: calls.append(("mkdir", prefix)))
    monkeypatch.setattr(deep, "rsync_to_gcs", lambda local, remote: calls.append(("rsync", str(local), remote)))
    monkeypatch.setattr(deep, "cp_to_gcs", lambda local, remote: calls.append(("cp", str(local), remote)))

    code = deep.main(["upload", "--plan", str(work_dir / "campaign_plan.json")])

    assert code == 0
    assert calls == [
        ("mkdir", "gs://inputs/deep"),
        ("rsync", str(work_dir / "manifests"), "gs://inputs/deep/deep-test/manifests"),
        ("rsync", str(work_dir / "batches"), "gs://inputs/deep/deep-test/batches"),
        ("cp", str(work_dir / "campaign_plan.json"), "gs://inputs/deep/deep-test/campaign_plan.json"),
    ]
