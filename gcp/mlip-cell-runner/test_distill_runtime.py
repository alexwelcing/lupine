from __future__ import annotations

import json
import pathlib
import sys

import numpy as np
import pytest
from ase import Atoms
from ase.calculators.calculator import Calculator, all_changes

from lupine_distill_runtime import (
    DistillSession,
    DistillSupportModel,
    InstrumentedCalculator,
    LeakageGuard,
    RustPolicyEngine,
)
from lupine_distill_runtime.events import RuntimeEventLog  # noqa: E402


class MockCalculator(Calculator):
    implemented_properties = ["energy", "forces", "stress"]

    def __init__(self):
        super().__init__()
        self.calls = 0

    def calculate(self, atoms=None, properties=("energy",), system_changes=all_changes):
        super().calculate(atoms, properties, system_changes)
        self.calls += 1
        n = len(atoms)
        self.results = {
            "energy": 2.5 * n,
            "forces": np.ones((n, 3)) * 0.25,
            "stress": np.array([0.1, 0.2, 0.3, 0.0, 0.0, 0.0]),
        }


class StaleSitePropertyCalculator(Calculator):
    implemented_properties = ["energy"]

    def __init__(self):
        super().__init__()
        self.results = {"magmoms": [0.0]}

    def calculate(self, atoms=None, properties=("energy",), system_changes=all_changes):
        assert "magmoms" not in self.results
        super().calculate(atoms, properties, system_changes)
        self.results = {"energy": float(len(atoms))}


def manifest(structure_id: str, offset: float = 0.0):
    return {
        "schema": "lupine.mlip.fixture_manifest.v2",
        "fixture_id": f"fixture-{structure_id}",
        "row_fixtures": {
            "energy_volume": {
                "structures": [
                    {
                        "structure_id": structure_id,
                        "symbols": ["Al"],
                        "positions": [[offset, 0.0, 0.0]],
                        "cell": [[4.0, 0.0, 0.0], [0.0, 4.0, 0.0], [0.0, 0.0, 4.0]],
                        "pbc": True,
                        "reference": {"energy_ev_per_atom": -1.0},
                    }
                ]
            }
        },
    }


def atlas_distill_bin() -> pathlib.Path:
    exe = "atlas-distill.exe" if sys.platform.startswith("win") else "atlas-distill"
    return pathlib.Path(__file__).resolve().parents[2] / "atlas-distill" / "target" / "debug" / exe


def test_leakage_guard_rejects_structural_overlap():
    guard = LeakageGuard(manifest("support-a"), manifest("eval-a"))
    assert guard.overlaps()


def test_leakage_guard_allows_distinct_structures():
    guard = LeakageGuard(manifest("support-a", offset=0.01), manifest("eval-a"))
    assert guard.assert_no_overlap()["passed"] is True


def test_instrumented_calculator_preserves_outputs_and_caches():
    event_log = RuntimeEventLog()
    base = MockCalculator()
    calc = InstrumentedCalculator(base, event_log, cache_enabled=True)
    atoms = Atoms("Al2", positions=[[0, 0, 0], [1, 1, 1]], cell=np.eye(3) * 5, pbc=True)
    atoms.calc = calc

    first = atoms.get_potential_energy()
    atoms2 = atoms.copy()
    atoms2.calc = calc
    second = atoms2.get_potential_energy()
    forces = atoms2.get_forces()

    assert first == second == 5.0
    assert forces.shape == (2, 3)
    assert base.calls == 1
    assert any(event["kind"] == "calculator.cache_hit" for event in event_log.events)


def test_instrumented_calculator_clears_stale_site_results_before_delegate():
    event_log = RuntimeEventLog()
    base = StaleSitePropertyCalculator()
    calc = InstrumentedCalculator(base, event_log)
    atoms = Atoms("Al2", positions=[[0, 0, 0], [1, 1, 1]], cell=np.eye(3) * 5, pbc=True)
    atoms.calc = calc

    assert atoms.get_potential_energy() == 2.0


def test_support_model_applies_energy_delta_without_eval_reference():
    model = DistillSupportModel.fit(
        "energy_volume",
        [
            {
                "energy_ev_per_atom": 2.0,
                "reference": {"energy_ev_per_atom": 1.5},
            },
            {
                "energy_ev_per_atom": 4.0,
                "reference": {"energy_ev_per_atom": 3.5},
            },
        ],
    )
    corrected, interventions = model.correct_prediction({"energy_ev_per_atom": 8.0})

    assert corrected["energy_ev_per_atom"] == 7.5
    assert interventions == [{"action": "delta_correct", "field": "energy_ev_per_atom"}]


def test_support_model_records_global_residual_without_material_overlap():
    model = DistillSupportModel.fit(
        "energy_volume",
        [
            {
                "material_id": "Fe-support",
                "energy_ev_per_atom": 2.0,
                "reference": {"energy_ev_per_atom": 1.8},
            },
            {
                "material_id": "Fe-support",
                "energy_ev_per_atom": 4.0,
                "reference": {"energy_ev_per_atom": 3.8},
            },
        ],
    )

    assert model.correction == {"energy_bias_ev_per_atom": pytest.approx(-0.2)}

    model.gate_for_eval_predictions([{"material_id": "mp-123", "energy_ev_per_atom": 1.0}])

    assert model.correction == {"energy_bias_ev_per_atom": pytest.approx(-0.2)}
    assert model.diagnostics["applicability_gate"] == "passed_global_residual_no_material_overlap"
    assert model.diagnostics["support_eval_distance_proxy"] == 1.0


