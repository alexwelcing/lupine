#!/usr/bin/env python3
"""Run local real-data P2 generational-stability tests.

The Universality Theorem states P2 on a full benchmark residual matrix and
top-5 singular directions. The local IMMI elastic-constant task has 15 elements
and 3 residual features, so this runner uses top-k with k=min(5, numerical
rank). It reports left-singular-vector stability on the element axis, plus
property-space PCA stability as a secondary diagnostic.
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

P2_THRESHOLD = 0.7
P2_FALSIFICATION = 0.5
TOP_K_REQUESTED = 5

MODEL_OUTPUTS = {
    "mace-mp-0": "mace_immi_results.json",
    "mace-mp-medium": "mace_mp_medium_immi_results.json",
    "mace-mpa-0": "mace_mpa_0_immi_results.json",
    "orb-v2": "orb_v2_immi_results.json",
    "orb-v3": "orb_v3_immi_results.json",
    "orb-v3-direct": "orb_v3_direct_immi_results.json",
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


def load_result(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_rows(path: Path) -> dict[str, dict[str, float]]:
    raw = load_result(path)
    rows: dict[str, dict[str, float]] = {}
    for row in raw["results"]:
        rows[row["element"]] = {
            "C11": float(row["C11"]),
            "C12": float(row["C12"]),
            "C44": float(row["C44"]),
        }
    return rows


def residual_matrix(
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


def svd_basis(matrix: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    centered = matrix - matrix.mean(axis=0, keepdims=True)
    u, singular_values, vt = np.linalg.svd(centered, full_matrices=False)
    rank = int(np.sum(singular_values > max(singular_values[0] * 1e-10, 1e-12)))
    k = max(1, min(TOP_K_REQUESTED, rank))
    return u[:, :k], singular_values[:k], vt.T[:, :k]


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


def verdict(metrics: dict[str, Any]) -> str:
    if metrics["top_k_used"] < TOP_K_REQUESTED:
        return "invalid_rank"
    worst = metrics["left_singular_vectors"]["worst_best_match"]
    subspace = metrics["left_singular_vectors"]["min_principal_angle_cosine"]
    if worst < P2_FALSIFICATION:
        return "falsified"
    if worst >= P2_THRESHOLD and subspace >= P2_THRESHOLD:
        return "pass"
    return "inconclusive"


def analyze_pair(run_dir: Path, pair: dict[str, str], outputs: dict[str, Path]) -> dict[str, Any]:
    first = outputs[pair["from_model"]]
    second = outputs[pair["to_model"]]
    first_raw = load_result(first)
    second_raw = load_result(second)
    refs = first_raw["published_reference"]
    first_rows = load_rows(first)
    second_rows = load_rows(second)
    elements = sorted(set(first_rows) & set(second_rows) & set(refs))
    first_matrix = residual_matrix(first_rows, refs, elements)
    second_matrix = residual_matrix(second_rows, refs, elements)

    u1, s1, v1 = svd_basis(first_matrix)
    u2, s2, v2 = svd_basis(second_matrix)
    k = min(u1.shape[1], u2.shape[1])
    metrics = {
        "pair_id": pair["pair_id"],
        "family": pair["family"],
        "from_model": pair["from_model"],
        "to_model": pair["to_model"],
        "note": pair["note"],
        "n_elements": len(elements),
        "elements": elements,
        "features": ["C11", "C12", "C44"],
        "top_k_requested": TOP_K_REQUESTED,
        "top_k_used": k,
        "from_singular_values": s1[:k].tolist(),
        "to_singular_values": s2[:k].tolist(),
        "left_singular_vectors": compare_bases(u1[:, :k], u2[:, :k]),
        "property_space_pca": compare_bases(v1[:, :k], v2[:, :k]),
        "artifacts": {
            "from_results": str(first),
            "to_results": str(second),
            "run_dir": str(run_dir),
        },
        "runtime": {
            "from": first_raw.get("runtime", {}),
            "to": second_raw.get("runtime", {}),
        },
    }
    metrics["verdict"] = verdict(metrics)
    return metrics


def write_summary(run_dir: Path, results: list[dict[str, Any]]) -> Path:
    payload = {
        "prediction": "P2 generational stability of error directions",
        "local_protocol": (
            "IMMI 15-element elastic-constant residual matrices; top-k=min(5, numerical rank). "
            "Primary metric is best-matched left singular-vector cosine on the element axis."
        ),
        "thresholds": {
            "pass_worst_best_match": P2_THRESHOLD,
            "falsification_worst_best_match": P2_FALSIFICATION,
        },
        "results": results,
        "overall": {
            "n_pairs": len(results),
            "n_pass": sum(1 for r in results if r["verdict"] == "pass"),
            "n_falsified": sum(1 for r in results if r["verdict"] == "falsified"),
            "n_inconclusive": sum(1 for r in results if r["verdict"] == "inconclusive"),
            "n_invalid_rank": sum(1 for r in results if r["verdict"] == "invalid_rank"),
            "verdict": (
                "falsified"
                if any(r["verdict"] == "falsified" for r in results)
                else "pass"
                if all(r["verdict"] == "pass" for r in results)
                else "invalid_rank"
                if all(r["verdict"] == "invalid_rank" for r in results)
                else "mixed"
            ),
        },
    }

    out_json = run_dir / "p2_generational_stability_results.json"
    out_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    lines = [
        "# P2 Generational Stability",
        "",
        f"Run directory: `{run_dir}`",
        "",
        "| pair | verdict | k | left worst-best | left subspace min | property worst-best |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for row in results:
        left = row["left_singular_vectors"]
        prop = row["property_space_pca"]
        lines.append(
            "| {pair} | {verdict} | {k} | {left_worst:.3f} | {left_sub:.3f} | {prop_worst:.3f} |".format(
                pair=row["pair_id"],
                verdict=row["verdict"],
                k=row["top_k_used"],
                left_worst=left["worst_best_match"],
                left_sub=left["min_principal_angle_cosine"],
                prop_worst=prop["worst_best_match"],
            )
        )
    lines.extend(
        [
            "",
            "Primary P2 decision uses left singular vectors, because the theorem states residual directions over configurations.",
            "With only three independent cubic elastic constants this fitted-Cij matrix is a diagnostic only, not a valid WBM top-5 substitute.",
            "",
            f"Overall verdict: `{payload['overall']['verdict']}`",
            "",
        ]
    )
    out_md = run_dir / "p2_generational_stability_results.md"
    out_md.write_text("\n".join(lines), encoding="utf-8")
    return out_json


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda"])
    parser.add_argument("--force", action="store_true", help="recompute all model outputs")
    parser.add_argument(
        "--run-dir",
        default=None,
        help="explicit artifact directory; default creates mlip_immi/runs/p2_generational_<stamp>",
    )
    args = parser.parse_args()

    if args.run_dir:
        run_dir = Path(args.run_dir)
        if not run_dir.is_absolute():
            run_dir = REPO / run_dir
    else:
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        run_dir = HERE / "runs" / f"p2_generational_{stamp}"
    run_dir.mkdir(parents=True, exist_ok=True)
    log_path = run_dir / "run.log"

    needed_models = sorted({p["from_model"] for p in GENERATION_PAIRS} | {p["to_model"] for p in GENERATION_PAIRS})
    outputs: dict[str, Path] = {}
    for model in needed_models:
        out_path = run_dir / MODEL_OUTPUTS[model]
        if not args.force and model in ("mace-mp-0", "orb-v3"):
            existing = HERE / MODEL_OUTPUTS[model]
            if existing.exists():
                shutil.copy2(existing, out_path)
        if args.force or not out_path.exists():
            run_command(
                [
                    sys.executable,
                    str(HERE / "elastic_constants.py"),
                    "--model",
                    model,
                    "--all",
                    "--device",
                    args.device,
                    "--output",
                    str(out_path),
                ],
                cwd=REPO,
                log_path=log_path,
            )
        outputs[model] = out_path

    results = [analyze_pair(run_dir, pair, outputs) for pair in GENERATION_PAIRS]
    summary = write_summary(run_dir, results)
    print(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
