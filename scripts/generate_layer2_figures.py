#!/usr/bin/env python3
"""Generate publication figures for the Layer-2 3x3x3 final paper."""
from __future__ import annotations

import csv
import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

plt.style.use("seaborn-v0_8-whitegrid")

SUMMARY = Path(__file__).resolve().parents[1] / "data" / "benchmark_layer2_3x3x3_summary.json"
RAW_DIR = Path("/tmp/layer2_3x3x3_full")
OUT_DIR = Path("/home/alex/Dev/lupine/lupine-rhizo/paper/figures")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def load_summary():
    data = json.loads(SUMMARY.read_text())
    return data["rows"], data["summary"]


def load_raw_runtimes():
    runtimes = {}
    for path in RAW_DIR.glob("*.json"):
        raw = json.loads(path.read_text())
        if raw.get("status") != "ok":
            continue
        key = (raw["element"], raw["model"], raw["functional"])
        runtimes[key] = raw["runtime_seconds"]
    return runtimes


def save(fig, name):
    path = OUT_DIR / name
    fig.savefig(path, dpi=300, bbox_inches="tight")
    print(f"wrote {path}")
    plt.close(fig)


def fig_accuracy_cost(rows, runtimes):
    models = sorted({r["model"] for r in rows})
    funcs = ["PBE", "r2SCAN"]
    colors = {"PBE": "#2563eb", "r2SCAN": "#dc2626"}
    markers = {"M3GNet": "o", "CHGNet": "s", "QET": "^", "TensorNet": "D"}

    fig, ax = plt.subplots(figsize=(7, 5))
    for func in funcs:
        for model in models:
            subset = [r for r in rows if r["model"] == model and r["functional"] == func]
            if not subset:
                continue
            mean_mae = np.mean([r["mae_cij"] for r in subset])
            total_core_h = sum(runtimes[(r["element"], model, func)] for r in subset) / 3600.0
            ax.scatter(
                total_core_h,
                mean_mae,
                color=colors[func],
                marker=markers[model],
                s=120,
                edgecolor="black",
                linewidth=0.5,
                label=f"{model} {func}",
                zorder=3,
            )
    ax.set_xlabel("Total CPU core-hours (single-process, cache-warm)", fontsize=11)
    ax.set_ylabel("Mean C$_{ij}$ MAE (GPa)", fontsize=11)
    ax.set_title("Accuracy–cost frontier: 3×3×3 supercell reference", fontsize=12, fontweight="bold")
    ax.set_xscale("log")
    ax.legend(fontsize=8, ncol=2, loc="upper right")
    ax.set_ylim(0, None)
    save(fig, "fig1_accuracy_cost_frontier.png")


def fig_per_element(rows):
    elements = sorted({r["element"] for r in rows}, key=lambda e: np.mean([x["mae_cij"] for x in rows if x["element"] == e]))
    means = [np.mean([r["mae_cij"] for r in rows if r["element"] == e]) for e in elements]
    classes = {
        "Ca": "alkaline-earth", "Sr": "alkaline-earth",
        "Ag": "noble/coinage", "Au": "noble/coinage", "Cu": "noble/coinage",
        "Al": "simple metal",
        "Ni": "late transition", "Pd": "late transition", "Pt": "late transition",
        "Cr": "BCC transition", "Fe": "BCC transition", "Mo": "BCC transition",
        "Nb": "BCC transition", "Ta": "BCC transition", "V": "BCC transition", "W": "BCC transition",
    }
    palette = {
        "alkaline-earth": "#10b981",
        "noble/coinage": "#3b82f6",
        "simple metal": "#8b5cf6",
        "late transition": "#f59e0b",
        "BCC transition": "#ef4444",
    }
    colors = [palette[classes[e]] for e in elements]

    fig, ax = plt.subplots(figsize=(9, 5))
    bars = ax.bar(elements, means, color=colors, edgecolor="black", linewidth=0.5)
    ax.set_xlabel("Element", fontsize=11)
    ax.set_ylabel("Mean C$_{ij}$ MAE (GPa)", fontsize=11)
    ax.set_title("Per-element mean MAE across all models and functionals", fontsize=12, fontweight="bold")
    ax.set_ylim(0, max(means) * 1.15)
    for bar, m in zip(bars, means):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 1, f"{m:.1f}", ha="center", va="bottom", fontsize=7)
    from matplotlib.patches import Patch
    legend = [Patch(color=c, label=l) for l, c in palette.items()]
    ax.legend(handles=legend, loc="upper left", fontsize=8)
    save(fig, "fig2_per_element_mae.png")


