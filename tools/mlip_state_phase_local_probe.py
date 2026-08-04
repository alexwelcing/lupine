#!/usr/bin/env python3
"""Build and replay a local diagnostic state/phase MLIP fixture.

The labels created here are plumbing labels for evaluator/tracing debugging.
They are deliberately marked as diagnostic and must not be used as a physics or
phase-change accuracy claim.
"""

from __future__ import annotations

import argparse
import copy
import json
import pathlib
import subprocess
import sys
from collections.abc import Iterable
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNNER_DIR = ROOT / "gcp" / "mlip-cell-runner"
RUNNER = RUNNER_DIR / "mlip_cell_runner.py"
DEFAULT_SOURCE = RUNNER_DIR / "fixtures" / "canonical_structures_v2_mptrj.json"
DEFAULT_OUTPUT = ROOT / "tmp" / "mlip-state-phase-local" / "canonical_state_phase_diagnostic_v1.json"
DEFAULT_RUN_DIR = ROOT / "tmp" / "mlip-state-phase-local"
DEFAULT_FIXTURE_ID = "canonical-structures-v2-state-phase-diagnostic-v1"
CANARY_ROWS = ("energy_volume", "forces", "relaxation_stability")
REPLAY_ROWS = ("energy_volume", "forces", "stress", "relaxation_stability")

sys.path.insert(0, str(RUNNER_DIR))

from lupine_distill.fixture_contract import (  # noqa: E402
    evaluate_row,
    select_row,
    thermodynamic_condition,
    thermodynamic_condition_coverage,
    validate_manifest,
)
from mlip_cell_runner import (  # noqa: E402
    case_cache_key,
    raw_prediction_checkpoint_context,
    sha256_hex,
)

THERMODYNAMIC_THRESHOLDS = {
    "low_pressure_gpa_max": 1.0,
    "high_pressure_gpa_min": 20.0,
    "low_temperature_k_max": 500.0,
    "high_temperature_k_min": 1200.0,
}
STATE_CYCLE = (
    {
        "regime_id": "diagnostic-low-pressure-low-heat",
        "pressure_gpa": 0.1,
        "temperature_k": 300.0,
        "phase_label": "diagnostic-solid-low-pressure-low-heat",
    },
    {
        "regime_id": "diagnostic-high-pressure-high-heat",
        "pressure_gpa": 25.0,
        "temperature_k": 1500.0,
        "phase_label": "diagnostic-hot-dense-phase-surrogate",
    },
)
LABEL_SOURCE = "diagnostic local plumbing labels; not a DFT/MD phase claim"


def load_json(path: pathlib.Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"expected JSON object: {path}")
    return payload


