"""Bootstrap CI on MEAM participation ratio at sample sizes matched to
tersoff and tersoff/zbl, testing whether `hyp_meam_anomaly` survives
sample-size-controlled comparison.

The hypothesis claims MEAM (PR=2.241, n=167) is anomalously high compared
to tersoff (PR=1.008, n=7) and tersoff/zbl (PR=1.000, n=3) at the same
many-body rank. This script subsamples MEAM to those small sample sizes
and reports the distribution of small-n MEAM PR — if a substantial mass
of MEAM at n=7 has PR < 1.5, the apparent anomaly is partly a
small-sample-size artifact (PR is bounded by min(n, d)=min(n, 3)).

Inputs: ../atlas-distill/benchmarks/nist_populated_all.csv
Outputs: meam_bootstrap_results.json
"""
from __future__ import annotations

import csv
import json
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

import numpy as np


HERE = Path(__file__).parent
CSV_PATH = HERE.parent / "atlas-distill" / "benchmarks" / "nist_populated_all.csv"

PROPERTIES = ("C11", "C12", "C44")
RAND_SEED = 0xC0FFEE


@dataclass(frozen=True)
class ErrorVector:
    pair_style: str
    potential: str
    element: str
    e_C11: float
    e_C12: float
    e_C44: float

    def as_array(self) -> np.ndarray:
        return np.array([self.e_C11, self.e_C12, self.e_C44], dtype=np.float64)


def participation_ratio(matrix: np.ndarray) -> float:
    """PR of the eigenvalue spectrum of the column-covariance of `matrix`.

    matrix shape: (n_samples, n_features). Returns (Σλᵢ)² / Σλᵢ².
    Returns NaN if n_samples < 2 (covariance undefined).
    """
    if matrix.shape[0] < 2:
        return float("nan")
    cov = np.cov(matrix, rowvar=False, ddof=1)
    eigvals = np.linalg.eigvalsh(cov)
    eigvals = eigvals[eigvals > 1e-12]
    if eigvals.size == 0:
        return float("nan")
    s = float(np.sum(eigvals))
    s2 = float(np.sum(eigvals ** 2))
    if s2 == 0.0:
        return float("nan")
    return s * s / s2


def load_error_vectors(csv_path: Path) -> list[ErrorVector]:
    """Group by (pair_style, potential, element); emit one ErrorVector per
    triple that has all three properties present with valid reference."""
    by_key: dict[tuple[str, str, str], dict[str, tuple[float, float]]] = defaultdict(dict)
    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                ref = float(row["reference"])
                pred = float(row["predicted"])
            except (ValueError, KeyError):
                continue
            if ref == 0.0:
                continue
            prop = row["property"]
            if prop not in PROPERTIES:
                continue
            key = (row["pair_style"], row["potential"], row["material"])
            by_key[key][prop] = (ref, pred)

    out: list[ErrorVector] = []
    for (pair_style, potential, element), props in by_key.items():
        if not all(p in props for p in PROPERTIES):
            continue
        e = {p: (props[p][1] - props[p][0]) / props[p][0] for p in PROPERTIES}
        out.append(ErrorVector(
            pair_style=pair_style, potential=potential, element=element,
            e_C11=e["C11"], e_C12=e["C12"], e_C44=e["C44"],
        ))
    return out


def matrix_for(vectors: list[ErrorVector], pair_style: str) -> np.ndarray:
    rows = [v.as_array() for v in vectors if v.pair_style == pair_style]
    return np.array(rows, dtype=np.float64) if rows else np.empty((0, 3))


def bootstrap_pr(
    matrix: np.ndarray,
    sample_size: int,
    n_iterations: int,
    rng: np.random.Generator,
    replace: bool = True,
) -> np.ndarray:
    """Resample `sample_size` rows from `matrix` `n_iterations` times.

    Default is bootstrap (with replacement). For matched-n subsampling
    against a smaller comparator, pass `replace=False` so each draw
    represents a fresh subsample of distinct potentials.
    """
    n = matrix.shape[0]
    if sample_size > n and not replace:
        sample_size = n
    out = np.empty(n_iterations, dtype=np.float64)
    for i in range(n_iterations):
        idx = rng.choice(n, size=sample_size, replace=replace)
        out[i] = participation_ratio(matrix[idx])
    return out


def summarize(arr: np.ndarray) -> dict[str, float]:
    arr = arr[~np.isnan(arr)]
    if arr.size == 0:
        return {"n": 0}
    return {
        "n": int(arr.size),
        "mean": float(arr.mean()),
        "median": float(np.median(arr)),
        "p05": float(np.quantile(arr, 0.05)),
        "p25": float(np.quantile(arr, 0.25)),
        "p75": float(np.quantile(arr, 0.75)),
        "p95": float(np.quantile(arr, 0.95)),
        "min": float(arr.min()),
        "max": float(arr.max()),
        "frac_le_1p1": float(np.mean(arr <= 1.1)),
        "frac_le_1p5": float(np.mean(arr <= 1.5)),
    }


