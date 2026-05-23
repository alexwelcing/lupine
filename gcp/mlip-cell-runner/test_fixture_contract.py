from __future__ import annotations

import numpy as np
from fixture_contract import evaluate_row, validate_manifest


def test_validate_manifest_rejects_legacy_smoke_fixture() -> None:
    manifest = {
        "schema": "lupine.mlip.fixture_manifest.v1",
        "fixture_id": "tiny-local-smoke",
        "structures": [
            {
                "structure_id": "Al-fcc-primitive",
                "symbols": ["Al"],
                "positions": [[0.0, 0.0, 0.0]],
                "reference": {"forces": [[0.0, 0.0, 0.0]]},
            }
        ],
    }

    validation = validate_manifest(manifest)

    assert validation["release_ready"] is False
    assert any("fixture_manifest.v2" in blocker for blocker in validation["blockers"])
    assert any("nonzero reference forces" in blocker for blocker in validation["blockers"])


def test_force_score_uses_absolute_rmse_not_relative_zero_denominator() -> None:
    predictions = [
        {
            "forces_ev_per_angstrom": [[0.11, 0.0, 0.0], [0.0, -0.09, 0.0]],
            "reference": {"forces_ev_per_angstrom": [[0.10, 0.0, 0.0], [0.0, -0.10, 0.0]]},
        }
    ]

    score, unit, metrics = evaluate_row("forces", predictions, {"error_tolerance": 0.20})

    assert unit == "row_native_physical_score"
    assert metrics["primary_metric"] == "force_rmse_ev_per_angstrom"
    assert np.isclose(metrics["error"], np.sqrt((0.01**2 + 0.01**2) / 6))
    assert score > 0.95


def test_elastic_score_fits_finite_strain_stress_response() -> None:
    reference = {
        "C11": 100.0,
        "C22": 100.0,
        "C33": 100.0,
        "C44": 40.0,
        "C55": 40.0,
        "C66": 40.0,
    }
    strains = np.eye(6) * 0.01
    c = np.diag([100.0, 100.0, 100.0, 40.0, 40.0, 40.0])
    predictions = [
        {
            "strain_voigt": strain.tolist(),
            "stress_gpa": (c @ strain).tolist(),
            "reference": {"elastic_constants_gpa": reference},
        }
        for strain in strains
    ]

    score, unit, metrics = evaluate_row("elastic_constants", predictions, {"error_tolerance": 50.0})

    assert unit == "row_native_physical_score"
    assert metrics["primary_metric"] == "elastic_cij_mae_gpa"
    assert metrics["error"] < 1e-9
    assert np.isclose(score, 1.0)


def test_elastic_score_groups_materials_against_their_own_references() -> None:
    strains = [np.zeros(6), *(np.eye(6) * 0.01)]
    materials = {
        "Al": {
            "reference": {"C11": 100.0, "C22": 100.0, "C33": 100.0},
            "matrix": np.diag([100.0, 100.0, 100.0, 40.0, 40.0, 40.0]),
        },
        "Mo": {
            "reference": {"C11": 400.0, "C22": 400.0, "C33": 400.0},
            "matrix": np.diag([400.0, 400.0, 400.0, 90.0, 90.0, 90.0]),
        },
    }
    predictions = [
        {
            "material_id": material_id,
            "strain_voigt": strain.tolist(),
            "stress_gpa": (payload["matrix"] @ strain).tolist(),
            "reference": {"elastic_constants_gpa": payload["reference"]},
        }
        for material_id, payload in materials.items()
        for strain in strains
    ]

    score, _, metrics = evaluate_row("elastic_constants", predictions, {"error_tolerance": 50.0})

    assert np.isclose(score, 1.0)
    assert metrics["error"] < 1e-9
    assert set(metrics["elastic_constants_gpa_by_material"]) == {"Al", "Mo"}
    assert metrics["elastic_errors_by_material"]["Al"] < 1e-9
    assert metrics["elastic_errors_by_material"]["Mo"] < 1e-9


def test_elastic_fit_is_intercept_aware_for_residual_stress_offsets() -> None:
    reference = {"C11": 120.0, "C22": 90.0, "C33": 80.0}
    c = np.diag([120.0, 90.0, 80.0, 35.0, 35.0, 35.0])
    residual_stress = np.asarray([2.5, -1.0, 1.2, 0.4, -0.2, 0.3])
    strains = [np.zeros(6), *(np.eye(6) * 0.01), *(-np.eye(6) * 0.01)]
    predictions = [
        {
            "material_id": "Al",
            "strain_voigt": strain.tolist(),
            "stress_gpa": (residual_stress + c @ strain).tolist(),
            "reference": {"elastic_constants_gpa": reference},
        }
        for strain in strains
    ]

    score, _, metrics = evaluate_row("elastic_constants", predictions, {"error_tolerance": 50.0})

    assert np.isclose(score, 1.0)
    assert metrics["error"] < 1e-9
