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


def _patch_gradio_flow(monkeypatch: pytest.MonkeyPatch, post_rec: list[dict[str, Any]],
                       payload: Any) -> None:
    """Stub the Gradio 6.x POST+SSE flow.

    POST returns {"event_id": ...}; GET returns an SSE body whose final
    `data: <json>` line carries `payload`. `_call_gradio` strips a 1-element
    list wrapper if present, so we pass payload as-is.
    """
    import httpx

    class _Resp:
        def __init__(self, data: Any, status: int = 200, text: str | None = None):
            self._data = data
            self.status_code = status
            self.text = text if text is not None else json.dumps(data)

        def json(self) -> Any:
            return self._data

    def fake_post(url: str, json=None, timeout=None, **kw: Any):  # noqa: ARG001
        post_rec.append({"url": url, "json": json})
        return _Resp({"event_id": "evt_test"})

    sse_body = f"event: complete\ndata: {json.dumps(payload)}\n\n"

    def fake_get(url: str, timeout=None, **kw: Any):  # noqa: ARG001
        return _Resp(None, text=sse_body)

    monkeypatch.setattr(httpx, "post", fake_post)
    monkeypatch.setattr(httpx, "get", fake_get)


def test_space_base_resolves_hf_space_subdomain() -> None:
    base = glim_mlip._space_base("https://huggingface.co/spaces/AlexWelcing/glim-mlip-bench")
    assert base == "https://AlexWelcing-glim-mlip-bench.hf.space"


def test_space_base_passes_through_direct_subdomain() -> None:
    base = glim_mlip._space_base("https://AlexWelcing-glim-mlip-bench.hf.space")
    assert base == "https://AlexWelcing-glim-mlip-bench.hf.space"


def test_predict_single(runner: CliRunner, monkeypatch: pytest.MonkeyPatch) -> None:
    rec: list[dict[str, Any]] = []
    payload = [{"element": "Al", "mlip": "chgnet", "c11": 108.0}]
    _patch_gradio_flow(monkeypatch, rec, payload)
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
    _patch_gradio_flow(monkeypatch, rec, [records])
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
    _patch_gradio_flow(monkeypatch, rec, [[{"element": "Al", "c11": 108.0}]])
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
    import httpx
    rec: list[dict[str, Any]] = []

    class _Resp:
        def __init__(self, payload: Any, status: int = 200):
            self._payload = payload
            self.status_code = status
            self.text = json.dumps(payload)

        def json(self) -> Any:
            return self._payload

    def fake_post(url: str, json=None, timeout=None, **kw: Any):  # noqa: ARG001
        rec.append({"url": url, "json": json})
        return _Resp({"ingested": 2, "total": 2})

    monkeypatch.setattr(httpx, "post", fake_post)
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