def main() -> None:
    rng = np.random.default_rng(RAND_SEED)
    vectors = load_error_vectors(CSV_PATH)

    families = ["meam", "tersoff", "tersoff/zbl", "adp", "eam", "eam/alloy", "eam/fs"]
    matrices = {fam: matrix_for(vectors, fam) for fam in families}
    full_pr = {fam: participation_ratio(m) for fam, m in matrices.items()}

    meam = matrices["meam"]
    n_meam = meam.shape[0]
    n_tersoff = matrices["tersoff"].shape[0]
    n_tersoff_zbl = matrices["tersoff/zbl"].shape[0]

    n_iterations = 10_000

    # Match to small-n competitors — without-replacement subsampling
    meam_at_tersoff_n = bootstrap_pr(meam, n_tersoff, n_iterations, rng, replace=False)
    meam_at_tersoff_zbl_n = bootstrap_pr(meam, n_tersoff_zbl, n_iterations, rng, replace=False)
    meam_at_n7 = bootstrap_pr(meam, 7, n_iterations, rng, replace=False)

    # Full-n MEAM CI — with-replacement bootstrap
    meam_full_pr_resamples = bootstrap_pr(meam, n_meam, n_iterations, rng, replace=True)

    summary = {
        "csv_source": str(CSV_PATH.resolve().as_posix()),
        "n_iterations": n_iterations,
        "rand_seed": RAND_SEED,
        "row_counts_per_pair_style": {fam: int(m.shape[0]) for fam, m in matrices.items()},
        "full_PR": full_pr,
        "tersoff_full_pr": full_pr["tersoff"],
        "tersoff_zbl_full_pr": full_pr["tersoff/zbl"],
        "meam_full_pr_observed": full_pr["meam"],
        "meam_full_pr_bootstrap_ci": summarize(meam_full_pr_resamples),
        "meam_at_tersoff_n_distribution": {
            "sample_size": n_tersoff,
            **summarize(meam_at_tersoff_n),
            "frac_le_tersoff_PR": float(np.mean(meam_at_tersoff_n <= full_pr["tersoff"])),
        },
        "meam_at_tersoff_zbl_n_distribution": {
            "sample_size": n_tersoff_zbl,
            **summarize(meam_at_tersoff_zbl_n),
            "frac_le_tersoff_zbl_PR": float(np.mean(meam_at_tersoff_zbl_n <= full_pr["tersoff/zbl"])),
        },
        "meam_at_n7_distribution": {
            "sample_size": 7,
            **summarize(meam_at_n7),
            "frac_le_1p1": float(np.mean(meam_at_n7 <= 1.1)),
            "frac_le_1p5": float(np.mean(meam_at_n7 <= 1.5)),
        },
        "interpretation_threshold": (
            "If MEAM's small-n PR distribution places nontrivial mass at or below the "
            "tersoff/tersoff-zbl observed PR, the 'MEAM anomaly' is partly a small-sample "
            "artifact: PR is mechanically bounded by min(n, 3) and the 3x3 covariance "
            "estimate is high-variance below n=10."
        ),
    }

    out_path = HERE / "meam_bootstrap_results.json"
    out_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"wrote {out_path}")

    print(f"\nMEAM observed PR:        {full_pr['meam']:.3f} (n={n_meam})")
    print(f"tersoff observed PR:     {full_pr['tersoff']:.3f} (n={n_tersoff})")
    print(f"tersoff/zbl observed PR: {full_pr['tersoff/zbl']:.3f} (n={n_tersoff_zbl})")
    print()
    print(f"MEAM full-n bootstrap PR 95% CI: "
          f"[{summary['meam_full_pr_bootstrap_ci']['p05']:.3f}, "
          f"{summary['meam_full_pr_bootstrap_ci']['p95']:.3f}]")
    print()
    d = summary["meam_at_tersoff_n_distribution"]
    print(f"MEAM at n={n_tersoff} (matched to tersoff):     "
          f"median={d['median']:.3f}, p05={d['p05']:.3f}, p95={d['p95']:.3f}")
    print(f"  P(MEAM at n={n_tersoff} <= tersoff PR={full_pr['tersoff']:.3f}) = "
          f"{d['frac_le_tersoff_PR']:.3f}")
    print(f"  P(MEAM at n={n_tersoff} <= 1.1) = {d['frac_le_1p1']:.3f}")
    d = summary["meam_at_tersoff_zbl_n_distribution"]
    print(f"MEAM at n={n_tersoff_zbl} (matched to tersoff/zbl): "
          f"median={d['median']:.3f}, p05={d['p05']:.3f}, p95={d['p95']:.3f}")
    print(f"  P(MEAM at n={n_tersoff_zbl} <= tersoff/zbl PR={full_pr['tersoff/zbl']:.3f}) = "
          f"{d['frac_le_tersoff_zbl_PR']:.3f}")
    d = summary["meam_at_n7_distribution"]
    print(f"MEAM at n=7 (original tersoff claim): "
          f"median={d['median']:.3f}, p05={d['p05']:.3f}, p95={d['p95']:.3f}")
    print(f"  P(MEAM at n=7 <= 1.1) = {d['frac_le_1p1']:.3f}")
    print(f"  P(MEAM at n=7 <= 1.5) = {d['frac_le_1p5']:.3f}")


if __name__ == "__main__":
    main()
