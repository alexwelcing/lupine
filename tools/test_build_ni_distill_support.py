from __future__ import annotations

import json
from pathlib import Path

import build_ni_distill_support as support_builder
import build_ni_publication_fixture as eval_builder


def test_build_ni_support_manifest_is_release_ready_and_non_overlapping() -> None:
    source_packet = eval_builder.load_source_packet()
    support = support_builder.build_support_manifest(source_packet)
    eval_manifest = eval_builder.build_fixture(source_packet)
    validation = eval_builder.validate_manifest(support)

    support_builder.assert_non_overlap(support, eval_manifest)

    assert support["schema"] == "lupine.mlip.fixture_manifest.v2"
    assert support["fixture_id"] == "ni-fcc-eam-distill-support-v1"
    assert validation["release_ready"] is True
    assert validation["row_counts"] == {
        "elastic_constants": 24,
        "energy_volume": 8,
        "forces": 5,
        "stress": 6,
        "relaxation_stability": 4,
    }


def test_support_material_roots_overlap_eval_without_reusing_structure_ids() -> None:
    source_packet = eval_builder.load_source_packet()
    support = support_builder.build_support_manifest(source_packet)
    eval_manifest = eval_builder.build_fixture(source_packet)

    support_ids = {
        case["structure_id"]
        for row in support["row_fixtures"].values()
        for case in row["structures"]
    }
    eval_ids = {
        case["structure_id"]
        for row in eval_manifest["row_fixtures"].values()
        for case in row["structures"]
    }

    assert support_ids.isdisjoint(eval_ids)
    assert {
        case["material_id"]
        for row in support["row_fixtures"].values()
        for case in row["structures"]
    } == {"Ni-fcc-support"}
    assert eval_manifest["metadata"]["material_id"] == "Ni-fcc"


def test_cli_writes_support_manifest(tmp_path: Path) -> None:
    output = tmp_path / "ni_support.json"
    rc = support_builder.main(["--output", str(output)])
    payload = json.loads(output.read_text(encoding="utf-8"))

    assert rc == 0
    assert payload["manifest_hash"].startswith("sha256:")
    assert payload["metadata"]["excluded_eval_fixture"] == "ni-fcc-eam-home-turf-v1"