def test_support_model_allows_overlap_by_chemical_system():
    model = DistillSupportModel.fit(
        "energy_volume",
        [
            {
                "material_id": "Al-support",
                "chemical_system": "Al",
                "energy_ev_per_atom": 2.0,
                "reference": {"energy_ev_per_atom": 1.8},
            },
            {
                "material_id": "Al-support",
                "chemical_system": "Al",
                "energy_ev_per_atom": 4.0,
                "reference": {"energy_ev_per_atom": 3.8},
            },
        ],
    )

    model.gate_for_eval_predictions([
        {"material_id": "mp-123", "chemical_system": "Al", "energy_ev_per_atom": 1.0},
    ])

    assert model.diagnostics["applicability_gate"] == "passed"
    assert model.candidate_correction["energy_bias_ev_per_atom"] == pytest.approx(-0.2)


def test_support_model_emits_rank_aware_residual_ribbon():
    model = DistillSupportModel.fit(
        "stress",
        [
            {
                "energy_ev_per_atom": 0.0,
                "stress_gpa": [1.0, 1.0],
                "reference": {"stress_gpa": [1.1, 0.9]},
            },
            {
                "energy_ev_per_atom": 1.0,
                "stress_gpa": [2.0, 2.0],
                "reference": {"stress_gpa": [2.4, 1.6]},
            },
            {
                "energy_ev_per_atom": 2.0,
                "stress_gpa": [3.0, 3.0],
                "reference": {"stress_gpa": [3.9, 2.1]},
            },
        ],
    )

    ribbon = model.candidate_correction["ribbon_residual_correction_v1"]

    assert ribbon["schema"] == "lupine.distill.ribbon_residual_correction.v1"
    assert ribbon["field"] == "stress_gpa"
    assert ribbon["sample_count"] == 3
    assert ribbon["support_lift_fraction"] > 0.0
    assert model.diagnostics["stress_residual_ribbon_matrix_rank"] >= 1


def test_energy_residual_ribbon_does_not_select_force_features():
    model = DistillSupportModel.fit(
        "energy_volume",
        [
            {
                "energy_ev_per_atom": float(idx),
                "forces_ev_per_angstrom": [[float(idx), 0.0, 0.0], [float(idx), 0.0, 0.0]],
                "stress_gpa": [float(idx), float(idx) * 0.5, 0.0],
                "reference": {"energy_ev_per_atom": float(idx) - 0.1 * idx},
            }
            for idx in range(1, 6)
        ],
    )

    ribbon = model.candidate_correction["ribbon_residual_correction_v1"]

    assert ribbon["field"] == "energy_ev_per_atom"
    assert all(not name.startswith("force_") for name in ribbon["feature_names"])


def test_support_model_emits_projected_subspace_diagnostic():
    model = DistillSupportModel.fit(
        "energy_volume",
        [
            {
                "energy_ev_per_atom": float(idx),
                "stress_gpa": [float(idx), float(idx % 2), float(idx) * 0.25],
                "reference": {"energy_ev_per_atom": float(idx) + (0.3 if idx % 2 else -0.1)},
            }
            for idx in range(1, 7)
        ],
    )

    projected = model.candidate_correction["ribbon_projected_residual_correction_v1"]

    assert projected["schema"] == "lupine.distill.ribbon_projected_residual_correction.v1"
    assert projected["basis_space"] == "feature"
    assert model.diagnostics["energy_subspace_schema"] == "lupine.distill.subspace_diagnostic.v1"
    assert model.diagnostics["energy_subspace_status"] == "fit"
    assert model.diagnostics["energy_complement_residual_fraction"] >= 0.0
    assert model.diagnostics["energy_stiff_axis_residual_fraction"] >= 0.0
    assert model.diagnostics["energy_projection_distance_proxy"] >= 0.0
    assert model.diagnostics["energy_theorem_development_lanes"]


def test_support_model_emits_per_prediction_ribbon_distance():
    model = DistillSupportModel.fit(
        "energy_volume",
        [
            {
                "energy_ev_per_atom": float(idx),
                "stress_gpa": [float(idx), float(idx) * 0.5, 0.0],
                "reference": {"energy_ev_per_atom": float(idx) - 0.1 * idx},
            }
            for idx in range(1, 6)
        ],
    )

    model.gate_for_eval_predictions([{"energy_ev_per_atom": 2.0, "stress_gpa": [2.0, 1.0, 0.0]}])
    distance = model.ribbon_feature_distance_for_prediction(
        {"energy_ev_per_atom": 2.0, "stress_gpa": [2.0, 1.0, 0.0]}
    )

    assert distance is not None
    assert distance >= 0.0
    assert model.diagnostics["ribbon_feature_distance_proxy"] == pytest.approx(distance)


