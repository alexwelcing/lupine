#!/usr/bin/env python3
"""
Generate all publication figures for the IMMI paper from real NIST/OpenKIM data.

Reads:
  - atlas-distill/benchmark_manifold.json  (manifold analysis)
  - atlas-distill/benchmark_meta.json      (meta-analysis)
  - atlas-distill/benchmarks/nist_populated_all.csv (benchmark data)

Outputs:
  - fig1_eigenvalue_spectra.{png,pdf}
  - fig2_dimensionality.{png,pdf}
  - fig3_bcc_fcc_dichotomy.{png,pdf}
  - fig4_forest.{png,pdf}
  - fig5_pairstyle.{png,pdf}
"""
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.lines import Line2D
import numpy as np

# ── Style ──────────────────────────────────────────────────────────────────
plt.rcParams.update({
    "font.family": "serif",
    "font.size": 10,
    "axes.titlesize": 11,
    "axes.labelsize": 10,
    "xtick.labelsize": 9,
    "ytick.labelsize": 9,
    "legend.fontsize": 8,
    "figure.dpi": 300,
    "savefig.dpi": 300,
    "savefig.bbox": "tight",
})

SINGLE_COL = 8.5 / 2.54   # inches
DOUBLE_COL = 17.8 / 2.54  # inches

ROOT = Path(__file__).resolve().parent.parent.parent
MANIFOLD_JSON = ROOT / "atlas-distill" / "benchmark_manifold.json"
META_JSON     = ROOT / "atlas-distill" / "benchmark_meta.json"
BENCH_CSV     = ROOT / "atlas-distill" / "benchmarks" / "nist_populated_all.csv"
OUT_DIR       = Path(__file__).resolve().parent

BCC_ELEMENTS = {"Fe", "Cr", "Mo", "W", "V", "Nb", "Ta"}
FCC_ELEMENTS = {"Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb"}

# Curated palette
PAL = {
    "bcc": "#e74c3c",
    "fcc": "#3498db",
    "fixed": "#c0392b",
    "random": "#27ae60",
    "group": "#2c3e50",
    "bg": "#fafafa",
}


def save(fig, name):
    for ext in (".png", ".pdf"):
        fig.savefig(OUT_DIR / f"{name}{ext}")
    print(f"  -> {name}.png / .pdf")
    plt.close(fig)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  Fig 1: Eigenvalue spectra (selected multi-element potentials)         ║
