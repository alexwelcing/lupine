from __future__ import annotations

import build_ni_publication_fixture as builder
import evaluate_ni_fixture_reference as evaluator


def test_reference_evaluator_scores_fixture_rows() -> None:
    manifest = builder.build_fixture(builder.load_source_packet())
    report = evaluator.evaluate_fixture(manifest)

    assert report["schema"] == "lupine.mlip.ni_fixture_reference_eval.v1"
    assert set(report["rows"]) == {
        "elastic_constants",
        "energy_volume",
        "forces",
        "stress",
        "relaxation_stability",
    }
    assert report["rows"]["energy_volume"]["score"] > 0.99
    assert report["rows"]["forces"]["score"] > 0.99
    assert report["rows"]["stress"]["score"] > 0.99
    assert report["rows"]["elastic_constants"]["metrics"]["primary_metric"] == "elastic_cij_mae_gpa"