def write_json(path: pathlib.Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def diagnostic_state(row_id: str, case_index: int) -> dict[str, Any]:
    state = copy.deepcopy(STATE_CYCLE[case_index % len(STATE_CYCLE)])
    state["row_id"] = row_id
    state["diagnostic"] = True
    state["label_source"] = LABEL_SOURCE
    return state


def annotate_case(case: dict[str, Any], row_id: str, case_index: int) -> dict[str, Any]:
    out = copy.deepcopy(case)
    state = diagnostic_state(row_id, case_index)
    metadata = out.get("metadata") if isinstance(out.get("metadata"), dict) else {}
    out["metadata"] = {
        **metadata,
        "state_phase_diagnostic": True,
        "state_phase_label_source": LABEL_SOURCE,
        "pressure_gpa": state["pressure_gpa"],
        "temperature_k": state["temperature_k"],
        "phase_label": state["phase_label"],
        "thermodynamic_regime_id": state["regime_id"],
    }
    out["thermodynamic_state"] = state
    out["pressure_gpa"] = state["pressure_gpa"]
    out["temperature_k"] = state["temperature_k"]
    out["phase_label"] = state["phase_label"]
    return out


def build_diagnostic_manifest(
    source: dict[str, Any],
    *,
    fixture_id: str = DEFAULT_FIXTURE_ID,
) -> dict[str, Any]:
    manifest = copy.deepcopy(source)
    source_fixture_id = str(source.get("fixture_id") or "unknown")
    source_hash = source.get("manifest_hash") or "sha256:" + sha256_hex(source)
    manifest["fixture_id"] = fixture_id
    manifest["title"] = "Canonical MPtrj state/phase diagnostic fixture"
    manifest["description"] = (
        "Diagnostic clone of canonical-structures-v2 with pressure/temperature/phase "
        "plumbing labels for local runner, Phoenix, and Lupine Science surfacing checks. "
        "The labels are synthetic diagnostics, not physical phase annotations."
    )
    metadata = manifest.get("metadata") if isinstance(manifest.get("metadata"), dict) else {}
    manifest["metadata"] = {
        **metadata,
        "diagnostic_state_phase_labels": True,
        "not_for_physics_claims": True,
        "source_fixture_id": source_fixture_id,
        "source_manifest_hash": source_hash,
        "state_phase_label_source": LABEL_SOURCE,
        "state_phase_probe_schema": "lupine.mlip.state_phase_local_probe.v1",
    }
    provenance = manifest.get("reference_provenance") if isinstance(manifest.get("reference_provenance"), dict) else {}
    manifest["reference_provenance"] = {
        **provenance,
        "state_phase_diagnostic_labels": {
            "source": LABEL_SOURCE,
            "purpose": "local evaluator and artifact plumbing validation only",
        },
    }
    row_specs = manifest.get("row_specs") if isinstance(manifest.get("row_specs"), dict) else {}
    manifest["row_specs"] = copy.deepcopy(row_specs)
    for spec in manifest["row_specs"].values():
        if isinstance(spec, dict):
            spec["thermodynamic_thresholds"] = copy.deepcopy(THERMODYNAMIC_THRESHOLDS)
            spec["state_phase_label_contract"] = {
                "diagnostic": True,
                "not_for_physics_claims": True,
                "label_source": LABEL_SOURCE,
            }
    row_fixtures = manifest.get("row_fixtures") if isinstance(manifest.get("row_fixtures"), dict) else {}
    manifest["row_fixtures"] = {}
    for row_id, group in row_fixtures.items():
        if not isinstance(group, dict):
            continue
        copied = copy.deepcopy(group)
        structures = copied.get("structures")
        if isinstance(structures, list):
            copied["structures"] = [
                annotate_case(case, str(row_id), index) if isinstance(case, dict) else case
                for index, case in enumerate(structures)
            ]
        copied["diagnostic_state_phase_labels"] = True
        manifest["row_fixtures"][str(row_id)] = copied
    manifest.pop("manifest_hash", None)
    manifest["manifest_hash"] = "sha256:" + sha256_hex(manifest)
    return manifest


def manifest_runtime_hash(manifest: dict[str, Any]) -> str:
    return "sha256:" + sha256_hex(manifest)


def prediction_from_reference(row_id: str, case: dict[str, Any], row_spec: dict[str, Any]) -> dict[str, Any]:
    if row_id not in REPLAY_ROWS:
        raise ValueError(f"local checkpoint replay does not support row {row_id}")
    reference = case.get("reference")
    if not isinstance(reference, dict):
        raise ValueError(f"{row_id}/{case.get('structure_id')} is missing reference")
    symbols = [str(symbol) for symbol in case.get("symbols", [])]
    prediction: dict[str, Any] = {
        "structure_id": case.get("structure_id"),
        "material_id": case.get("material_id", case.get("material")),
        "chemical_system": "-".join(sorted(set(symbols))),
        "symbols": symbols,
        "row_id": row_id,
        "volume_scale": case.get("volume_scale"),
        "strain_voigt": case.get("strain_voigt"),
        "reference": copy.deepcopy(reference),
        "diagnostic_reference_prediction": True,
    }
    prediction.update(thermodynamic_condition(case, row_spec))
    if row_id == "energy_volume":
        prediction["energy_ev_per_atom"] = reference["energy_ev_per_atom"]
        return prediction
    if row_id == "forces":
        prediction["forces_ev_per_angstrom"] = copy.deepcopy(reference["forces_ev_per_angstrom"])
        return prediction
    if row_id == "stress":
        prediction["stress_gpa"] = copy.deepcopy(reference["stress_gpa"])
        return prediction
    threshold = float(reference.get("relaxation_force_threshold", row_spec.get("force_threshold", 0.05)))
    prediction.update({
        "relaxation_converged": True,
        "relaxation_steps_limit": int(row_spec.get("max_steps", 200)),
        "relaxation_force_threshold": threshold,
        "relaxation_max_force_ev_per_angstrom": min(threshold * 0.5, threshold),
        "relaxed_energy_ev_per_atom": reference["relaxed_energy_ev_per_atom"],
        "relaxed_cell": copy.deepcopy(case.get("cell")),
        "relaxed_positions": copy.deepcopy(case.get("positions")),
    })
    return prediction


def row_predictions(manifest: dict[str, Any], row_id: str) -> list[dict[str, Any]]:
    selection = select_row(manifest, row_id)
    return [
        prediction_from_reference(row_id, case, selection.row_spec)
        for case in selection.cases
    ]


def row_score_summary(manifest: dict[str, Any], row_id: str) -> dict[str, Any]:
    selection = select_row(manifest, row_id)
    predictions = row_predictions(manifest, row_id)
    score, unit, metrics = evaluate_row(row_id, predictions, selection.row_spec)
    coverage = thermodynamic_condition_coverage(predictions, selection.row_spec)
    return {
        "row_id": row_id,
        "n_structures": len(predictions),
        "score": score,
        "unit": unit,
        "primary_metric": metrics.get("primary_metric"),
        "error": metrics.get("error"),
        "thermodynamic_condition_coverage": coverage,
    }


def checkpoint_payload(
    manifest: dict[str, Any],
    row_id: str,
    mlip_id: str,
    *,
    run_id: str,
    cell_id: str,
) -> dict[str, Any]:
    selection = select_row(manifest, row_id)
    manifest_hash = manifest_runtime_hash(manifest)
    predictions: dict[str, Any] = {}
    for case_index, case in enumerate(selection.cases):
        prediction = prediction_from_reference(row_id, case, selection.row_spec)
        predictions[case_cache_key(row_id, case_index, case)] = {
            "case_index": case_index,
            "case_hash": sha256_hex(case),
            "structure_id": case.get("structure_id"),
            "prediction": prediction,
            "recorded_at_unix": 0,
        }
    return {
        "schema": "lupine.mlip.cell_checkpoint.v1",
        "context": raw_prediction_checkpoint_context(row_id, mlip_id, manifest_hash),
        "producer_context": {
            "run_id": run_id,
            "cell_id": cell_id,
            "variant_id": "diagnostic_reference",
            "distill_profile": "off",
            "diagnostic_state_phase_probe": True,
        },
        "predictions": predictions,
        "updated_at_unix": 0,
    }


def write_checkpoint(
    manifest: dict[str, Any],
    row_id: str,
    mlip_id: str,
    path: pathlib.Path,
    *,
    run_id: str,
    cell_id: str,
) -> dict[str, Any]:
    payload = checkpoint_payload(manifest, row_id, mlip_id, run_id=run_id, cell_id=cell_id)
    write_json(path, payload)
    return {
        "row_id": row_id,
        "mlip_id": mlip_id,
        "checkpoint_path": str(path),
        "prediction_count": len(payload["predictions"]),
        "context": payload["context"],
    }


def run_checkpoint_replay(
    manifest_path: pathlib.Path,
    checkpoint_path: pathlib.Path,
    row_id: str,
    mlip_id: str,
    *,
    run_id: str,
    run_dir: pathlib.Path,
) -> dict[str, Any]:
    cell_id = f"{run_id}:diagnostic_reference:{row_id}:{mlip_id}"
    safe_cell = cell_id.replace(":", "_")
    artifact_prefix = run_dir / "artifacts" / safe_cell
    beat_jsonl = run_dir / "beats.jsonl"
    cmd = [
        sys.executable,
        str(RUNNER),
        "run-cell",
        "--run-id",
        run_id,
        "--campaign-id",
        "mptrj-state-phase-local-diagnostic",
        "--cell-id",
        cell_id,
        "--row-id",
        row_id,
        "--mlip-id",
        mlip_id,
        "--variant-id",
        "baseline",
        "--distill-profile",
        "off",
        "--profile",
        "local-state-phase-diagnostic",
        "--fixture-id",
        DEFAULT_FIXTURE_ID,
        "--manifest-url",
        str(manifest_path),
        "--artifact-prefix",
        str(artifact_prefix),
        "--checkpoint-mode",
        "read-only",
        "--checkpoint-url",
        str(checkpoint_path),
        "--checkpoint-only-replay",
        "--local-jsonl",
        str(beat_jsonl),
        "--dev-mode-bypass",
    ]
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=False)
    result: dict[str, Any] = {
        "row_id": row_id,
        "mlip_id": mlip_id,
        "cell_id": cell_id,
        "returncode": proc.returncode,
        "command": cmd,
    }
    if proc.stdout.strip():
        try:
            result["metrics"] = json.loads(proc.stdout)
        except json.JSONDecodeError:
            result["stdout"] = proc.stdout
    if proc.stderr.strip():
        try:
            result["error_metrics"] = json.loads(proc.stderr)
        except json.JSONDecodeError:
            result["stderr"] = proc.stderr
    return result