# ╚══════════════════════════════════════════════════════════════════════════╝
def fig1_eigenvalue_spectra(manifold):
    # Pick 5 representative potentials with different PR values
    # Filter to those with >= 3 materials for statistical weight
    candidates = [e for e in manifold if e.get("n_materials", 0) >= 3]
    candidates.sort(key=lambda e: e["effective_dimensionality"])

    # Select spread: lowest PR, median, highest, plus two notables
    if len(candidates) >= 5:
        picks = [
            candidates[0],                          # lowest PR
            candidates[len(candidates)//4],          # Q1
            candidates[len(candidates)//2],          # median
            candidates[3*len(candidates)//4],        # Q3
            candidates[-1],                          # highest PR
        ]
    else:
        picks = candidates[:5]

    colors = ["#2ecc71", "#3498db", "#9b59b6", "#e67e22", "#e74c3c"]
    markers = ["o", "s", "^", "D", "v"]

    fig, ax = plt.subplots(figsize=(DOUBLE_COL, 4.5))

    for i, entry in enumerate(picks):
        evs = np.array(entry["eigenvalues"])
        idx = np.arange(1, len(evs) + 1)
        pr = entry["effective_dimensionality"]
        r2 = entry["log_r_squared"]
        name = entry["potential"]
        if len(name) > 25:
            name = name[:22] + "..."

        ax.scatter(idx, evs, color=colors[i], marker=markers[i], s=70, zorder=3,
                   label=f"{name} (PR={pr:.2f}, R\u00b2={r2:.3f})")

        # Fit line
        slope = entry["log_slope"]
        intercept = entry["log_intercept"]
        fit = np.exp(intercept + slope * (idx - 1))
        ax.plot(idx, fit, color=colors[i], ls="--", lw=1.2, alpha=0.6)

    ax.set_yscale("log")
    ax.set_xlabel("Eigenvalue index $i$")
    ax.set_ylabel("Eigenvalue $\\lambda_i$ (GPa$^2$)")
    ax.set_title("Elastic constant error eigenvalue spectra (real NIST/OpenKIM data)")
    ax.set_xticks([1, 2, 3])
    ax.legend(loc="upper right", framealpha=0.9)
    ax.grid(True, which="both", ls="--", alpha=0.3)
    save(fig, "fig1_eigenvalue_spectra")


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  Fig 2: Dimensionality distribution across all potentials              ║
# ╚══════════════════════════════════════════════════════════════════════════╝
def fig2_dimensionality(manifold):
    prs = [e["effective_dimensionality"] for e in manifold]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(DOUBLE_COL, 4.0))

    # Histogram
    ax1.hist(prs, bins=20, color="#3498db", edgecolor="white", alpha=0.85)
    ax1.axvline(np.median(prs), color="#e74c3c", ls="--", lw=1.5,
                label=f"Median = {np.median(prs):.2f}")
    ax1.axvline(3.0, color="#95a5a6", ls=":", lw=1, label="Full 3D")
    ax1.set_xlabel("Effective dimensionality (PR / 3)")
    ax1.set_ylabel("Count")
    ax1.set_title(f"Distribution (N = {len(prs)})")
    ax1.legend()

    # Sorted bar
    sorted_prs = sorted(prs)
    ax2.barh(range(len(sorted_prs)), sorted_prs, color="#3498db", alpha=0.6, height=1.0)
    ax2.axvline(3.0, color="#95a5a6", ls=":", lw=1)
    ax2.set_xlabel("Effective dimensionality (PR)")
    ax2.set_ylabel("Potential rank")
    ax2.set_title("All potentials, sorted by PR")
    ax2.set_xlim(0, 3.2)

    fig.suptitle("Hyper-ribbon dimensionality across 559 real potentials", fontweight="bold", y=1.02)
    plt.tight_layout()
    save(fig, "fig2_dimensionality")


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  Fig 3: BCC vs FCC dichotomy scatter                                   ║
# ╚══════════════════════════════════════════════════════════════════════════╝
def fig3_bcc_fcc_dichotomy(meta):
    groups = meta["random_effects"]["group_results"]

    fig, ax = plt.subplots(figsize=(SINGLE_COL * 1.6, 5.5))

    bcc_data = [(g["group_id"], g["r"], g["n"]) for g in groups if g["group_id"] in BCC_ELEMENTS]
    fcc_data = [(g["group_id"], g["r"], g["n"]) for g in groups if g["group_id"] in FCC_ELEMENTS]

    # Sort each by r
    bcc_data.sort(key=lambda x: -x[1])
    fcc_data.sort(key=lambda x: -x[1])

    all_data = bcc_data + fcc_data
    y_pos = list(range(len(all_data)))
    labels = [d[0] for d in all_data]
    rs = [d[1] for d in all_data]
    ns = [d[2] for d in all_data]

    # CI from Fisher z
    for i, (lbl, r, n) in enumerate(all_data):
        z = np.arctanh(r)
        se = 1.0 / np.sqrt(n - 3)
        ci_lo = np.tanh(z - 1.96 * se)
        ci_hi = np.tanh(z + 1.96 * se)
        color = PAL["bcc"] if lbl in BCC_ELEMENTS else PAL["fcc"]

        ax.plot([ci_lo, ci_hi], [i, i], color=color, lw=2.5, solid_capstyle="round")
        ax.scatter(r, i, color=color, s=70, zorder=3, edgecolors="white", linewidth=0.8)
        ax.text(max(ci_hi + 0.03, r + 0.05), i, f"n={n}", fontsize=7, va="center", color="#666")

    # Divider line
    div_y = len(bcc_data) - 0.5
    ax.axhline(div_y, color="#bdc3c7", ls="-", lw=0.8)
    ax.text(-0.55, len(bcc_data) / 2 - 0.5, "BCC", fontsize=10, fontweight="bold",
            color=PAL["bcc"], ha="center", va="center")
    ax.text(-0.55, len(bcc_data) + len(fcc_data) / 2 - 0.5, "FCC", fontsize=10,
            fontweight="bold", color=PAL["fcc"], ha="center", va="center")

    ax.axvline(0, color="black", lw=0.6, alpha=0.4)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(labels, fontsize=10)
    ax.set_xlabel("Correlation coefficient $r$ (reference vs. predicted)")
    ax.set_title("BCC/FCC correlation dichotomy", fontweight="bold")
    ax.set_xlim(-0.6, 1.15)
    ax.grid(axis="x", ls="--", alpha=0.3)
    ax.invert_yaxis()

    save(fig, "fig3_bcc_fcc_dichotomy")


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  Fig 4: Forest plot — 15-element meta-analysis                         ║
# ╚══════════════════════════════════════════════════════════════════════════╝
def fig4_forest(meta):
    fixed = meta["fixed_effects"]
    random = meta["random_effects"]
    groups = sorted(random["group_results"], key=lambda g: g["r"])

    fig, ax = plt.subplots(figsize=(SINGLE_COL * 1.8, 7.0))

    for i, g in enumerate(groups):
        z = g["z"]
        se = g["se_z"]
        ci_lo = np.tanh(z - 1.96 * se)
        ci_hi = np.tanh(z + 1.96 * se)
        color = PAL["bcc"] if g["group_id"] in BCC_ELEMENTS else PAL["fcc"]
        ax.plot([ci_lo, ci_hi], [i, i], color=color, lw=2.0, solid_capstyle="round")
        ax.scatter(g["r"], i, color=color, s=50, zorder=3, edgecolors="black", lw=0.4)

    # Summary diamonds
    n = len(groups)
    for label, model, y_off, color in [
        ("Fixed", fixed, n + 0.8, PAL["fixed"]),
        ("Random", random, n + 1.8, PAL["random"]),
    ]:
        r = model["pooled_r"]
        lo = model["ci_lower"]
        hi = model["ci_upper"]
        diamond_x = [lo, r, hi, r, lo]
        diamond_y = [y_off, y_off + 0.3, y_off, y_off - 0.3, y_off]
        ax.fill(diamond_x, diamond_y, color=color, alpha=0.7)
        ax.plot(diamond_x, diamond_y, color=color, lw=1)

    all_labels = [g["group_id"] for g in groups] + ["", "Fixed effects", "Random effects"]
    all_y = list(range(n)) + [n + 0.3, n + 0.8, n + 1.8]
    ax.set_yticks(list(range(n)) + [n + 0.8, n + 1.8])
    ax.set_yticklabels([g["group_id"] for g in groups] + ["Fixed effects", "Random effects"])

    # Stats annotation
    i2 = random["i_squared"]
    tau = random["tau"]
    pred_lo = random["pred_interval_lower"]
    pred_hi = random["pred_interval_upper"]
    stats = (f"$I^2$ = {i2:.1f}%  |  $\\tau$ = {tau:.3f}\n"
             f"Prediction interval: [{pred_lo:.2f}, {pred_hi:.2f}]")
    ax.text(0.02, 0.98, stats, transform=ax.transAxes, fontsize=8,
            va="top", bbox=dict(boxstyle="round", fc="wheat", alpha=0.6))

    ax.axvline(0, color="black", lw=0.6, alpha=0.4)
    ax.set_xlabel("Correlation coefficient $r$")
    ax.set_title("Meta-analysis forest plot (15 elements, N=1,677)", fontweight="bold")
    ax.set_xlim(-0.8, 1.1)
    ax.grid(axis="x", ls="--", alpha=0.3)
    save(fig, "fig4_forest")


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  Fig 5: Pair-style stratification — ecological fallacy                 ║
# ╚══════════════════════════════════════════════════════════════════════════╝
def fig5_pairstyle(bench_csv):
    rows = list(csv.DictReader(open(bench_csv, encoding="utf-8")))

    # Group by pair_style, compute correlation per group
    by_ps = defaultdict(lambda: {"refs": [], "preds": []})
    for r in rows:
        ps = r.get("pair_style", "")
        if ps and ps != "kim" and r["property"] == "C11":
            try:
                by_ps[ps]["refs"].append(float(r["reference"]))
                by_ps[ps]["preds"].append(float(r["predicted"]))
            except ValueError:
                pass

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(DOUBLE_COL, 4.5))

    colors_cycle = plt.cm.tab10(np.linspace(0, 1, len(by_ps)))
    ps_stats = []

    for (ps, data), color in zip(sorted(by_ps.items(), key=lambda x: -len(x[1]["refs"])), colors_cycle):
        refs = np.array(data["refs"])
        preds = np.array(data["preds"])
        if len(refs) < 3:
            continue
        r = np.corrcoef(refs, preds)[0, 1] if len(refs) > 2 else 0
        ps_stats.append((ps, r, len(refs)))
        ax1.scatter(refs, preds, color=color, alpha=0.5, s=15, label=f"{ps} (n={len(refs)}, r={r:.2f})")

    # Identity line
    all_vals = [float(r["reference"]) for r in rows if r["property"] == "C11"]
    lims = [0, max(all_vals) * 1.1]
    ax1.plot(lims, lims, "k--", lw=0.8, alpha=0.5, label="Perfect")
    ax1.set_xlabel("Reference C$_{11}$ (GPa)")
    ax1.set_ylabel("Predicted C$_{11}$ (GPa)")
    ax1.set_title("C$_{11}$: reference vs. predicted")
    ax1.legend(fontsize=6, loc="upper left")
    ax1.set_xlim(lims)
    ax1.set_ylim([min(0, min(float(r["predicted"]) for r in rows if r["property"]=="C11")), lims[1]])

    # Bar chart of per-pair_style correlations
    ps_stats.sort(key=lambda x: x[1])
    labels = [s[0] for s in ps_stats]
    corrs = [s[1] for s in ps_stats]
    ns = [s[2] for s in ps_stats]
    bar_colors = [PAL["bcc"] if c > 0.8 else PAL["fcc"] if c < 0.5 else "#f39c12" for c in corrs]

    bars = ax2.barh(range(len(labels)), corrs, color=bar_colors, alpha=0.8, edgecolor="white")
    for i, (c, n) in enumerate(zip(corrs, ns)):
        ax2.text(c + 0.02, i, f"n={n}", fontsize=7, va="center")
    ax2.set_yticks(range(len(labels)))
    ax2.set_yticklabels(labels, fontsize=9)
    ax2.set_xlabel("Within-group correlation $r$")
    ax2.set_title("Per pair\\_style accuracy")
    ax2.axvline(0, color="black", lw=0.6, alpha=0.4)

    fig.suptitle("Ecological fallacy: pair\\_style stratification reveals hidden accuracy",
                 fontweight="bold", y=1.02)
    plt.tight_layout()
    save(fig, "fig5_pairstyle")


# ── Main ───────────────────────────────────────────────────────────────────
def main():
    print("Generating IMMI paper figures from real data...\n")

    manifold = json.load(open(MANIFOLD_JSON))
    meta = json.load(open(META_JSON))

    print("Fig 1: Eigenvalue spectra")
    fig1_eigenvalue_spectra(manifold)

    print("Fig 2: Dimensionality distribution")
    fig2_dimensionality(manifold)

    print("Fig 3: BCC/FCC dichotomy")
    fig3_bcc_fcc_dichotomy(meta)

    print("Fig 4: Forest plot")
    fig4_forest(meta)

    print("Fig 5: Pair-style stratification")
    fig5_pairstyle(BENCH_CSV)

    print("\nAll figures generated successfully.")


if __name__ == "__main__":
    sys.exit(main() or 0)
