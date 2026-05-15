"""Cross-MLIP cosine alignment analysis on the IMMI 15-element corpus.

Tests `hyp_mlip_alignment_test`: do MLIPs (MACE-MP-0, CHGNet, Orb-v3, PET-MAD)
reproduce the round-1 cross-style PC1 dichotomy when treated as additional
pair_style families? Predicts strong-alignment elements (Au, Ta, Nb, Ag, Cr,
Pb, Pt) keep high cross-MLIP cosine; weak-alignment elements (Al, W, Fe, Ni)
keep low cosine.

Also tests `hyp_orthogonal_mlip_errors`: cross-MLIP cosines on Pt/Ag/Pb/Nb
should be low because the LAM-trio closure observed non-monotonic PR there.

Method: per element, build a 3-vector of relative errors
(pred/ref - 1) for (C11, C12, C44) per MLIP, normalize to unit, compute
all pairwise cosines across available models, report mean.

Outputs:
    mlip_immi/cross_mlip_alignment_results.json   (per-element + summary stats)
    mlip_immi/cross_mlip_alignment_claim.json     (worker /claims/ingest payload)
"""
from __future__ import annotations

import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Mapping

import numpy as np


HERE = Path(__file__).parent

# Reference DFT/experimental C_ij per element (from elastic_constants.py).
PUBLISHED_C_IJ: Mapping[str, Mapping[str, float]] = {
    "Cu": {"C11": 169.0, "C12": 122.0, "C44": 75.3},
    "Al": {"C11": 107.0, "C12": 60.9, "C44": 28.3},
    "Ni": {"C11": 247.0, "C12": 153.0, "C44": 122.0},
    "Au": {"C11": 192.4, "C12": 162.9, "C44": 39.8},
    "Ag": {"C11": 124.0, "C12": 93.4, "C44": 46.1},
    "Pt": {"C11": 346.7, "C12": 250.7, "C44": 76.5},
    "Pd": {"C11": 234.1, "C12": 176.1, "C44": 71.2},
    "Pb": {"C11": 49.5, "C12": 42.3, "C44": 14.9},
    "Fe": {"C11": 230.0, "C12": 135.0, "C44": 117.0},
    "Cr": {"C11": 350.0, "C12": 67.0, "C44": 100.8},
    "Mo": {"C11": 463.7, "C12": 157.8, "C44": 109.2},
    "W":  {"C11": 522.4, "C12": 204.4, "C44": 160.6},
    "V":  {"C11": 232.4, "C12": 119.4, "C44": 43.7},
    "Nb": {"C11": 246.5, "C12": 134.5, "C44": 28.7},
    "Ta": {"C11": 266.3, "C12": 158.2, "C44": 87.4},
}

# Round-1 cross-style PC1 mean_cosine per element (from claim
# cross_style_pc1_65d9dd29de5cff7e). The dichotomy that we want to test
# whether MLIPs reproduce.
CLASSICAL_MEAN_COSINE: Mapping[str, float] = {
    "Ag": 0.9061, "Al": 0.4535, "Au": 0.9480, "Cr": 0.9039,
    "Cu": 0.7963, "Fe": 0.6182, "Mo": 0.7753, "Nb": 0.9757,
    "Ni": 0.6890, "Pb": 0.8853, "Pd": 0.1840, "Pt": 0.8532,
    "Ta": 0.9902, "V":  0.7436, "W":  0.5874,
}

# Round-1 dichotomy groupings.
STRONG_CLASSICAL = ("Au", "Ta", "Nb", "Ag", "Cr", "Pb", "Pt")  # >= 0.85
WEAK_CLASSICAL = ("Al", "W", "Fe", "Ni")                       # < 0.70

# Elements where hyp_orthogonal_mlip_errors predicts low cross-MLIP cosine.
ORTHOGONAL_PREDICTED = ("Pt", "Ag", "Pb", "Nb")


@dataclass(frozen=True)
class ElementAlignment:
    element: str
    classical_mean_cosine: float
    error_vectors: dict[str, tuple[float, float, float]]  # model_name -> (e11, e12, e44)
    pairwise_cosines: dict[str, float]  # "model_a-model_b" -> cosine
    mlip_mean_cosine: float
    mlip_min_cosine: float
    mlip_max_cosine: float
    n_models: int


def _load_results(path: Path) -> dict[str, dict[str, float]]:
    """Return {element: {"C11": ..., "C12": ..., "C44": ...}} from a results JSON."""
    raw = json.loads(path.read_text(encoding="utf-8"))
    out: dict[str, dict[str, float]] = {}
    for row in raw["results"]:
        if any(c in row.get("failures", []) for c in ()):
            continue
        out[row["element"]] = {
            "C11": float(row["C11"]),
            "C12": float(row["C12"]),
            "C44": float(row["C44"]),
        }
    return out