def parse_rows(values: Iterable[str]) -> list[str]:
    rows = list(values)
    unsupported = sorted(set(rows) - set(REPLAY_ROWS))
    if unsupported:
        raise SystemExit(f"unsupported local replay row(s): {', '.join(unsupported)}")
    return rows


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=pathlib.Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=pathlib.Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--run-dir", type=pathlib.Path, default=DEFAULT_RUN_DIR)
    parser.add_argument("--run-id", default="state-phase-local-probe")
    parser.add_argument("--fixture-id", default=DEFAULT_FIXTURE_ID)
    parser.add_argument("--mlip-id", default="chgnet")
    parser.add_argument("--rows", nargs="+", default=list(CANARY_ROWS))
    parser.add_argument("--no-checkpoints", action="store_true")
    parser.add_argument("--run-runner", action="store_true")
    args = parser.parse_args(list(argv) if argv is not None else None)

    rows = parse_rows(args.rows)
    manifest = build_diagnostic_manifest(load_json(args.source), fixture_id=args.fixture_id)
    write_json(args.output, manifest)
    validation = validate_manifest(manifest)
    summary: dict[str, Any] = {
        "schema": "lupine.mlip.state_phase_local_probe.summary.v1",
        "source_manifest": str(args.source),
        "diagnostic_manifest": str(args.output),
        "run_dir": str(args.run_dir),
        "fixture_id": manifest["fixture_id"],
        "manifest_hash": manifest_runtime_hash(manifest),
        "diagnostic_labels": {
            "not_for_physics_claims": True,
            "label_source": LABEL_SOURCE,
        },
        "fixture_contract": validation,
        "rows": [row_score_summary(manifest, row_id) for row_id in rows],
        "checkpoints": [],
        "runner_replays": [],
    }
    if not args.no_checkpoints:
        for row_id in rows:
            cell_id = f"{args.run_id}:diagnostic_reference:{row_id}:{args.mlip_id}"
            checkpoint_path = args.run_dir / "checkpoints" / row_id / args.mlip_id / "cell_checkpoint.json"
            checkpoint = write_checkpoint(
                manifest,
                row_id,
                args.mlip_id,
                checkpoint_path,
                run_id=args.run_id,
                cell_id=cell_id,
            )
            summary["checkpoints"].append(checkpoint)
            if args.run_runner:
                summary["runner_replays"].append(
                    run_checkpoint_replay(
                        args.output,
                        checkpoint_path,
                        row_id,
                        args.mlip_id,
                        run_id=args.run_id,
                        run_dir=args.run_dir,
                    )
                )
    summary_path = args.run_dir / "summary.json"
    summary["summary_path"] = str(summary_path)
    write_json(summary_path, summary)
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0 if validation["release_ready"] and all(
        item.get("returncode", 0) == 0 for item in summary["runner_replays"]
    ) else 1


if __name__ == "__main__":
    raise SystemExit(main())
