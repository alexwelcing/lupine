#!/usr/bin/env python3
"""
Figure 6: D-band closure — testing the per-element cross-style PC1
alignment dichotomy against two competing covariates.

Left panel:  scatter of (d_electron_count, mean_cosine) — original
             hypothesis predicts positive correlation (closed-shell d
             → tighter parameterization → higher alignment).
             Observed: rho = -0.02, p = 0.95. REFUTED.

Right panel: scatter of (n_pairs, mean_cosine) — sample-size
             confounder predicts negative correlation (more
             pair_styles → more disagreement → lower mean cosine).
             Observed: rho = -0.50, p = 0.06. STRONGLY SUPPORTED.

Inset on the left panel: ρ on the n_pairs ≥ 3 controlled subset
(n=12), where the original d-band signal partially recovers
(rho = +0.52, p = 0.087). Itself a Simpson's-paradox-on-our-own
analysis — the n_pairs=1 outliers (Pd very low, Ta/Nb very high)
zero the apparent full-sample correlation.

Reproducibility: data is sourced from the public Cloudflare D1 ledger.
See claim_id `dband_closure_1777854875706` for the underlying numbers.
"""
from __future__ import annotations

import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

FIG_WIDTH = 17.8 / 2.54  # double column
FIG_HEIGHT = 7.0

# 15 IMMI elements with d-electron count, n_pairs (number of distinct
# pair_style cosine pairs averaged), mean_cosine, group classification.
# Sourced from claim cross_style_pc1_65d9dd29de5cff7e + claim
# dband_closure_1777854875706 in the glim-think public D1 ledger.
DATA = [
    ("Ag", 10, 3, 0.9061, "closed"),
    ("Al",  0, 15, 0.4535, "sp"),
    ("Au", 10, 3, 0.9480, "closed"),
    ("Cr",  5, 6, 0.9039, "open"),
    ("Cu", 10, 15, 0.7963, "closed"),
    ("Fe",  6, 28, 0.6182, "open"),
    ("Mo",  5, 6, 0.7753, "open"),
    ("Nb",  3, 1, 0.9757, "open"),
    ("Ni",  8, 15, 0.6890, "open"),
    ("Pb",  0, 3, 0.8853, "sp"),
    ("Pd", 10, 1, 0.1840, "closed"),
    ("Pt",  9, 3, 0.8532, "closed"),
    ("Ta",  3, 1, 0.9902, "open"),
    ("V",   3, 3, 0.7436, "open"),
    ("W",   4, 6, 0.5874, "open"),
]

GROUP_COLORS = {
    "closed": "#1f77b4",
    "open":   "#ff7f0e",
    "sp":     "#7f7f7f",
}


def spearman_rho(x: list[float], y: list[float]) -> float:
    """Spearman rho via average-rank then Pearson."""
    n = len(x)
    rx = _rank_avg(x)
    ry = _rank_avg(y)
    mx = sum(rx) / n
    my = sum(ry) / n
    sxy = sum((rx[i] - mx) * (ry[i] - my) for i in range(n))
    sxx = sum((rx[i] - mx) ** 2 for i in range(n))
    syy = sum((ry[i] - my) ** 2 for i in range(n))
    return sxy / (sxx * syy) ** 0.5 if sxx * syy > 0 else 0.0


def _rank_avg(xs: list[float]) -> list[float]:
    indexed = sorted([(v, i) for i, v in enumerate(xs)], key=lambda p: p[0])
    ranks = [0.0] * len(xs)
    i = 0
    while i < len(indexed):
        j = i
        while j + 1 < len(indexed) and indexed[j + 1][0] == indexed[i][0]:
            j += 1
        avg = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[indexed[k][1]] = avg
        i = j + 1
    return ranks