def fig_functional_gap(rows):
    models = sorted({r["model"] for r in rows})
    pbe = [np.mean([r["mae_cij"] for r in rows if r["model"] == m and r["functional"] == "PBE"]) for m in models]
    r2 = [np.mean([r["mae_cij"] for r in rows if r["model"] == m and r["functional"] == "r2SCAN"]) for m in models]

    x = np.arange(len(models))
    width = 0.35
    fig, ax = plt.subplots(figsize=(7, 5))
    ax.bar(x - width / 2, pbe, width, label="PBE", color="#2563eb", edgecolor="black", linewidth=0.5)
    ax.bar(x + width / 2, r2, width, label="r2SCAN", color="#dc2626", edgecolor="black", linewidth=0.5)
    ax.set_ylabel("Mean C$_{ij}$ MAE (GPa)", fontsize=11)
    ax.set_title("Mean MAE by model and DFT functional", fontsize=12, fontweight="bold")
    ax.set_xticks(x)
    ax.set_xticklabels(models)
    ax.legend()
    ax.set_ylim(0, max(max(r2), max(pbe)) * 1.15)
    for i, (a, b) in enumerate(zip(pbe, r2)):
        ax.text(i - width / 2, a + 0.5, f"{a:.1f}", ha="center", va="bottom", fontsize=8)
        ax.text(i + width / 2, b + 0.5, f"{b:.1f}", ha="center", va="bottom", fontsize=8)
    save(fig, "fig3_functional_gap.png")


def fig_qet_tensornet(rows):
    qet = [r for r in rows if r["model"] == "QET"]
    ten = [r for r in rows if r["model"] == "TensorNet"]
    qet_by_key = {(r["element"], r["functional"]): r["mae_cij"] for r in qet}
    ten_by_key = {(r["element"], r["functional"]): r["mae_cij"] for r in ten}
    keys = sorted(qet_by_key.keys())
    x = [qet_by_key[k] for k in keys]
    y = [ten_by_key[k] for k in keys]
    funcs = [k[1] for k in keys]
    colors = {"PBE": "#2563eb", "r2SCAN": "#dc2626"}

    fig, ax = plt.subplots(figsize=(6, 6))
    for func in ["PBE", "r2SCAN"]:
        xi = [qet_by_key[k] for k in keys if k[1] == func]
        yi = [ten_by_key[k] for k in keys if k[1] == func]
        ax.scatter(xi, yi, c=colors[func], label=func, alpha=0.75, edgecolor="black", linewidth=0.5, s=70)
    lim = max(max(x), max(y)) * 1.05
    ax.plot([0, lim], [0, lim], "k--", linewidth=1, label="y = x")
    ax.set_xlabel("QET MAE (GPa)", fontsize=11)
    ax.set_ylabel("TensorNet MAE (GPa)", fontsize=11)
    ax.set_title("QET vs TensorNet per-element MAE", fontsize=12, fontweight="bold")
    ax.set_xlim(0, lim)
    ax.set_ylim(0, lim)
    ax.legend()
    save(fig, "fig4_qet_tensornet.png")


def load_classical_best():
    """Best classical potential per element from atlas-distill NIST benchmark."""
    nist_csv = Path("/home/alex/Dev/lupine/lupine/atlas-distill/benchmarks/nist_populated_all.csv")
    data = {}
    with open(nist_csv) as f:
        reader = csv.DictReader(f)
        for row in reader:
            elem = row["material"]
            pot = row["potential"]
            prop = row["property"]
            try:
                pred = float(row["predicted"])
                ref = float(row["reference"])
            except ValueError:
                continue
            data.setdefault((elem, pot), {})[prop] = (pred, ref)

    best = {}
    for (elem, pot), vals in data.items():
        if "C11" in vals and "C12" in vals and "C44" in vals:
            pred = [vals["C11"][0], vals["C12"][0], vals["C44"][0]]
            target = [vals["C11"][1], vals["C12"][1], vals["C44"][1]]
            err = np.mean(np.abs(np.array(pred) - np.array(target)))
            if elem not in best or err < best[elem][1]:
                best[elem] = (pot, err)
    return best


