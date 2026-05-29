from __future__ import annotations

import copy
import json
from pathlib import Path

import mlip_long_demo_registry as registry_tools


def load_default_registry() -> dict:
    return json.loads(registry_tools.DEFAULT_REGISTRY.read_text(encoding="utf-8"))


def test_default_long_demo_registry_is_valid() -> None:
    registry = load_default_registry()

    validation = registry_tools.validate_registry(registry)

    assert validation["status"] == "passed"
    assert validation["errors"] == []
    assert validation["demos_total"] >= 3
    assert validation["claim_policy"]["mock_or_placeholder_allowed"] is False


def test_registry_rejects_claim_without_measured_artifact() -> None:
    registry = load_default_registry()
    bad = copy.deepcopy(registry)
    bad["demos"][0]["claim_gate"]["scientific_claim_allowed"] = True

    validation = registry_tools.validate_registry(bad)

    assert validation["status"] == "failed"
    assert any("scientific claim" in error for error in validation["errors"])


def test_registry_rejects_mock_viewer_artifact() -> None:
    registry = load_default_registry()
    bad = copy.deepcopy(registry)
    bad["demos"][0]["viewer"]["measured_artifacts"] = [
        {
            "schema": "lupine.mlip.md_trajectory.v1",
            "uri": "memory://fake",
            "mock": True,
        }
    ]

    validation = registry_tools.validate_registry(bad)

    assert validation["status"] == "failed"
    assert any("mock/placeholder" in error for error in validation["errors"])


def test_emit_viewer_manifest_round_trips(tmp_path: Path) -> None:
    output = tmp_path / "mlip-long-demo-registry.json"
    rc = registry_tools.main([
        "--registry",
        str(registry_tools.DEFAULT_REGISTRY),
        "--emit-viewer-manifest",
        "--viewer-output",
        str(output),
        "--fail-on-validation-error",
    ])

    emitted = json.loads(output.read_text(encoding="utf-8"))

    assert rc == 0
    assert emitted["schema"] == registry_tools.SCHEMA
    assert emitted["demos"][0]["claim_gate"]["scientific_claim_allowed"] is False
