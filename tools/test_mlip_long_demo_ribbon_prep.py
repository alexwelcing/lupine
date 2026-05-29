from __future__ import annotations

import copy
import json
from pathlib import Path

import mlip_long_demo_registry
import mlip_long_demo_ribbon_prep as prep_tools


def load_default_prep() -> dict:
    return json.loads(prep_tools.DEFAULT_PREP.read_text(encoding="utf-8"))


def load_default_registry() -> dict:
    return json.loads(mlip_long_demo_registry.DEFAULT_REGISTRY.read_text(encoding="utf-8"))


def test_default_ribbon_prep_is_valid() -> None:
    prep = load_default_prep()
    registry = load_default_registry()

    validation = prep_tools.validate_ribbon_prep(prep, registry)

    assert validation["status"] == "passed"
    assert validation["errors"] == []
    assert validation["ribbons_total"] == 3
    assert validation["shadow_ready_ribbons"] >= 2


def test_ribbon_prep_requires_demo_registry_match() -> None:
    prep = load_default_prep()
    registry = load_default_registry()
    bad = copy.deepcopy(prep)
    bad["ribbons"][0]["demo_id"] = "not-in-registry"

    validation = prep_tools.validate_ribbon_prep(bad, registry)

    assert validation["status"] == "failed"
    assert any("does not exist" in error for error in validation["errors"])
    assert any("missing ribbon prep" in error for error in validation["errors"])


def test_ribbon_prep_blocks_active_correction_without_reference_lock() -> None:
    prep = load_default_prep()
    registry = load_default_registry()
    bad = copy.deepcopy(prep)
    bad["ribbons"][0]["science_contract"]["reference_lock"]["required_before_active_correction"] = False

    validation = prep_tools.validate_ribbon_prep(bad, registry)

    assert validation["status"] == "failed"
    assert any("reference lock before active correction" in error for error in validation["errors"])


def test_ribbon_prep_requires_measured_viewer_scene_rule() -> None:
    prep = load_default_prep()
    registry = load_default_registry()
    bad = copy.deepcopy(prep)
    bad["ribbons"][0]["viewer_contract"]["scene_rule"] = "Render a planned vacancy animation."

    validation = prep_tools.validate_ribbon_prep(bad, registry)

    assert validation["status"] == "failed"
    assert any("measured rendering" in error for error in validation["errors"])


def test_emit_viewer_manifest_round_trips(tmp_path: Path) -> None:
    output = tmp_path / "mlip-long-demo-ribbon-prep.json"

    rc = prep_tools.main([
        "--prep",
        str(prep_tools.DEFAULT_PREP),
        "--registry",
        str(mlip_long_demo_registry.DEFAULT_REGISTRY),
        "--emit-viewer-manifest",
        "--viewer-output",
        str(output),
        "--fail-on-validation-error",
    ])
    emitted = json.loads(output.read_text(encoding="utf-8"))

    assert rc == 0
    assert emitted["schema"] == prep_tools.SCHEMA
    assert emitted["ribbons"][0]["ribbon_id"].startswith("hyperribbon-long-")
