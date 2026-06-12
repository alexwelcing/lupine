from __future__ import annotations

import mlip_cell_runner as runner
from lupine_distill.fixture_contract import thermodynamic_condition, thermodynamic_condition_coverage


def test_failure_metrics_preserve_phoenix_trace_context() -> None:
    args = runner.parse_args([
        "run-cell",
        "--run-id",
        "run",
        "--cell-id",
        "run:baseline:forces:chgnet",
        "--row-id",
        "forces",
        "--mlip-id",
        "chgnet",
        "--phoenix-trace-id",
        "trace-abc",
        "--phoenix-span-id",
        "span-def",
    ])

    metrics = runner.failure_metrics(args, RuntimeError("synthetic failure"))

    assert metrics["trace_id"] == "trace-abc"
    assert metrics["span_id"] == "span-def"


def test_thermodynamic_condition_coverage_tracks_pressure_heat_and_phase() -> None:
    row_spec = {
        "thermodynamic_thresholds": {
            "low_pressure_gpa_max": 1.0,
            "high_pressure_gpa_min": 20.0,
            "low_temperature_k_max": 400.0,
            "high_temperature_k_min": 1200.0,
        }
    }
    cases = [
        {"pressure_gpa": 0.0, "temperature_k": 300.0, "phase_label": "bcc"},
        {"metadata": {"pressure_gpa": 25.0, "temperature_k": 1500.0, "phase_label": "liquid"}},
    ]
    predictions = [thermodynamic_condition(case, row_spec) for case in cases]

    coverage = thermodynamic_condition_coverage(predictions, row_spec)

    assert coverage["coverage_score"] == 1.0
    assert coverage["has_low_pressure"] is True
    assert coverage["has_high_pressure"] is True
    assert coverage["has_low_temperature"] is True
    assert coverage["has_high_temperature"] is True
    assert coverage["phase_count"] == 2