def test_distill_session_can_delegate_policy_to_rust():
    atlas_distill = atlas_distill_bin()
    if not atlas_distill.exists():
        pytest.skip("atlas-distill binary has not been built")
    session = DistillSession(
        profile="accuracy",
        run_id="run",
        cell_id="cell",
        row_id="energy_volume",
        mlip_id="chgnet",
        policy_engine_name="rust",
        atlas_distill_bin=str(atlas_distill),
        ribbon_version="hyperribbon-v1",
    )
    session.support_model = DistillSupportModel(
        row_id="energy_volume",
        correction={},
        diagnostics={"energy_bias_candidate_ev_per_atom": -1.4},
    )

    [prediction] = session.apply_row_policy([{"structure_id": "s", "energy_ev_per_atom": 1.0}])

    assert prediction["energy_ev_per_atom"] == 1.0
    assert prediction["distill"]["policy_engine"] == "rust"
    assert prediction["distill"]["ribbon_version"] == "hyperribbon-v1"
    assert session.policy_batches[0]["prediction_count"] == 1
    assert session.policy_batches[0]["decision_count"] == 1
    assert not any(action["action"].startswith("delta_correct") for action in prediction["distill"]["interventions"])


def test_distill_session_forwards_selected_policy_limits_to_rust(tmp_path):
    atlas_distill = atlas_distill_bin()
    if not atlas_distill.exists():
        pytest.skip("atlas-distill binary has not been built")
    limits_path = tmp_path / "policy_limits.json"
    limits_path.write_text(json.dumps({
        "max_energy_bias_ev_per_atom": 2.0,
        "max_stress_bias_gpa": 25.0,
        "max_force_bias_ev_per_angstrom": 1.0,
        "max_force_norm_ev_per_angstrom": 200.0,
        "max_stress_abs_gpa": 5000.0,
    }), encoding="utf-8")
    session = DistillSession(
        profile="accuracy",
        run_id="run",
        cell_id="cell",
        row_id="energy_volume",
        mlip_id="chgnet",
        policy_engine_name="rust",
        atlas_distill_bin=str(atlas_distill),
        ribbon_version="hyperribbon-v2-local",
        policy_limits_path=str(limits_path),
    )
    session.support_model = DistillSupportModel(
        row_id="energy_volume",
        correction={},
        candidate_correction={"energy_bias_ev_per_atom": -1.4},
        diagnostics={"energy_bias_candidate_ev_per_atom": -1.4},
    )

    [prediction] = session.apply_row_policy([{"structure_id": "s", "energy_ev_per_atom": 1.0}])

    assert prediction["energy_ev_per_atom"] == pytest.approx(-0.4)
    assert any(action["action"] == "delta_correct" for action in prediction["distill"]["interventions"])
    assert session.summary()["policy_limits_path"] == str(limits_path)


def test_rust_policy_engine_batches_decisions():
    atlas_distill = atlas_distill_bin()
    if not atlas_distill.exists():
        pytest.skip("atlas-distill binary has not been built")
    engine = RustPolicyEngine(atlas_distill_bin=str(atlas_distill), ribbon_version="hyperribbon-v1")
    model = DistillSupportModel(
        row_id="energy_volume",
        correction={"energy_bias_ev_per_atom": -0.1},
        diagnostics={"energy_bias_candidate_ev_per_atom": -0.1},
    )

    decisions = engine.decide_many(
        row_id="energy_volume",
        mlip_id="chgnet",
        predictions=[
            {"structure_id": "s1", "energy_ev_per_atom": 1.0},
            {"structure_id": "s2", "energy_ev_per_atom": 2.0},
        ],
        support_model=model,
        contexts=[{"prediction_index": 0}, {"prediction_index": 1}],
    )

    assert [decision.corrected_prediction["energy_ev_per_atom"] for decision in decisions] == [0.9, 1.9]
    assert all(decision.policy_engine == "rust" for decision in decisions)
    assert all(decision.decision_id for decision in decisions)


def test_rust_policy_bridge_does_not_apply_ungated_candidate_correction():
    atlas_distill = atlas_distill_bin()
    if not atlas_distill.exists():
        pytest.skip("atlas-distill binary has not been built")
    engine = RustPolicyEngine(atlas_distill_bin=str(atlas_distill), ribbon_version="hyperribbon-v1")
    model = DistillSupportModel(
        row_id="forces",
        correction={},
        diagnostics={
            "force_correction_gate": "blocked_no_support_lift",
            "force_bias_candidate_ev_per_angstrom": [[0.1, 0.0, 0.0]],
        },
    )

    [decision] = engine.decide_many(
        row_id="forces",
        mlip_id="mace-mp-0",
        predictions=[{"structure_id": "s1", "forces_ev_per_angstrom": [[0.2, 0.0, 0.0]]}],
        support_model=model,
        contexts=[{"prediction_index": 0}],
    )

    assert decision.corrected_prediction["forces_ev_per_angstrom"] == [[0.2, 0.0, 0.0]]
    assert not any(action["action"].startswith("delta_correct") for action in decision.actions)
