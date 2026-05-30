"""Unit tests for the a-priori regime launch filter.

Synthetic campaign + cells (no GCP, no real campaign files) so the gate's
launch-time contract is pinned: baseline always runs, out-of-regime distill is
refused before it can fire, in-regime distill runs, and filter_batches drops the
refused cells without mutating its input.
"""

from __future__ import annotations

import mlip_regime_filter as gate
import pytest
from lupine_distill.regime import RibbonProvenance

RIBBON = RibbonProvenance(
    ribbon_id="lupine-ribbon-v1-mptrj-dft",
    reference_families=frozenset({"mptrj_dft"}),
    fit_rows=frozenset({"energy_volume", "relaxation_stability"}),
    calibration_band={},
)


def _cells(mlip: str = "mace-mp-0") -> list[dict]:
    return [
        {"cell_id": f"c:baseline:energy_volume:{mlip}", "variant_id": "baseline",
         "row_id": "energy_volume", "mlip_id": mlip},
        {"cell_id": f"c:distill_accuracy:energy_volume:{mlip}", "variant_id": "distill_accuracy",
         "row_id": "energy_volume", "mlip_id": mlip},
    ]


@pytest.mark.unit
def test_foreign_campaign_refuses_all_distill() -> None:
    campaign = {"campaign_id": "ni", "reference_family": "mishin_eam"}
    decisions = gate.decide_cells(campaign, _cells(), RIBBON)
    baseline = next(d for d in decisions if d.variant_id == "baseline")
    distill = next(d for d in decisions if d.variant_id == "distill_accuracy")
    assert baseline.runs is True  # checkpoint producer always runs
    assert distill.runs is False
    assert distill.decision == "refuse"
    assert distill.rule == "reference_family_mismatch"


@pytest.mark.unit
def test_home_campaign_runs_distill_on_covered_row() -> None:
    campaign = {"campaign_id": "mptrj", "reference_family": "mptrj_dft"}
    distill = next(d for d in gate.decide_cells(campaign, _cells(), RIBBON) if d.variant_id != "baseline")
    assert distill.runs is True
    assert distill.rule == "in_regime"


@pytest.mark.unit
def test_uncovered_row_reviews_and_defers_by_default() -> None:
    campaign = {"campaign_id": "mptrj", "reference_family": "mptrj_dft"}
    cells = [{"cell_id": "c:distill_accuracy:stress:m", "variant_id": "distill_accuracy",
              "row_id": "stress", "mlip_id": "m"}]
    [d] = gate.decide_cells(campaign, cells, RIBBON)
    assert (d.decision, d.runs) == ("review", False)
    [d2] = gate.decide_cells(campaign, cells, RIBBON, reviews_apply=True)
    assert (d2.decision, d2.runs) == ("review", True)


@pytest.mark.unit
def test_row_reference_override_wins() -> None:
    # Ni elastic compares vs literature C_ij, not EAM — still foreign -> refuse.
    campaign = {"campaign_id": "ni", "reference_family": "mishin_eam",
                "row_reference_families": {"elastic_constants": "literature_cij"}}
    cells = [{"cell_id": "c:distill_accuracy:elastic_constants:m", "variant_id": "distill_accuracy",
              "row_id": "elastic_constants", "mlip_id": "m"}]
    [d] = gate.decide_cells(campaign, cells, RIBBON)
    assert d.decision == "refuse"
    assert gate.campaign_reference_family(campaign, "elastic_constants") == "literature_cij"


@pytest.mark.unit
def test_filter_batches_drops_refused_without_mutating_input() -> None:
    campaign = {"campaign_id": "ni", "reference_family": "mishin_eam"}
    cells = _cells()
    batches = [{"batch_id": "b", "cells": list(cells)}]
    decisions = gate.decide_cells(campaign, cells, RIBBON)
    kept, dropped = gate.filter_batches(batches, decisions)
    assert len(kept) == 1
    assert [c["variant_id"] for c in kept[0]["cells"]] == ["baseline"]  # distill dropped
    assert [c["variant_id"] for c in dropped] == ["distill_accuracy"]
    assert len(batches[0]["cells"]) == 2  # input batch unchanged


@pytest.mark.unit
def test_filter_batches_removes_emptied_batch() -> None:
    # A batch of only refused distill cells disappears entirely.
    campaign = {"campaign_id": "ni", "reference_family": "mishin_eam"}
    cells = [{"cell_id": "c:distill_accuracy:energy_volume:m", "variant_id": "distill_accuracy",
              "row_id": "energy_volume", "mlip_id": "m"}]
    batches = [{"batch_id": "b", "cells": list(cells)}]
    decisions = gate.decide_cells(campaign, cells, RIBBON)
    kept, dropped = gate.filter_batches(batches, decisions)
    assert kept == []
    assert len(dropped) == 1


@pytest.mark.unit
def test_summarize_counts_saved_compute() -> None:
    campaign = {"campaign_id": "ni", "reference_family": "mishin_eam"}
    summary = gate.summarize(gate.decide_cells(campaign, _cells(), RIBBON))
    assert summary["distill_refused"] == 1
    assert summary["refused_compute_cells"] == 1
    assert summary["baseline_cells"] == 1
