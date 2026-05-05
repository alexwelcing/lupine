"""Tests for glim_mlip.py — mocked HTTP, no Space needed."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from click.testing import CliRunner

import glim_mlip


@pytest.fixture
def runner() -> CliRunner:
    return CliRunner()


def _patch_post(monkeypatch: pytest.MonkeyPatch, recorder: list[dict[str, Any]],
                responses: list[dict[str, Any]]) -> None:
    """Stub httpx.post so calls land in `recorder`; responses popped in order."""
    import httpx

    class _Resp:
        def __init__(self, payload: Any, status: int = 200):
            self._payload = payload
            self.status_code = status
            self.text = json.dumps(payload) if not isinstance(payload, str) else payload
        def json(self) -> Any:
            return self._payload

    def fake_post(url: str, json=None, timeout=None, **kw: Any):  # noqa: ARG001
        recorder.append({"url": url, "json": json})
        next_resp = responses.pop(0) if responses else {"payload": {}, "status": 200}
        return _Resp(next_resp.get("payload", {}), next_resp.get("status", 200))

    monkeypatch.setattr(httpx, "post", fake_post)


def test_endpoint_url_resolves_hf_space_subdomain() -> None:
    url = glim_mlip._gradio_endpoint("https://huggingface.co/spaces/AlexWelcing/glim-mlip-bench", "predict")
    assert url == "https://AlexWelcing-glim-mlip-bench.hf.space/run/predict"


def test_endpoint_url_passes_through_direct_subdomain() -> None:
    url = glim_mlip._gradio_endpoint("https://AlexWelcing-glim-mlip-bench.hf.space", "predict_batch")
    assert url == "https://AlexWelcing-glim-mlip-bench.hf.space/run/predict_batch"


def test_predict_single(runner: CliRunner, monkeypatch: pytest.MonkeyPatch) -> None:
    rec: list[dict[str, Any]] = []
    payload = {"data": [{"element": "Al", "mlip": "chgnet", "c11": 108.0}]}
    _patch_post(monkeypatch, rec, [{"payload": payload}])
    result = runner.invoke(glim_mlip.mlip, ["predict", "--element", "Al"])
    assert result.exit_code == 0, result.output
    assert "108.0" in result.output
    assert rec[0]["json"] == {"data": ["Al", "chgnet"]}


def test_batch_with_refs_writes_jsonl(runner: CliRunner, monkeypatch: pytest.MonkeyPatch,
                                       tmp_path: Path) -> None:
    refs = tmp_path / "references.json"
    refs.write_text('{"Al": {"C11": 108.2}}', encoding="utf-8")
    rec: list[dict[str, Any]] = []
    records = [
        {"recordId": "r1", "element": "Al", "property": "C11", "predicted": 110.0,
         "reference": 108.2, "potentialId": "chgnet"},
    ]
    _patch_post(monkeypatch, rec, [{"payload": {"data": [records]}}])
    out = tmp_path / "records.jsonl"
    result = runner.invoke(glim_mlip.mlip, [
        "batch", "--elements", "Al", "--references-from", str(refs), "--out", str(out),
    ])
    assert result.exit_code == 0, result.output
    assert out.exists()
    written = [json.loads(line) for line in out.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert written == records
    assert rec[0]["json"]["data"][0] == "Al"
    assert rec[0]["json"]["data"][2] == '{"Al": {"C11": 108.2}}'


def test_batch_without_refs_prints_to_stdout(runner: CliRunner, monkeypatch: pytest.MonkeyPatch) -> None:
    rec: list[dict[str, Any]] = []
    _patch_post(monkeypatch, rec, [{"payload": {"data": [[{"element": "Al", "c11": 108.0}]]}}])
    result = runner.invoke(glim_mlip.mlip, ["batch", "--elements", "Al"])
    assert result.exit_code == 0, result.output
    assert '"element": "Al"' in result.output


def test_ingest_posts_to_worker(runner: CliRunner, monkeypatch: pytest.MonkeyPatch,
                                  tmp_path: Path) -> None:
    jsonl = tmp_path / "records.jsonl"
    jsonl.write_text(
        '{"recordId": "r1", "element": "Al"}\n'
        '{"recordId": "r2", "element": "Cu"}\n',
        encoding="utf-8",
    )
    rec: list[dict[str, Any]] = []
    _patch_post(monkeypatch, rec, [{"payload": {"ingested": 2, "total": 2}}])
    result = runner.invoke(glim_mlip.mlip, ["ingest", str(jsonl)])
    assert result.exit_code == 0, result.output
    assert "ingested 2 records" in result.output
    assert rec[0]["url"].endswith("/ingest/batch")
    assert len(rec[0]["json"]["records"]) == 2


def test_ingest_empty_jsonl_fails(runner: CliRunner, monkeypatch: pytest.MonkeyPatch,
                                    tmp_path: Path) -> None:
    jsonl = tmp_path / "empty.jsonl"
    jsonl.write_text("", encoding="utf-8")
    result = runner.invoke(glim_mlip.mlip, ["ingest", str(jsonl)])
    assert result.exit_code != 0
    assert "no records" in result.output.lower()


def test_predict_network_error(runner: CliRunner, monkeypatch: pytest.MonkeyPatch) -> None:
    import httpx

    def boom(url: str, json=None, timeout=None, **kw: Any):  # noqa: ARG001
        raise httpx.ConnectError("nope")
    monkeypatch.setattr(httpx, "post", boom)
    result = runner.invoke(glim_mlip.mlip, ["predict", "--element", "Al"])
    assert result.exit_code != 0
    assert "Space unreachable" in result.output