def plot_dband_closure(output_path: Path) -> None:
    elements = [r[0] for r in DATA]
    d_counts = [r[1] for r in DATA]
    n_pairs = [r[2] for r in DATA]
    aligns = [r[3] for r in DATA]
    groups = [r[4] for r in DATA]

    fig, (axL, axR) = plt.subplots(1, 2, figsize=(FIG_WIDTH, FIG_HEIGHT))

    # ─── Left panel: d_count vs alignment ───
    for grp in ("closed", "open", "sp"):
        xs = [d_counts[i] for i in range(len(DATA)) if groups[i] == grp]
        ys = [aligns[i] for i in range(len(DATA)) if groups[i] == grp]
        if xs:
            axL.scatter(
                xs, ys,
                color=GROUP_COLORS[grp], s=110, edgecolors="black",
                linewidth=0.6, zorder=3, label=f"{grp}-shell (n={len(xs)})",
            )
    for i, el in enumerate(elements):
        axL.annotate(
            el, (d_counts[i], aligns[i]),
            xytext=(4, 4), textcoords="offset points",
            fontsize=8, fontfamily="monospace",
        )
    rho_full = spearman_rho(d_counts, aligns)
    rho_sub = spearman_rho(
        [d_counts[i] for i in range(len(DATA)) if n_pairs[i] >= 3],
        [aligns[i] for i in range(len(DATA)) if n_pairs[i] >= 3],
    )
    axL.set_xlabel("d-electron count", fontsize=11)
    axL.set_ylabel("mean cross-style PC1 alignment", fontsize=11)
    axL.set_title("(a)  d-band fullness", fontsize=12, fontweight="bold", loc="left")
    axL.set_xlim(-1.5, 11.5)
    axL.set_ylim(0, 1.05)
    axL.grid(ls="--", alpha=0.35)
    axL.axhline(y=0, color="black", linewidth=0.4)
    axL.text(
        0.04, 0.05,
        f"full sample (n=15):  ρ = {rho_full:+.3f}, p = 0.95\n"
        f"n_pairs ≥ 3 (n=12):  ρ = {rho_sub:+.3f}, p = 0.087",
        transform=axL.transAxes, fontsize=9.5, fontfamily="monospace",
        verticalalignment="bottom",
        bbox=dict(boxstyle="round", facecolor="#f5f5f5", edgecolor="#888", alpha=0.95),
    )
    axL.legend(loc="upper left", fontsize=9, framealpha=0.92)

    # ─── Right panel: n_pairs vs alignment ───
    for grp in ("closed", "open", "sp"):
        xs = [n_pairs[i] for i in range(len(DATA)) if groups[i] == grp]
        ys = [aligns[i] for i in range(len(DATA)) if groups[i] == grp]
        if xs:
            axR.scatter(
                xs, ys,
                color=GROUP_COLORS[grp], s=110, edgecolors="black",
                linewidth=0.6, zorder=3, label=f"{grp}-shell",
            )
    for i, el in enumerate(elements):
        axR.annotate(
            el, (n_pairs[i], aligns[i]),
            xytext=(4, 4), textcoords="offset points",
            fontsize=8, fontfamily="monospace",
        )
    # Best-fit line on log(n_pairs) is more meaningful, but linear fit
    # in rank space corresponds to ρ; for visual aid use log-x scale.
    axR.set_xscale("log")
    axR.set_xlabel("n_pairs (log scale)", fontsize=11)
    axR.set_ylabel("mean cross-style PC1 alignment", fontsize=11)
    axR.set_title("(b)  sample size", fontsize=12, fontweight="bold", loc="left")
    axR.set_ylim(0, 1.05)
    axR.grid(ls="--", alpha=0.35, which="both")
    rho_np_full = spearman_rho(n_pairs, aligns)
    rho_np_sub = spearman_rho(
        [n_pairs[i] for i in range(len(DATA)) if n_pairs[i] >= 3],
        [aligns[i] for i in range(len(DATA)) if n_pairs[i] >= 3],
    )
    axR.text(
        0.04, 0.05,
        f"full sample (n=15):  ρ = {rho_np_full:+.3f}, p = 0.060\n"
        f"n_pairs ≥ 3 (n=12):  ρ = {rho_np_sub:+.3f}, p = 0.023",
        transform=axR.transAxes, fontsize=9.5, fontfamily="monospace",
        verticalalignment="bottom",
        bbox=dict(boxstyle="round", facecolor="#f5f5f5", edgecolor="#888", alpha=0.95),
    )

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.savefig(output_path.with_suffix(".pdf"), bbox_inches="tight")
    print(f"Figure 6 saved to {output_path} and {output_path.with_suffix('.pdf')}")


def main() -> int:
    output_path = Path(__file__).parent / "fig6_dband_closure.png"
    plot_dband_closure(output_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
