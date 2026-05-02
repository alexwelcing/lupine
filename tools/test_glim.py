"""Pytest suite for tools/glim.py — every subcommand exercised with mocked HTTP."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from click.testing import CliRunner

import glim


@pytest.fixture
def runner() -> CliRunner:
    return CliRunner()


@pytest.fixture(autouse=True)
def reset_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GLIM_API_URL", raising=False)


def _fake_request_factory(recorder: list[dict[str, Any]], responses: list[dict[str, Any]]):
    """Returns a function that mimics httpx.Client.request()."""

    class _FakeResponse:
        def __init__(self, payload: Any, status: int = 200):
            self._payload = payload
            self.status_code = status
            self.text = json.dumps(payload) if not isinstance(payload, str) else payload
            self.request = type("R", (), {"method": "?", "url": "http://test"})()

        def json(self) -> Any:
            return self._payload

    def fake_request(self, method: str, url: str, **kw: Any) -> _FakeResponse:  # noqa: ARG001
        recorder.append({"method": method, "url": url, "kwargs": kw})
        next_resp = responses.pop(0) if responses else {"payload": {}, "status": 200}
        return _FakeResponse(next_resp.get("payload", {}), next_resp.get("status", 200))

    return fake_request


def _patch_http(monkeypatch: pytest.MonkeyPatch, recorder: list[dict[str, Any]], responses: list[dict[str, Any]]) -> None:
    import httpx
    monkeypatch.setattr(httpx.Client, "request", _fake_request_factory(recorder, responses))


# ---------- ask ----------

def test_ask_posts_question(runner: CliRunner, monkeypatch: pytest.MonkeyPatch) -> None:
    rec: list[dict[str, Any]] = []
    _patch_http(monkeypatch, rec, [{"payload": {"id": "rq1", "status": "open"}}])
    result = runner.invoke(glim.cli, ["ask", "Why does Cu LJ overestimate C44?"])
    assert result.exit_code == 0, result.output
    assert "rq1" in result.output
    assert rec[0]["method"] == "POST"
    assert rec[0]["url"].endswith("/research/questions")
    assert rec[0]["kwargs"]["json"]["question"] == "Why does Cu LJ overestimate C44?"


def test_ask_network_error(runner: CliRunner, monkeypatch: pytest.MonkeyPatch) -> None:
    import httpx
    def boom(self, method: str, url: str, **kw: Any):  # noqa: ARG001
        raise httpx.ConnectError("nope")
    monkeypatch.setattr(httpx.Client, "request", boom)
    result = runner.invoke(glim.cli, ["ask", "test"])
    assert result.exit_code != 0
    assert "Worker unreachable" in result.output


# ---------- critique ----------

def test_critique_queue_from_file(runner: CliRunner, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    f = tmp_path / "c.md"
    f.write_text("# Test critique header\n\nBody text.", encoding="utf-8")
    rec: list[dict[str, Any]] = []
    _patch_http(monkeypatch, rec, [{"payload": {"id": "c1"}}])
    result = runner.invoke(glim.cli, ["critique", "queue", str(f)])
    assert result.exit_code == 0, result.output
    body = rec[0]["kwargs"]["json"]
    assert body["question"] == "Test critique header"
    assert body["source"] == "c"


def test_critique_pending_renders_table(runner: CliRunner, monkeypatch: pytest.MonkeyPatch) -> None:
    payload = [
        {"id": "c1", "source": "critique11", "question": "Q1", "status": "pending", "target_hypothesis_id": "h1"},
        {"id": "c2", "source": "critique11", "question": "Q2", "status": "pending", "target_hypothesis_id": "h2"},
    ]
    _patch_http(monkeypatch, [], [{"payload": payload}])
    result = runner.invoke(glim.cli, ["critique", "pending"])
    assert result.exit_code == 0, result.output
    assert "c1" in result.output and "c2" in result.output
    assert "Q1" in result.output


def test_critique_pending_empty(runner: CliRunner, monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_http(monkeypatch, [], [{"payload": []}])
    result = runner.invoke(glim.cli, ["critique", "pending"])
    assert result.exit_code == 0
    assert "no pending critiques" in result.output


def test_critique_respond_uploads_markdown(runner: CliRunner, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    f = tmp_path / "resp.md"
    f.write_text("# Response", encoding="utf-8")
    rec: list[dict[str, Any]] = []
    _patch_http(monkeypatch, rec, [{"payload": {"status": "completed"}}])
    result = runner.invoke(glim.cli, ["critique", "respond", "c1", str(f), "--agent-id", "tester"])
    assert result.exit_code == 0, result.output
    body = rec[0]["kwargs"]["json"]
    assert body["response_md"] == "# Response"
    assert body["agent_id"] == "tester"


# ---------- hypothesis ----------

def test_hypothesis_list_renders_table(runner: CliRunner, monkeypatch: pytest.MonkeyPatch) -> None:
    payload = [{"id": "h1_hyperribbon", "title": "Hyper-ribbon", "status": "testing", "confidence": 0.8}]
    _patch_http(monkeypatch, [], [{"payload": payload}])
    result = runner.invoke(glim.cli, ["hypothesis", "list"])
    assert result.exit_code == 0, result.output
    assert "h1_hyperribbon" in result.output
    assert "testing" in result.output


def test_hypothesis_update_patches(runner: CliRunner, monkeypatch: pytest.MonkeyPatch) -> None:
    rec: list[dict[str, Any]] = []
    _patch_http(monkeypatch, rec, [{"payload": {"status": "confirmed"}}])
    result = runner.invoke(glim.cli, ["hypothesis", "update", "h1", "--status", "confirmed", "--confidence", "0.95"])
    assert result.exit_code == 0, result.output
    assert rec[0]["method"] == "PATCH"
    assert rec[0]["kwargs"]["json"] == {"status": "confirmed", "confidence": 0.95}


def test_hypothesis_update_requires_field(runner: CliRunner, monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_http(monkeypatch, [], [{"payload": {}}])
    result = runner.invoke(glim.cli, ["hypothesis", "update", "h1"])
    assert result.exit_code != 0
    assert "at least one" in result.output.lower()


# ---------- run ----------

def test_run_posts_payload(runner: CliRunner, monkeypatch: pytest.MonkeyPatch) -> None:
    rec: list[dict[str, Any]] = []
    _patch_http(monkeypatch, rec, [{"payload": {"manifold": {}}}])
    result = runner.invoke(glim.cli, ["run", "--element", "Al", "--analysis", "manifold"])
    assert result.exit_code == 0, result.output
    body = rec[0]["kwargs"]["json"]
    assert body == {"analysis_types": ["manifold"], "element": "Al"}


# ---------- fleet ----------

def test_fleet_run_with_elements(runner: CliRunner, monkeypatch: pytest.MonkeyPatch) -> None:
    rec: list[dict[str, Any]] = []
    _patch_http(monkeypatch, rec, [{"payload": {"job_id": "f1"}}])
    result = runner.invoke(glim.cli, ["fleet", "run", "--elements", "Al,Cu"])
    assert result.exit_code == 0, result.output
    assert rec[0]["kwargs"]["json"]["elements"] == ["Al", "Cu"]


# ---------- watch ----------

def test_watch_once_prints_new_entries(runner: CliRunner, monkeypatch: pytest.MonkeyPatch) -> None:
    payload = {"experiments": [{"experiment_id": "exp_1", "element": "Al", "potential_label": "lj"}]}
    _patch_http(monkeypatch, [], [{"payload": payload}])
    result = runner.invoke(glim.cli, ["watch", "--once"])
    assert result.exit_code == 0, result.output
    assert "exp_1" in result.output


# ---------- dispatch-critique11 ----------

def test_dispatch_critique11_dry_run(runner: CliRunner, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    f = tmp_path / "critique11.md"
    f.write_text("# c11", encoding="utf-8")
    _patch_http(monkeypatch, [], [])
    result = runner.invoke(glim.cli, ["dispatch-critique11", "--file", str(f), "--dry-run"])
    assert result.exit_code == 0, result.output
    for gap in glim.CRITIQUE11_GAPS:
        assert gap["id"] in result.output


def test_dispatch_critique11_posts_all_four(runner: CliRunner, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    f = tmp_path / "critique11.md"
    f.write_text("# c11", encoding="utf-8")
    rec: list[dict[str, Any]] = []
    _patch_http(monkeypatch, rec, [{"payload": {"id": g["id"]}} for g in glim.CRITIQUE11_GAPS])
    result = runner.invoke(glim.cli, ["dispatch-critique11", "--file", str(f)])
    assert result.exit_code == 0, result.output
    assert len(rec) == len(glim.CRITIQUE11_GAPS)
    for sent, gap in zip(rec, glim.CRITIQUE11_GAPS):
        assert sent["url"].endswith("/critiques")
        assert sent["kwargs"]["json"]["id"] == gap["id"]
    assert f"dispatched {len(glim.CRITIQUE11_GAPS)}/{len(glim.CRITIQUE11_GAPS)}" in result.output


def test_dispatch_critique11_skips_failures(runner: CliRunner, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    f = tmp_path / "critique11.md"
    f.write_text("# c11", encoding="utf-8")
    rec: list[dict[str, Any]] = []
    responses = [
        {"payload": {"id": glim.CRITIQUE11_GAPS[0]["id"]}, "status": 200},
        {"payload": {"error": "duplicate id"}, "status": 409},
        {"payload": {"id": glim.CRITIQUE11_GAPS[2]["id"]}, "status": 200},
        {"payload": {"id": glim.CRITIQUE11_GAPS[3]["id"]}, "status": 200},
    ]
    _patch_http(monkeypatch, rec, responses)
    result = runner.invoke(glim.cli, ["dispatch-critique11", "--file", str(f)])
    assert result.exit_code == 0, result.output
    assert "skip" in result.output
    assert "dispatched 3/4" in result.output


# ---------- openapi ----------

def test_openapi_prints_spec(runner: CliRunner, monkeypatch: pytest.MonkeyPatch) -> None:
    spec = {"openapi": "3.1.0", "info": {"title": "glim-think"}}
    _patch_http(monkeypatch, [], [{"payload": spec}])
    result = runner.invoke(glim.cli, ["openapi"])
    assert result.exit_code == 0, result.output
    assert '"openapi": "3.1.0"' in result.output


# ---------- api-url override ----------

def test_api_url_override(runner: CliRunner, monkeypatch: pytest.MonkeyPatch) -> None:
    rec: list[dict[str, Any]] = []
    _patch_http(monkeypatch, rec, [{"payload": []}])
    result = runner.invoke(glim.cli, ["--api-url", "http://custom:9999", "hypothesis", "list"])
    assert result.exit_code == 0, result.output
    assert rec[0]["url"].startswith("http://custom:9999")
