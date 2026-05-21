#!/usr/bin/env python3
"""Run the real-MLIP IMMI sweep used by the Universality Theorem bundle.

The theorem draft ships with a synthetic falsification harness. This runner
produces the local real-data replacement that is available in this repo:

1. Evaluate MACE-MP-0, CHGNet, and Orb-v3 on the 15-element IMMI elastic
   constants task.
2. Recompute cross-MLIP residual-direction alignment.
3. Build the glim-think ingest payload.
4. Write a compact residual-spectrum summary for theorem-facing review.

The outputs under mlip_immi/runs/ are intentionally local artifacts.
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

HERE = Path(__file__).resolve().parent
REPO = HERE.parent

MODEL_OUTPUTS = {
    "mace-mp-0": "mace_immi_results.json",
    "chgnet": "chgnet_immi_results.json",
    "orb-v3": "orb_v3_immi_results.json",
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


def load_model_results(path: Path) -> dict[str, dict[str, float]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    out: dict[str, dict[str, float]] = {}
    for row in raw["results"]:
        out[row["element"]] = {
            "C11": float(row["C11"]),
            "C12": float(row["C12"]),
            "C44": float(row["C44"]),
        }
    return out


def relative_error_matrix(
    rows: dict[str, dict[str, float]],
    refs: dict[str, dict[str, float]],
    elements: list[str],
) -> np.ndarray:
    return np.array(
        [
            [
                rows[element]["C11"] / refs[element]["C11"] - 1.0,
                rows[element]["C12"] / refs[element]["C12"] - 1.0,
                rows[element]["C44"] / refs[element]["C44"] - 1.0,
            ]
            for element in elements
        ],
        dtype=np.float64,
    )


def spectrum_summary(matrix: np.ndarray) -> dict[str, Any]:
    centered = matrix - matrix.mean(axis=0, keepdims=True)
    cov = np.cov(centered, rowvar=False)
    eigvals = np.linalg.eigvalsh(cov)
    eigvals = np.sort(np.maximum(eigvals, 0.0))[::-1]
    total = float(eigvals.sum())
    sum_sq = float(np.sum(eigvals**2))
    pr = (total * total / sum_sq) if sum_sq > 0 else 0.0
    explained = (eigvals / total).tolist() if total > 0 else [0.0 for _ in eigvals]

    positive = eigvals[eigvals > 1e-14]
    if len(positive) >= 2:
        x = np.arange(1, len(positive) + 1, dtype=np.float64)
        y = np.log(positive / positive[0])
        slope, intercept = np.polyfit(x, y, 1)
        fit = slope * x + intercept
        denom = float(np.sum((y - y.mean()) ** 2))
        r2 = 1.0 - float(np.sum((y - fit) ** 2)) / denom if denom else 1.0
        rho_proxy = float(-slope)
    else:
        rho_proxy = None
        r2 = None

    return {
        "n_rows": int(matrix.shape[0]),
        "n_features": int(matrix.shape[1]),
        "eigenvalues": [float(x) for x in eigvals],
        "participation_ratio": float(pr),
        "explained_variance": [float(x) for x in explained],
        "log_decay_rho_proxy": rho_proxy,
        "log_decay_r2": r2,
    }


def write_real_summary(run_dir: Path, model_files: dict[str, Path]) -> Path:
    refs = json.loads(next(iter(model_files.values())).read_text(encoding="utf-8"))[
        "published_reference"
    ]
    model_rows = {name: load_model_results(path) for name, path in model_files.items()}
    elements = sorted(set.intersection(*(set(rows) for rows in model_rows.values())) & set(refs))

    matrices = {
        name: relative_error_matrix(rows, refs, elements)
        for name, rows in model_rows.items()
    }
    stacked = np.vstack(list(matrices.values()))

    summary: dict[str, Any] = {
        "run_dir": str(run_dir),
        "models": list(model_files),
        "elements": elements,
        "properties": ["C11", "C12", "C44"],
        "data_source": "local MLIP strain-energy elastic constants on IMMI 15-element corpus",
        "theorem_mapping": {
            "synthetic_replacement": (
                "Real residual vectors replace the synthetic residual block in "
                "experiments/falsification_framework.py."
            ),
            "clause_iii_proxy": (
                "Residual covariance spectra are reported as a real-data proxy. "
                "They are not parameter Fisher spectra."
            ),
            "p1_status": "not run; needs an active-learning retraining loop or benchmark API.",
            "p2_status": (
                "not run as a generational test; the local installed stack has one "
                "checkpoint per family in this sweep."
            ),
        },
        "class_uniform_residual_spectrum": spectrum_summary(stacked),
        "per_model_residual_spectrum": {
            name: spectrum_summary(matrix) for name, matrix in matrices.items()
        },
    }

    align_path = run_dir / "cross_mlip_alignment_results.json"
    if align_path.exists():
        alignment = json.loads(align_path.read_text(encoding="utf-8"))
        summary["cross_mlip_alignment"] = {
            "n_elements": alignment["n_elements"],
            "n_models": alignment["n_models"],
            "models": alignment["models"],
            "spearman_rho_classical_vs_mlip": alignment[
                "spearman_rho_classical_vs_mlip"
            ],
            "spearman_p": alignment["spearman_p"],
            "strong_classical_mean": alignment[
                "group_mlip_mean_cosine_strong_classical"
            ],
            "weak_classical_mean": alignment[
                "group_mlip_mean_cosine_weak_classical"
            ],
            "orthogonal_predicted_mean": alignment[
                "group_mlip_mean_cosine_orthogonal_predicted"
            ],
        }

    out_json = run_dir / "real_mlip_universality_summary.json"
    out_json.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    cls = summary["class_uniform_residual_spectrum"]
    alignment = summary.get("cross_mlip_alignment", {})
    out_md = run_dir / "real_mlip_universality_summary.md"
    out_md.write_text(
        "\n".join(
            [
                "# Real MLIP Universality Sweep",
                "",
                f"Run directory: `{run_dir}`",
                f"Models: {', '.join(summary['models'])}",
                f"Elements: {len(elements)} IMMI elements",
                "",
                "## Cross-MLIP Alignment",
                (
                    f"Spearman rho(classical, MLIP) = "
                    f"{alignment.get('spearman_rho_classical_vs_mlip', float('nan')):.3f}; "
                    f"p = {alignment.get('spearman_p', float('nan')):.3f}"
                ),
                (
                    f"Strong-classical mean = "
                    f"{alignment.get('strong_classical_mean', float('nan')):.3f}; "
                    f"weak-classical mean = "
                    f"{alignment.get('weak_classical_mean', float('nan')):.3f}"
                ),
                "",
                "## Residual Spectrum Proxy",
                f"Class-uniform PR = {cls['participation_ratio']:.3f} / {cls['n_features']}",
                f"Class-uniform rho proxy = {cls['log_decay_rho_proxy']}",
                f"Class-uniform log-decay R2 = {cls['log_decay_r2']}",
                "",
                "## Protocol Notes",
                summary["theorem_mapping"]["clause_iii_proxy"],
                summary["theorem_mapping"]["p1_status"],
                summary["theorem_mapping"]["p2_status"],
                "",
            ]
        ),
        encoding="utf-8",
    )
    return out_json


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--models",
        nargs="+",
        default=list(MODEL_OUTPUTS),
        choices=list(MODEL_OUTPUTS),
        help="MLIP models to run",
    )
    parser.add_argument(
        "--device",
        default="auto",
        choices=["auto", "cpu", "cuda"],
        help="passed through to elastic_constants.py",
    )
    parser.add_argument(
        "--skip-compute",
        action="store_true",
        help="reuse existing *_immi_results.json files and only rebuild analysis artifacts",
    )
    parser.add_argument(
        "--run-dir",
        default=None,
        help="explicit artifact directory; default creates mlip_immi/runs/universality_real_mlip_<stamp>",
    )
    args = parser.parse_args()

    if args.run_dir:
        run_dir = Path(args.run_dir)
        if not run_dir.is_absolute():
            run_dir = REPO / run_dir
    else:
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        run_dir = HERE / "runs" / f"universality_real_mlip_{stamp}"
    run_dir.mkdir(parents=True, exist_ok=True)
    log_path = run_dir / "run.log"
    python = sys.executable

    model_files: dict[str, Path] = {}
    for model in args.models:
        out_name = MODEL_OUTPUTS[model]
        root_out = HERE / out_name
        if not args.skip_compute:
            run_command(
                [
                    python,
                    str(HERE / "elastic_constants.py"),
                    "--model",
                    model,
                    "--all",
                    "--device",
                    args.device,
                    "--output",
                    str(root_out),
                ],
                cwd=REPO,
                log_path=log_path,
            )
        if not root_out.exists():
            raise SystemExit(f"expected result file not found: {root_out}")
        shutil.copy2(root_out, run_dir / out_name)
        model_files[model] = root_out

    run_command([python, str(HERE / "cross_mlip_alignment.py")], cwd=REPO, log_path=log_path)
    shutil.copy2(HERE / "cross_mlip_alignment_results.json", run_dir)

    run_command([python, str(HERE / "build_ingest_payload.py")], cwd=REPO, log_path=log_path)
    shutil.copy2(HERE / "cross_mlip_alignment_ingest.json", run_dir)

    summary_path = write_real_summary(
        run_dir,
        {model: run_dir / MODEL_OUTPUTS[model] for model in args.models},
    )
    print(summary_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
