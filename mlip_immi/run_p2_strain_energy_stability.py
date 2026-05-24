#!/usr/bin/env python3
"""Run a top-5 P2 check from strain-energy residual curves.

The first local P2 run used fitted cubic constants C11/C12/C44, which limits
the residual matrix to rank <= 3. This runner builds a configuration-level
matrix instead:

    rows    = IMMI element x elastic strain mode
    columns = finite strain amplitudes
    values  = (MLIP strain energy - literature elastic strain energy) /
              literature energy scale for that element/mode

That gives an honest top-5 SVD without inventing derived features. The
literature target curve is the standard small-strain cubic elastic energy
density built from the PUBLISHED_C_IJ table.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np
from ase.build import bulk
from ase.units import GPa
from elastic_constants import (
    CRYSTAL_STRUCTURE,
    PUBLISHED_C_IJ,
    make_calculator,
    resolve_device,
    runtime_metadata,
    strain_matrix_iso,
    strain_matrix_shear,
    strain_matrix_volconst,
)

HERE = Path(__file__).resolve().parent
REPO = HERE.parent

P2_THRESHOLD = 0.7
P2_FALSIFICATION = 0.5
TOP_K_REQUESTED = 5
EPS_VALUES = np.array([-0.0100, -0.0075, -0.0050, -0.0025, 0.0025, 0.0050, 0.0075, 0.0100])

MODEL_OUTPUTS = {
    "mace-mp-0": "mace_immi_results.json",
    "mace-mp-medium": "mace_mp_medium_immi_results.json",
    "mace-mpa-0": "mace_mpa_0_immi_results.json",
    "orb-v2": "orb_v2_immi_results.json",
    "orb-v3": "orb_v3_immi_results.json",
    "orb-v3-direct": "orb_v3_direct_immi_results.json",
}

ENERGY_OUTPUTS = {
    model: filename.replace("_immi_results.json", "_strain_energy_residuals.json")
    for model, filename in MODEL_OUTPUTS.items()
}

GENERATION_PAIRS = [
    {
        "pair_id": "mace_mp0_small_to_mpa0_medium",
        "family": "MACE",
        "from_model": "mace-mp-0",
        "to_model": "mace-mpa-0",
        "note": "Manuscript-named transition; checkpoint sizes differ in this local stack.",
    },
    {
        "pair_id": "mace_mp0_medium_to_mpa0_medium",
        "family": "MACE",
        "from_model": "mace-mp-medium",
        "to_model": "mace-mpa-0",
        "note": "Same-size MACE control: medium MP-0 to medium MPA-0.",
    },
    {
        "pair_id": "orb_v2_to_v3",
        "family": "Orb",
        "from_model": "orb-v2",
        "to_model": "orb-v3",
        "note": "Orbital Materials generation transition available in installed package.",
    },
    {
        "pair_id": "orb_v2_to_v3_direct",
        "family": "Orb",
        "from_model": "orb-v2",
        "to_model": "orb-v3-direct",
        "note": "Direct Orb-v3 control for avoiding direct-to-conservative mismatch.",
    },
]

MODES = {
    "iso": strain_matrix_iso,
    "volconst": strain_matrix_volconst,
    "shear": strain_matrix_shear,
}

MODE_R2_KEYS = {
    "iso": "R2_iso",
    "volconst": "R2_volconst",
    "shear": "R2_shear",
}


def run_command(args: list[str], cwd: Path, log_path: Path) -> None:
    with log_path.open("a", encoding="utf-8") as log:
        log.write(f"\n$ {' '.join(args)}\n")
        log.flush()
        proc = subprocess.run(
            args,
            cwd=cwd,
            text=True,
            stdout=log,
            stderr=subprocess.STDOUT,
            check=False,
        )
        log.write(f"\n[exit {proc.returncode}]\n")
        if proc.returncode != 0:
            raise SystemExit(f"command failed ({proc.returncode}): {' '.join(args)}")


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def small_strain_from_fmat(fmat: np.ndarray) -> np.ndarray:
    return 0.5 * (fmat + fmat.T) - np.eye(3)


def cubic_energy_density(c_ij_gpa: dict[str, float], strain: np.ndarray) -> float:
    """Small-strain cubic elastic energy density in eV/A^3."""
    c11 = c_ij_gpa["C11"] * GPa
    c12 = c_ij_gpa["C12"] * GPa
    c44 = c_ij_gpa["C44"] * GPa
    e1, e2, e3 = strain[0, 0], strain[1, 1], strain[2, 2]
    g23 = 2.0 * strain[1, 2]
    g13 = 2.0 * strain[0, 2]
    g12 = 2.0 * strain[0, 1]
    return float(
        0.5 * c11 * (e1 * e1 + e2 * e2 + e3 * e3)
        + c12 * (e1 * e2 + e1 * e3 + e2 * e3)
        + 0.5 * c44 * (g23 * g23 + g13 * g13 + g12 * g12)
    )


def strain_scale_density(element: str, mode: str) -> float:
    strain_fn = MODES[mode]
    fmat = np.eye(3) + strain_fn(float(np.max(np.abs(EPS_VALUES))))
    density = cubic_energy_density(PUBLISHED_C_IJ[element], small_strain_from_fmat(fmat))
    return max(abs(density), 1e-12)


def born_stable(row: dict[str, Any]) -> bool:
    c11 = float(row["C11"])
    c12 = float(row["C12"])
    c44 = float(row["C44"])
    return (c11 - c12) > 0.0 and (c11 + 2.0 * c12) > 0.0 and c44 > 0.0


def constant_ape(row: dict[str, Any], key: str, refs: dict[str, dict[str, float]]) -> float:
    element = row["element"]
    return abs(float(row[key]) / float(refs[element][key]) - 1.0)


def relevant_accuracy(row: dict[str, Any], mode: str, refs: dict[str, dict[str, float]]) -> float:
    element = row["element"]
    ref = refs[element]
    if mode == "shear":
        return constant_ape(row, "C44", refs)
    if mode == "iso":
        pred = (float(row["C11"]) + 2.0 * float(row["C12"])) / 3.0
        target = (float(ref["C11"]) + 2.0 * float(ref["C12"])) / 3.0
        return abs(pred / target - 1.0)
    pred = float(row["C11"]) - float(row["C12"])
    target = float(ref["C11"]) - float(ref["C12"])
    return abs(pred / target - 1.0)


def row_quality(row: dict[str, Any], mode: str, refs: dict[str, dict[str, float]]) -> dict[str, Any]:
    r2_key = MODE_R2_KEYS[mode]
    r2 = float(row[r2_key])
    ape = relevant_accuracy(row, mode, refs)
    return {
        "mode_R2": r2,
        "mode_abs_pct_error": 100.0 * ape,
        "born_stable": born_stable(row),
        "fit_ok": r2 >= 0.95,
        "accuracy_ok_100pct": ape <= 1.0,
        "accuracy_ok_50pct": ape <= 0.5,
    }


def elastic_rows(path: Path) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    raw = load_json(path)
    return raw, {row["element"]: row for row in raw["results"]}


def ensure_elastic_output(
    model: str,
    elastic_dir: Path,
    run_dir: Path,
    device: str,
    force_elastics: bool,
    log_path: Path,
) -> Path:
    out_path = run_dir / MODEL_OUTPUTS[model]
    source = elastic_dir / MODEL_OUTPUTS[model]
    if not force_elastics and source.exists() and not out_path.exists():
        shutil.copy2(source, out_path)
    if force_elastics or not out_path.exists():
        run_command(
            [
                sys.executable,
                str(HERE / "elastic_constants.py"),
                "--model",
                model,
                "--all",
                "--device",
                device,
                "--output",
                str(out_path),
            ],
            cwd=REPO,
            log_path=log_path,
        )
    return out_path


def compute_energy_residuals(
    model: str,
    elastic_path: Path,
    output_path: Path,
    requested_device: str,
    force: bool,
) -> Path:
    if output_path.exists() and not force:
        return output_path

    resolved_device = resolve_device(requested_device)
    calc = make_calculator(model, device=resolved_device)
    elastic_raw, rows_by_element = elastic_rows(elastic_path)
    refs = elastic_raw["published_reference"]
    records = []

    for element, elastic_row in rows_by_element.items():
        atoms0 = bulk(
            element,
            CRYSTAL_STRUCTURE[element],
            a=float(elastic_row["a0_optimized"]),
            cubic=True,
        )
        atoms0.calc = calc
        e0 = float(atoms0.get_potential_energy())
        v0 = float(atoms0.get_volume())

        for mode, strain_fn in MODES.items():
            scale_density = strain_scale_density(element, mode)
            predicted_density = []
            reference_density = []
            residual = []
            for eps in EPS_VALUES:
                atoms = atoms0.copy()
                fmat = np.eye(3) + strain_fn(float(eps))
                atoms.set_cell(atoms.cell @ fmat.T, scale_atoms=True)
                atoms.calc = calc
                pred = (float(atoms.get_potential_energy()) - e0) / v0
                ref = cubic_energy_density(PUBLISHED_C_IJ[element], small_strain_from_fmat(fmat))
                predicted_density.append(pred)
                reference_density.append(ref)
                residual.append((pred - ref) / scale_density)

            records.append(
                {
                    "row_id": f"{element}:{mode}",
                    "element": element,
                    "mode": mode,
                    "eps_values": EPS_VALUES.tolist(),
                    "residual": residual,
                    "predicted_energy_density_eV_A3": predicted_density,
                    "reference_energy_density_eV_A3": reference_density,
                    "scale_density_eV_A3": scale_density,
                    "quality": row_quality(elastic_row, mode, refs),
                    "elastic_failures": elastic_row.get("failures", []),
                }
            )

    payload = {
        "model": elastic_raw.get("model", model),
        "model_key": model,
        "source_elastic_results": str(elastic_path),
        "runtime": runtime_metadata(requested_device, resolved_device),
        "protocol": {
            "rows": "element x elastic strain mode",
            "columns": "finite strain amplitudes",
            "eps_values": EPS_VALUES.tolist(),
            "value": "(MLIP strain energy - literature elastic strain energy) / literature mode scale",
            "literature_curve": "small-strain cubic elastic energy density from PUBLISHED_C_IJ",
        },
        "records": records,
    }
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return output_path


def include_record(record_a: dict[str, Any], record_b: dict[str, Any], gate: str) -> bool:
    if gate == "none":
        return True
    qa = record_a["quality"]
    qb = record_b["quality"]
    if gate == "fit":
        return bool(qa["fit_ok"] and qb["fit_ok"])
    if gate == "fit+born":
        return bool(qa["fit_ok"] and qb["fit_ok"] and qa["born_stable"] and qb["born_stable"])
    if gate == "fit+accuracy100":
        return bool(
            qa["fit_ok"]
            and qb["fit_ok"]
            and qa["accuracy_ok_100pct"]
            and qb["accuracy_ok_100pct"]
            and qa["born_stable"]
            and qb["born_stable"]
        )
    if gate == "fit+accuracy50":
        return bool(
            qa["fit_ok"]
            and qb["fit_ok"]
            and qa["accuracy_ok_50pct"]
            and qb["accuracy_ok_50pct"]
            and qa["born_stable"]
            and qb["born_stable"]
        )
    raise ValueError(f"unknown quality gate: {gate}")


def matrix_from_records(
    first_path: Path,
    second_path: Path,
    quality_gate: str,
) -> tuple[np.ndarray, np.ndarray, list[str], dict[str, Any], dict[str, Any]]:
    first_raw = load_json(first_path)
    second_raw = load_json(second_path)
    first_records = {record["row_id"]: record for record in first_raw["records"]}
    second_records = {record["row_id"]: record for record in second_raw["records"]}
    row_ids = []
    first_rows = []
    second_rows = []
    for row_id in sorted(set(first_records) & set(second_records)):
        if include_record(first_records[row_id], second_records[row_id], quality_gate):
            row_ids.append(row_id)
            first_rows.append(first_records[row_id]["residual"])
            second_rows.append(second_records[row_id]["residual"])
    if not row_ids:
        raise ValueError(f"quality gate {quality_gate!r} removed every row for {first_path} vs {second_path}")
    return (
        np.array(first_rows, dtype=np.float64),
        np.array(second_rows, dtype=np.float64),
        row_ids,
        first_raw,
        second_raw,
    )


def svd_basis(matrix: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, int]:
    centered = matrix - matrix.mean(axis=0, keepdims=True)
    u, singular_values, vt = np.linalg.svd(centered, full_matrices=False)
    if singular_values.size == 0:
        return u, singular_values, vt.T, 0
    rank = int(np.sum(singular_values > max(float(singular_values[0]) * 1e-10, 1e-12)))
    k = max(1, min(TOP_K_REQUESTED, rank))
    return u[:, :k], singular_values[:k], vt.T[:, :k], rank


def compare_bases(a: np.ndarray, b: np.ndarray) -> dict[str, Any]:
    cos = np.abs(a.T @ b)
    best_a = np.max(cos, axis=1)
    best_b = np.max(cos, axis=0)
    _, subspace_singular_values, _ = np.linalg.svd(a.T @ b, full_matrices=False)
    return {
        "k": int(a.shape[1]),
        "cosine_matrix": cos.tolist(),
        "best_match_from_first": best_a.tolist(),
        "best_match_from_second": best_b.tolist(),
        "worst_best_match": float(min(np.min(best_a), np.min(best_b))),
        "mean_best_match": float(np.mean(np.concatenate([best_a, best_b]))),
        "principal_angle_cosines": subspace_singular_values.tolist(),
        "min_principal_angle_cosine": float(np.min(subspace_singular_values)),
    }


def effective_k(singular_values: np.ndarray, ratio_floor: float) -> int:
    if singular_values.size == 0 or singular_values[0] <= 0:
        return 0
    return int(np.sum(singular_values >= singular_values[0] * ratio_floor))


def pair_verdict(config_metrics: dict[str, Any], k: int, effective_k_1pct: int) -> str:
    if k < TOP_K_REQUESTED:
        return "invalid_rank"
    if effective_k_1pct < TOP_K_REQUESTED:
        return "underpowered_effective_rank"
    worst = config_metrics["worst_best_match"]
    subspace = config_metrics["min_principal_angle_cosine"]
    if worst < P2_FALSIFICATION:
        return "falsified"
    if worst >= P2_THRESHOLD and subspace >= P2_THRESHOLD:
        return "pass"
    return "inconclusive"


def analyze_pair(
    pair: dict[str, str],
    energy_outputs: dict[str, Path],
    quality_gate: str,
) -> dict[str, Any]:
    first_matrix, second_matrix, row_ids, first_raw, second_raw = matrix_from_records(
        energy_outputs[pair["from_model"]],
        energy_outputs[pair["to_model"]],
        quality_gate,
    )
    u1, s1, v1, rank1 = svd_basis(first_matrix)
    u2, s2, v2, rank2 = svd_basis(second_matrix)
    k = min(u1.shape[1], u2.shape[1])
    effective_k_1pct = min(effective_k(s1, 0.01), effective_k(s2, 0.01), TOP_K_REQUESTED)
    effective_k_0_1pct = min(effective_k(s1, 0.001), effective_k(s2, 0.001), TOP_K_REQUESTED)
    config_metrics = compare_bases(u1[:, :k], u2[:, :k])
    strain_metrics = compare_bases(v1[:, :k], v2[:, :k])
    return {
        "pair_id": pair["pair_id"],
        "family": pair["family"],
        "from_model": pair["from_model"],
        "to_model": pair["to_model"],
        "note": pair["note"],
        "quality_gate": quality_gate,
        "matrix_shape": [int(first_matrix.shape[0]), int(first_matrix.shape[1])],
        "row_ids": row_ids,
        "top_k_requested": TOP_K_REQUESTED,
        "top_k_used": int(k),
        "effective_k_ratio_floor_1pct": int(effective_k_1pct),
        "effective_k_ratio_floor_0_1pct": int(effective_k_0_1pct),
        "from_rank": int(rank1),
        "to_rank": int(rank2),
        "from_singular_values": s1[:k].tolist(),
        "to_singular_values": s2[:k].tolist(),
        "configuration_space_left_vectors": config_metrics,
        "strain_feature_space_vectors": strain_metrics,
        "artifacts": {
            "from_strain_energy_residuals": str(energy_outputs[pair["from_model"]]),
            "to_strain_energy_residuals": str(energy_outputs[pair["to_model"]]),
        },
        "runtime": {
            "from": first_raw.get("runtime", {}),
            "to": second_raw.get("runtime", {}),
        },
        "verdict": pair_verdict(config_metrics, k, effective_k_1pct),
    }


def write_summary(run_dir: Path, results: list[dict[str, Any]], quality_gate: str) -> Path:
    payload = {
        "prediction": "P2 generational stability of error directions",
        "local_protocol": (
            "IMMI strain-energy residual curves; rows=element x strain mode, "
            "columns=finite strain amplitudes; top-k=min(5, numerical rank)."
        ),
        "quality_gate": quality_gate,
        "thresholds": {
            "pass_worst_best_match": P2_THRESHOLD,
            "falsification_worst_best_match": P2_FALSIFICATION,
        },
        "results": results,
        "overall": {
            "n_pairs": len(results),
            "n_pass": sum(1 for row in results if row["verdict"] == "pass"),
            "n_falsified": sum(1 for row in results if row["verdict"] == "falsified"),
            "n_inconclusive": sum(1 for row in results if row["verdict"] == "inconclusive"),
            "n_invalid_rank": sum(1 for row in results if row["verdict"] == "invalid_rank"),
            "n_underpowered_effective_rank": sum(
                1 for row in results if row["verdict"] == "underpowered_effective_rank"
            ),
            "verdict": (
                "falsified"
                if any(row["verdict"] == "falsified" for row in results)
                else "pass"
                if all(row["verdict"] == "pass" for row in results)
                else "underpowered_effective_rank"
                if all(row["verdict"] == "underpowered_effective_rank" for row in results)
                else "mixed"
            ),
        },
    }
    out_json = run_dir / f"p2_strain_energy_stability_{quality_gate.replace('+', '_')}.json"
    out_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    lines = [
        "# P2 Strain-Energy Stability",
        "",
        f"Run directory: `{run_dir}`",
        f"Quality gate: `{quality_gate}`",
        "",
        "| pair | verdict | rows x eps | rank | k | eff k 1% | config worst-best | config subspace min | strain-feature worst-best |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for row in results:
        config = row["configuration_space_left_vectors"]
        strain = row["strain_feature_space_vectors"]
        shape = row["matrix_shape"]
        rank = min(row["from_rank"], row["to_rank"])
        lines.append(
            "| {pair} | {verdict} | {shape0}x{shape1} | {rank} | {k} | {effk} | {cw:.3f} | {cs:.3f} | {sw:.3f} |".format(
                pair=row["pair_id"],
                verdict=row["verdict"],
                shape0=shape[0],
                shape1=shape[1],
                rank=rank,
                k=row["top_k_used"],
                effk=row["effective_k_ratio_floor_1pct"],
                cw=config["worst_best_match"],
                cs=config["min_principal_angle_cosine"],
                sw=strain["worst_best_match"],
            )
        )
    lines.extend(
        [
            "",
            "The primary column is the configuration-space left-singular-vector match named in the manuscript.",
            "The strain-feature column is the PCA-components analogue used by the synthetic falsification script.",
            "",
            f"Overall verdict: `{payload['overall']['verdict']}`",
            "",
        ]
    )
    out_md = out_json.with_suffix(".md")
    out_md.write_text("\n".join(lines), encoding="utf-8")
    return out_json


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda"])
    parser.add_argument("--force", action="store_true", help="recompute strain-energy residuals")
    parser.add_argument("--force-elastics", action="store_true", help="recompute fitted elastic constants first")
    parser.add_argument(
        "--elastic-dir",
        default=str(HERE / "runs" / "p2_generational_20260521_144500_direct"),
        help="directory with existing fitted *_immi_results.json outputs",
    )
    parser.add_argument(
        "--quality-gate",
        default="none",
        choices=["none", "fit", "fit+born", "fit+accuracy100", "fit+accuracy50"],
        help="row filter applied pairwise before SVD",
    )
    parser.add_argument(
        "--run-dir",
        default=None,
        help="artifact directory; default creates mlip_immi/runs/p2_strain_energy_<stamp>",
    )
    args = parser.parse_args()

    elastic_dir = Path(args.elastic_dir)
    if not elastic_dir.is_absolute():
        elastic_dir = REPO / elastic_dir
    if args.run_dir:
        run_dir = Path(args.run_dir)
        if not run_dir.is_absolute():
            run_dir = REPO / run_dir
    else:
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        run_dir = HERE / "runs" / f"p2_strain_energy_{stamp}"
    run_dir.mkdir(parents=True, exist_ok=True)
    log_path = run_dir / "run.log"

    needed_models = sorted({p["from_model"] for p in GENERATION_PAIRS} | {p["to_model"] for p in GENERATION_PAIRS})
    elastic_outputs: dict[str, Path] = {}
    energy_outputs: dict[str, Path] = {}
    for model in needed_models:
        elastic_outputs[model] = ensure_elastic_output(
            model,
            elastic_dir,
            run_dir,
            args.device,
            args.force_elastics,
            log_path,
        )
        energy_outputs[model] = compute_energy_residuals(
            model,
            elastic_outputs[model],
            run_dir / ENERGY_OUTPUTS[model],
            args.device,
            args.force,
        )

    results = [analyze_pair(pair, energy_outputs, args.quality_gate) for pair in GENERATION_PAIRS]
    summary = write_summary(run_dir, results, args.quality_gate)
    print(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
