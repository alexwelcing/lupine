#!/usr/bin/env python3
"""Audit the local IMMI elastic-constant pipeline.

This file intentionally does two different checks:

1. A synthetic harmonic cubic crystal self-test with known C11/C12/C44. This
   verifies the strain matrices, ASE cell deformation convention, and curvature
   factors used by elastic_constants.py.
2. A results audit for real MLIP JSON outputs: fit quality, relative error
   against the encoded literature table, and basic cubic Born stability.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np
from ase.build import bulk
from ase.calculators.calculator import Calculator, all_changes
from ase.units import GPa
from elastic_constants import (
    CRYSTAL_STRUCTURE,
    PUBLISHED_C_IJ,
    compute_elastic_constants,
)

HERE = Path(__file__).resolve().parent
REPO = HERE.parent


class CubicHarmonicCalculator(Calculator):
    """ASE calculator with an exactly known cubic elastic energy density."""

    implemented_properties = ["energy"]

    def __init__(self, reference_cell: np.ndarray, c_ij_gpa: dict[str, float]):
        super().__init__()
        self.reference_cell = np.array(reference_cell, dtype=np.float64)
        self.reference_volume = abs(float(np.linalg.det(self.reference_cell)))
        self.c11 = c_ij_gpa["C11"] * GPa
        self.c12 = c_ij_gpa["C12"] * GPa
        self.c44 = c_ij_gpa["C44"] * GPa

    def calculate(
        self,
        atoms=None,
        properties=("energy",),
        system_changes=all_changes,
    ) -> None:
        super().calculate(atoms, properties, system_changes)
        cell = np.array(atoms.cell, dtype=np.float64)
        # elastic_constants.py applies current_cell = reference_cell @ F.T.
        f_transpose = np.linalg.solve(self.reference_cell, cell)
        fmat = f_transpose.T
        strain = 0.5 * (fmat + fmat.T) - np.eye(3)
        e1, e2, e3 = strain[0, 0], strain[1, 1], strain[2, 2]
        g23 = 2.0 * strain[1, 2]
        g13 = 2.0 * strain[0, 2]
        g12 = 2.0 * strain[0, 1]
        density = (
            0.5 * self.c11 * (e1 * e1 + e2 * e2 + e3 * e3)
            + self.c12 * (e1 * e2 + e1 * e3 + e2 * e3)
            + 0.5 * self.c44 * (g23 * g23 + g13 * g13 + g12 * g12)
        )
        self.results["energy"] = float(density * self.reference_volume)


def run_self_test() -> dict[str, Any]:
    element = "Cu"
    target = PUBLISHED_C_IJ[element]
    reference_atoms = bulk(element, CRYSTAL_STRUCTURE[element], a=3.61, cubic=True)
    calc = CubicHarmonicCalculator(np.array(reference_atoms.cell), target)
    result = compute_elastic_constants(element, calc, eps_max=0.005)
    recovered = {"C11": result.C11, "C12": result.C12, "C44": result.C44}
    rel_errors = {
        key: abs(recovered[key] / target[key] - 1.0)
        for key in ("C11", "C12", "C44")
    }
    return {
        "description": "Synthetic cubic harmonic self-test for strain algebra and curvature factors.",
        "target_GPa": target,
        "recovered_GPa": recovered,
        "relative_errors": rel_errors,
        "max_relative_error": max(rel_errors.values()),
        "fit_R2": {
            "iso": result.R2_iso,
            "volconst": result.R2_volconst,
            "shear": result.R2_shear,
        },
        "failures": result.failures,
        "passed": max(rel_errors.values()) < 0.02 and not result.failures,
    }


def result_files(run_dir: Path) -> list[Path]:
    return sorted(
        path
        for path in run_dir.glob("*_immi_results.json")
        if path.name not in {"cross_mlip_alignment_results.json", "meam_bootstrap_results.json"}
    )


def pct(value: float) -> float:
    return 100.0 * value


def born_stable(c11: float, c12: float, c44: float) -> bool:
    return (c11 - c12) > 0.0 and (c11 + 2.0 * c12) > 0.0 and c44 > 0.0


def summarize_result_file(path: Path) -> dict[str, Any]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    refs = raw["published_reference"]
    rows = raw["results"]
    abs_errors: list[float] = []
    row_summaries: list[dict[str, Any]] = []
    top_errors: list[tuple[float, str, str, float, float]] = []
    mode_fit_failures = 0
    a0_fit_failures = 0
    born_failures = 0
    negative_constants = 0

    for row in rows:
        element = row["element"]
        ref = refs[element]
        constants = {key: float(row[key]) for key in ("C11", "C12", "C44")}
        errors = {
            key: abs(constants[key] / float(ref[key]) - 1.0)
            for key in ("C11", "C12", "C44")
        }
        abs_errors.extend(errors.values())
        for key, err in errors.items():
            top_errors.append((err, element, key, constants[key], float(ref[key])))

        mode_r2 = {
            "iso": float(row["R2_iso"]),
            "volconst": float(row["R2_volconst"]),
            "shear": float(row["R2_shear"]),
        }
        mode_bad = any(value < 0.95 for value in mode_r2.values())
        if mode_bad:
            mode_fit_failures += 1
        if any("a0 fit" in item for item in row.get("failures", [])):
            a0_fit_failures += 1
        if not born_stable(constants["C11"], constants["C12"], constants["C44"]):
            born_failures += 1
        if any(value <= 0 for value in constants.values()):
            negative_constants += 1

        row_summaries.append(
            {
                "element": element,
                "constants_GPa": constants,
                "reference_GPa": {key: float(ref[key]) for key in ("C11", "C12", "C44")},
                "abs_relative_error": errors,
                "mode_R2": mode_r2,
                "failures": row.get("failures", []),
                "born_stable": born_stable(constants["C11"], constants["C12"], constants["C44"]),
            }
        )

    top_errors.sort(reverse=True, key=lambda item: item[0])
    abs_error_array = np.array(abs_errors, dtype=np.float64)
    return {
        "file": str(path),
        "model": raw.get("model", path.stem),
        "n_rows": len(rows),
        "n_constants": len(abs_errors),
        "median_abs_pct_error": pct(float(np.median(abs_error_array))),
        "mean_abs_pct_error": pct(float(np.mean(abs_error_array))),
        "p90_abs_pct_error": pct(float(np.quantile(abs_error_array, 0.90))),
        "max_abs_pct_error": pct(float(np.max(abs_error_array))),
        "mode_fit_failure_rows": mode_fit_failures,
        "a0_fit_warning_rows": a0_fit_failures,
        "born_unstable_rows": born_failures,
        "negative_constant_rows": negative_constants,
        "top_errors": [
            {
                "abs_pct_error": pct(err),
                "element": element,
                "constant": constant,
                "predicted_GPa": predicted,
                "reference_GPa": reference,
            }
            for err, element, constant, predicted, reference in top_errors[:8]
        ],
        "rows": row_summaries,
    }


def write_markdown(out_path: Path, payload: dict[str, Any]) -> None:
    lines = [
        "# IMMI Elastic Audit",
        "",
        f"Run directory: `{payload['run_dir']}`",
        "",
        "## Synthetic Self-Test",
        "",
        "| status | max relative error | C11 | C12 | C44 |",
        "|---|---:|---:|---:|---:|",
    ]
    self_test = payload["synthetic_self_test"]
    status = "pass" if self_test["passed"] else "fail"
    recovered = self_test["recovered_GPa"]
    lines.append(
        f"| {status} | {self_test['max_relative_error']:.6f} | "
        f"{recovered['C11']:.3f} | {recovered['C12']:.3f} | {recovered['C44']:.3f} |"
    )
    lines.extend(
        [
            "",
            "## Real MLIP Elastic Outputs",
            "",
            "| model | rows | median APE | mean APE | p90 APE | mode-fit bad rows | Born-unstable rows |",
            "|---|---:|---:|---:|---:|---:|---:|",
        ]
    )
    for model in payload["models"]:
        lines.append(
            "| {model} | {rows} | {median:.1f}% | {mean:.1f}% | {p90:.1f}% | {mode_bad} | {born_bad} |".format(
                model=model["model"],
                rows=model["n_rows"],
                median=model["median_abs_pct_error"],
                mean=model["mean_abs_pct_error"],
                p90=model["p90_abs_pct_error"],
                mode_bad=model["mode_fit_failure_rows"],
                born_bad=model["born_unstable_rows"],
            )
        )
    lines.extend(["", "## Largest Constant Errors", ""])
    for model in payload["models"]:
        lines.append(f"### {model['model']}")
        lines.append("")
        lines.append("| element | constant | predicted | reference | abs error |")
        lines.append("|---|---|---:|---:|---:|")
        for row in model["top_errors"][:5]:
            lines.append(
                "| {element} | {constant} | {pred:.1f} | {ref:.1f} | {err:.1f}% |".format(
                    element=row["element"],
                    constant=row["constant"],
                    pred=row["predicted_GPa"],
                    ref=row["reference_GPa"],
                    err=row["abs_pct_error"],
                )
            )
        lines.append("")
    out_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--run-dir",
        default=str(HERE / "runs" / "p2_generational_20260521_144500_direct"),
        help="directory containing *_immi_results.json files",
    )
    parser.add_argument("--output", default=None, help="JSON output path")
    args = parser.parse_args()

    run_dir = Path(args.run_dir)
    if not run_dir.is_absolute():
        run_dir = REPO / run_dir
    out_json = Path(args.output) if args.output else run_dir / "immi_elastic_audit.json"
    if not out_json.is_absolute():
        out_json = REPO / out_json

    payload = {
        "run_dir": str(run_dir),
        "reference_table_note": "PUBLISHED_C_IJ from elastic_constants.py; encoded as Simmons & Wang 1971 / Materials Project.",
        "synthetic_self_test": run_self_test(),
        "models": [summarize_result_file(path) for path in result_files(run_dir)],
    }
    out_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    write_markdown(out_json.with_suffix(".md"), payload)
    print(out_json)
    print(out_json.with_suffix(".md"))
    print(json.dumps({"self_test_passed": payload["synthetic_self_test"]["passed"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
