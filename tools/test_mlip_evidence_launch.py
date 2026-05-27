from __future__ import annotations

import mlip_evidence_launch as launch


def test_launch_command_uses_batch_spec_url_and_async() -> None:
    campaign = {"project": "shed-489901", "region": "us-central1"}
    batch = {
        "target_job": "mlip-cell-chgnet",
        "batch_spec_gcs_url": "gs://bucket/batch.json",
    }

    command = launch.launch_command(campaign, batch, wait=False)

    assert command[0].endswith("gcloud.cmd") or command[0].endswith("gcloud")
    assert command[1:5] == ["run", "jobs", "execute", "mlip-cell-chgnet"]
    assert "run-batch,--batch-spec-url,gs://bucket/batch.json" in command
    assert "--async" in command


def test_read_launched_ignores_failed_entries(tmp_path) -> None:
    ledger = tmp_path / "ledger.jsonl"
    ledger.write_text(
        '{"batch_id":"a","status":"submitted"}\n'
        '{"batch_id":"b","status":"submit_failed"}\n'
        '{"batch_id":"c","status":"completed"}\n',
        encoding="utf-8",
    )

    assert launch.read_launched(ledger) == {"a", "c"}
