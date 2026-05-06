"""Cross-MLIP cosine alignment analysis on the IMMI 15-element corpus.

Tests `hyp_mlip_alignment_test`: do MLIPs (MACE-MP-0, CHGNet, Orb-v3)
reproduce the round-1 cross-style PC1 dichotomy when treated as additional
pair_style families? Predicts strong-alignment elements (Au, Ta, Nb, Ag, Cr,
Pb, Pt) keep high cross-MLIP cosine; weak-alignment elements (Al, W, Fe, Ni)
keep low cosine.

Also tests `hyp_orthogonal_mlip_errors`: cross-MLIP cosines on Pt/Ag/Pb/Nb
should be low because the LAM-trio closure observed non-monotonic PR there.

Method: per element, build a 3-vector of relative errors
(pred/ref - 1) for (C11, C12, C44) per MLIP, normalize to unit, compute
pairwise cosines (MACE-CHGNet, MACE-Orb, CHGNet-Orb), report mean.

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
    error_vec_mace: tuple[float, float, float]
    error_vec_chgnet: tuple[float, float, float]
    error_vec_orb: tuple[float, float, float]
    cos_mace_chgnet: float
    cos_mace_orb: float
    cos_chgnet_orb: float
    mlip_mean_cosine: float
    mlip_min_cosine: float
    mlip_max_cosine: float


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


def main() -> None:
    mace = _load_results(HERE / "mace_immi_results.json")
    chgnet = _load_results(HERE / "chgnet_immi_results.json")
    orb = _load_results(HERE / "orb_v3_immi_results.json")

    elements = sorted(set(mace) & set(chgnet) & set(orb) & set(PUBLISHED_C_IJ))
    rows: list[ElementAlignment] = []
    for el in elements:
        ref = PUBLISHED_C_IJ[el]
        e_mace = _relative_error_vector(mace[el], ref)
        e_chgnet = _relative_error_vector(chgnet[el], ref)
        e_orb = _relative_error_vector(orb[el], ref)
        c_mc = _cosine(e_mace, e_chgnet)
        c_mo = _cosine(e_mace, e_orb)
        c_co = _cosine(e_chgnet, e_orb)
        cosines = (c_mc, c_mo, c_co)
        rows.append(ElementAlignment(
            element=el,
            classical_mean_cosine=float(CLASSICAL_MEAN_COSINE[el]),
            error_vec_mace=tuple(float(x) for x in e_mace),
            error_vec_chgnet=tuple(float(x) for x in e_chgnet),
            error_vec_orb=tuple(float(x) for x in e_orb),
            cos_mace_chgnet=c_mc,
            cos_mace_orb=c_mo,
            cos_chgnet_orb=c_co,
            mlip_mean_cosine=float(np.mean(cosines)),
            mlip_min_cosine=float(min(cosines)),
            mlip_max_cosine=float(max(cosines)),
        ))

    by_el = {r.element: r for r in rows}

    def group_mean(elements: tuple[str, ...]) -> float:
        present = [by_el[e].mlip_mean_cosine for e in elements if e in by_el]
        return float(np.mean(present)) if present else float("nan")

    classical_xs = [r.classical_mean_cosine for r in rows]
    mlip_ys = [r.mlip_mean_cosine for r in rows]
    rho, p = _spearman(classical_xs, mlip_ys)

    summary = {
        "n_elements": len(rows),
        "spearman_rho_classical_vs_mlip": rho,
        "spearman_p": p,
        "group_mlip_mean_cosine_strong_classical": group_mean(STRONG_CLASSICAL),
        "group_mlip_mean_cosine_weak_classical": group_mean(WEAK_CLASSICAL),
        "group_mlip_mean_cosine_orthogonal_predicted": group_mean(ORTHOGONAL_PREDICTED),
        "per_element": [asdict(r) for r in rows],
        "method": (
            "Per element, relative-error vector (predC11/refC11-1, predC12/refC12-1, "
            "predC44/refC44-1) computed for MACE-MP-0 / CHGNet / Orb-v3 against "
            "PUBLISHED_C_IJ (Simmons & Wang 1971 / Materials Project). Vectors normalized "
            "to unit. Pairwise cosine similarity per (MACE-CHGNet, MACE-Orb, CHGNet-Orb). "
            "Mean cross-MLIP cosine per element. Compared against classical cross-style "
            "PC1 mean_cosine from claim cross_style_pc1_65d9dd29de5cff7e via Spearman rho."
        ),
        "references_source": (
            "PUBLISHED_C_IJ table in mlip_immi/elastic_constants.py — Simmons & Wang 1971 "
            "for FCC, Materials Project + Simmons for BCC."
        ),
        "classical_baseline_claim": "cross_style_pc1_65d9dd29de5cff7e",
    }

    out_path = HERE / "cross_mlip_alignment_results.json"
    out_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"wrote {out_path}")

    # Pretty-print summary
    print(f"\nn_elements: {len(rows)}")
    print(f"Spearman rho (classical mean_cos vs MLIP mean_cos): {rho:.3f} (p={p:.3f})")
    print(f"strong-classical group MLIP mean_cos: {summary['group_mlip_mean_cosine_strong_classical']:.3f}")
    print(f"weak-classical group MLIP mean_cos:   {summary['group_mlip_mean_cosine_weak_classical']:.3f}")
    print(f"orthogonal-predicted group:           {summary['group_mlip_mean_cosine_orthogonal_predicted']:.3f}")
    print()
    print(f"{'element':>4} {'classical':>9} {'mlip_mean':>9} {'min':>7} {'max':>7}  cosines (MC,MO,CO)")
    for r in sorted(rows, key=lambda x: -x.classical_mean_cosine):
        print(
            f"{r.element:>4} {r.classical_mean_cosine:>9.3f} {r.mlip_mean_cosine:>9.3f}"
            f" {r.mlip_min_cosine:>7.3f} {r.mlip_max_cosine:>7.3f}"
            f"  ({r.cos_mace_chgnet:+.3f}, {r.cos_mace_orb:+.3f}, {r.cos_chgnet_orb:+.3f})"
        )


if __name__ == "__main__":
    main()