def _relative_error_vector(
    pred: Mapping[str, float], ref: Mapping[str, float]
) -> np.ndarray:
    """Return (e11, e12, e44) where e_ij = pred/ref - 1."""
    return np.array([
        pred["C11"] / ref["C11"] - 1.0,
        pred["C12"] / ref["C12"] - 1.0,
        pred["C44"] / ref["C44"] - 1.0,
    ], dtype=np.float64)


def _unit(v: np.ndarray) -> np.ndarray:
    n = float(np.linalg.norm(v))
    if n == 0.0:
        raise ValueError("zero error vector — cannot normalize (perfect prediction?)")
    return v / n


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(_unit(a), _unit(b)))


def _spearman(xs: list[float], ys: list[float]) -> tuple[float, float]:
    """Spearman rho with average ranks; t-distribution p-value approximation."""
    n = len(xs)
    if n < 3:
        return float("nan"), float("nan")
    rx = _ranks(xs)
    ry = _ranks(ys)
    rx_arr = np.array(rx, dtype=np.float64)
    ry_arr = np.array(ry, dtype=np.float64)
    rx_arr -= rx_arr.mean()
    ry_arr -= ry_arr.mean()
    denom = float(np.sqrt(float(np.sum(rx_arr ** 2)) * float(np.sum(ry_arr ** 2))))
    if denom == 0.0:
        return 0.0, 1.0
    rho = float(np.sum(rx_arr * ry_arr) / denom)
    # t-distribution approximation
    if abs(rho) >= 1.0:
        return rho, 0.0
    t = rho * math.sqrt((n - 2) / (1 - rho ** 2))
    p = 2.0 * (1.0 - _student_t_cdf(abs(t), n - 2))
    return rho, p


def _ranks(xs: list[float]) -> list[float]:
    ordered = sorted(range(len(xs)), key=lambda i: xs[i])
    ranks = [0.0] * len(xs)
    i = 0
    while i < len(ordered):
        j = i
        while j + 1 < len(ordered) and xs[ordered[j + 1]] == xs[ordered[i]]:
            j += 1
        avg = (i + j) / 2.0 + 1.0  # 1-indexed average
        for k in range(i, j + 1):
            ranks[ordered[k]] = avg
        i = j + 1
    return ranks


def _student_t_cdf(t: float, df: int) -> float:
    """Student-t CDF via incomplete beta. df > 0 assumed."""
    x = df / (df + t ** 2)
    ib = _betainc_regularized(df / 2.0, 0.5, x)
    return 1.0 - 0.5 * ib


def _betainc_regularized(a: float, b: float, x: float) -> float:
    """Regularized incomplete beta I_x(a,b) via continued fraction."""
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0
    lbeta = math.lgamma(a) + math.lgamma(b) - math.lgamma(a + b)
    front = math.exp(math.log(x) * a + math.log(1 - x) * b - lbeta) / a
    # Continued fraction (Lentz's method)
    fpmin = 1e-300
    qab, qap, qam = a + b, a + 1.0, a - 1.0
    c = 1.0
    d = 1.0 - qab * x / qap
    if abs(d) < fpmin:
        d = fpmin
    d = 1.0 / d
    h = d
    for m in range(1, 200):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1.0 + aa * d
        if abs(d) < fpmin:
            d = fpmin
        c = 1.0 + aa / c
        if abs(c) < fpmin:
            c = fpmin
        d = 1.0 / d
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1.0 + aa * d
        if abs(d) < fpmin:
            d = fpmin
        c = 1.0 + aa / c
        if abs(c) < fpmin:
            c = fpmin
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < 1e-12:
            break
    return front * h


# ─── Model registry (auto-discovered) ─────────────────────────────────

# Ordered list of (short_name, results_filename) — any that exist on disk
# are included in the analysis.
_MODEL_FILES = [
    ("mace",      "mace_immi_results.json"),
    ("chgnet",    "chgnet_immi_results.json"),
    ("orb",       "orb_v3_immi_results.json"),
    ("pet-mad",   "pet_mad_immi_results.json"),
    ("pet-mad-1.5", "pet_mad_1.5_immi_results.json"),
]


def _discover_models() -> dict[str, dict[str, dict[str, float]]]:
    """Return {model_name: {element: {C11, C12, C44}}} for every result file found."""
    available: dict[str, dict[str, dict[str, float]]] = {}
    for name, fname in _MODEL_FILES:
        path = HERE / fname
        if path.exists():
            available[name] = _load_results(path)
            print(f"  + loaded {name} from {fname} ({len(available[name])} elements)")
        else:
            print(f"  - {name}: {fname} not found, skipping")
    return available