def load_mlip_vs_nist():
    """Best MatPES MLIP per element against NIST references."""
    nist_csv = Path("/home/alex/Dev/lupine/lupine/atlas-distill/benchmarks/nist_populated_all.csv")
    refs = {}
    with open(nist_csv) as f:
        reader = csv.DictReader(f)
        for row in reader:
            elem = row["material"]
            prop = row["property"]
            try:
                refs.setdefault(elem, {})[prop] = float(row["reference"])
            except ValueError:
                continue

    mlip_models = ["M3GNet", "CHGNet", "TensorNet", "QET"]
    best = {}
    for elem, vals in refs.items():
        if "C11" not in vals:
            continue
        target = [vals["C11"], vals["C12"], vals["C44"]]
        for model in mlip_models:
            path = RAW_DIR / f"{elem}_{model}_PBE.json"
            if not path.exists():
                continue
            raw = json.loads(path.read_text())
            pred = [raw["c11"], raw["c12"], raw["c44"]]
            err = np.mean(np.abs(np.array(pred) - np.array(target)))
            if elem not in best or err < best[elem][1]:
                best[elem] = (model, err)
    return best


def fig_mlip_correction(rows, summary):
    """Raw vs 1-D Lupine-corrected mean MAE for each model and functional."""
    models = sorted({r["model"] for r in rows})
    funcs = ["PBE", "r2SCAN"]
    corr_key = "correction"

    raw = {
        (m, f): summary[f]["model_mean_mae_cij"][m]
        for m in models
        for f in funcs
    }
    corrected = {
        (m, f): summary[f"{f}_corrected"]["model_mean_mae_cij"][m]
        for m in models
        for f in funcs
    }

    x = np.arange(len(models))
    width = 0.35
    colors = {"raw": "#64748b", "corrected": "#10b981"}

    fig, axes = plt.subplots(1, 2, figsize=(10, 5), sharey=True)
    for ax, func in zip(axes, funcs):
        raw_vals = [raw[(m, func)] for m in models]
        corr_vals = [corrected[(m, func)] for m in models]
        ax.bar(x - width / 2, raw_vals, width, label="Raw MLIP", color=colors["raw"], edgecolor="black", linewidth=0.5)
        ax.bar(x + width / 2, corr_vals, width, label="+ Lupine correction", color=colors["corrected"], edgecolor="black", linewidth=0.5)
        ax.set_ylabel("Mean C$_{ij}$ MAE (GPa)")
        ax.set_title(f"{func} target")
        ax.set_xticks(x)
        ax.set_xticklabels(models)
        ax.legend()
        ax.set_ylim(0, max(max(raw_vals), max(corr_vals)) * 1.2)
        for i, (r, c) in enumerate(zip(raw_vals, corr_vals)):
            ax.text(i - width / 2, r + 0.3, f"{r:.1f}", ha="center", va="bottom", fontsize=7)
            ax.text(i + width / 2, c + 0.3, f"{c:.1f}", ha="center", va="bottom", fontsize=7)
    fig.suptitle("Raw MatPES MLIP predictions vs 1-D Lupine-corrected predictions", fontsize=12, fontweight="bold", y=1.02)
    save(fig, "fig5_mlip_correction.png")


def main():
    rows, summary = load_summary()
    runtimes = load_raw_runtimes()
    fig_accuracy_cost(rows, runtimes)
    fig_per_element(rows)
    fig_functional_gap(rows)
    fig_qet_tensornet(rows)
    fig_mlip_correction(rows, summary)
    print("all figures generated")


if __name__ == "__main__":
    main()