def main() -> None:
    print("Discovering MLIP result files...")
    models = _discover_models()

    if len(models) < 2:
        print("\nNeed at least 2 MLIP result files for pairwise alignment. Aborting.")
        return

    model_names = list(models.keys())
    print(f"\nRunning {len(model_names)}-model alignment: {', '.join(model_names)}")

    # Elements present in ALL loaded models
    elements = sorted(
        set.intersection(*(set(d.keys()) for d in models.values()))
        & set(PUBLISHED_C_IJ)
    )
    print(f"Common elements: {len(elements)} — {', '.join(elements)}")

    # All ordered pairs for pairwise cosine
    from itertools import combinations
    pair_keys = list(combinations(model_names, 2))

    rows: list[ElementAlignment] = []
    for el in elements:
        ref = PUBLISHED_C_IJ[el]
        error_vecs: dict[str, np.ndarray] = {}
        for name in model_names:
            error_vecs[name] = _relative_error_vector(models[name][el], ref)

        pairwise: dict[str, float] = {}
        for a, b in pair_keys:
            key = f"{a}-{b}"
            pairwise[key] = _cosine(error_vecs[a], error_vecs[b])

        cosines = list(pairwise.values())
        rows.append(ElementAlignment(
            element=el,
            classical_mean_cosine=float(CLASSICAL_MEAN_COSINE.get(el, float("nan"))),
            error_vectors={
                name: tuple(float(x) for x in vec)
                for name, vec in error_vecs.items()
            },
            pairwise_cosines=pairwise,
            mlip_mean_cosine=float(np.mean(cosines)),
            mlip_min_cosine=float(min(cosines)),
            mlip_max_cosine=float(max(cosines)),
            n_models=len(model_names),
        ))

    by_el = {r.element: r for r in rows}

    def group_mean(elements: tuple[str, ...]) -> float:
        present = [by_el[e].mlip_mean_cosine for e in elements if e in by_el]
        return float(np.mean(present)) if present else float("nan")

    classical_xs = [r.classical_mean_cosine for r in rows if not np.isnan(r.classical_mean_cosine)]
    mlip_ys = [r.mlip_mean_cosine for r in rows if not np.isnan(r.classical_mean_cosine)]
    rho, p = _spearman(classical_xs, mlip_ys)

    summary = {
        "n_elements": len(rows),
        "n_models": len(model_names),
        "models": model_names,
        "pairwise_keys": [f"{a}-{b}" for a, b in pair_keys],
        "spearman_rho_classical_vs_mlip": rho,
        "spearman_p": p,
        "group_mlip_mean_cosine_strong_classical": group_mean(STRONG_CLASSICAL),
        "group_mlip_mean_cosine_weak_classical": group_mean(WEAK_CLASSICAL),
        "group_mlip_mean_cosine_orthogonal_predicted": group_mean(ORTHOGONAL_PREDICTED),
        "per_element": [asdict(r) for r in rows],
        "method": (
            f"Per element, relative-error vector (predC11/refC11-1, predC12/refC12-1, "
            f"predC44/refC44-1) computed for {' / '.join(model_names)} against "
            f"PUBLISHED_C_IJ (Simmons & Wang 1971 / Materials Project). Vectors normalized "
            f"to unit. All {len(pair_keys)} pairwise cosine similarities computed. "
            f"Mean cross-MLIP cosine per element. Compared against classical cross-style "
            f"PC1 mean_cosine from claim cross_style_pc1_65d9dd29de5cff7e via Spearman rho."
        ),
        "references_source": (
            "PUBLISHED_C_IJ table in mlip_immi/elastic_constants.py — Simmons & Wang 1971 "
            "for FCC, Materials Project + Simmons for BCC."
        ),
        "classical_baseline_claim": "cross_style_pc1_65d9dd29de5cff7e",
    }

    out_path = HERE / "cross_mlip_alignment_results.json"
    out_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"\nwrote {out_path}")

    # Pretty-print summary
    print(f"\nn_elements: {len(rows)}, n_models: {len(model_names)}")
    print(f"Spearman rho (classical mean_cos vs MLIP mean_cos): {rho:.3f} (p={p:.3f})")
    print(f"strong-classical group MLIP mean_cos: {summary['group_mlip_mean_cosine_strong_classical']:.3f}")
    print(f"weak-classical group MLIP mean_cos:   {summary['group_mlip_mean_cosine_weak_classical']:.3f}")
    print(f"orthogonal-predicted group:           {summary['group_mlip_mean_cosine_orthogonal_predicted']:.3f}")
    print()

    # Header line
    pair_labels = [f"{a[:3]}-{b[:3]}" for a, b in pair_keys]
    hdr = f"{'el':>4} {'classical':>9} {'mlip_mean':>9} {'min':>7} {'max':>7}  " + "  ".join(
        f"{lbl:>8}" for lbl in pair_labels
    )
    print(hdr)
    for r in sorted(rows, key=lambda x: -x.classical_mean_cosine):
        pair_vals = "  ".join(
            f"{r.pairwise_cosines[k]:>+8.3f}" for k in r.pairwise_cosines
        )
        print(
            f"{r.element:>4} {r.classical_mean_cosine:>9.3f} {r.mlip_mean_cosine:>9.3f}"
            f" {r.mlip_min_cosine:>7.3f} {r.mlip_max_cosine:>7.3f}  {pair_vals}"
        )


if __name__ == "__main__":
    main()
