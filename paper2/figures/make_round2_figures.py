#!/usr/bin/env python3
"""Generate Round-2 3x3x3 figures for the Projection Law paper."""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "benchmark_layer2_3x3x3_summary.json"
OUT = Path(__file__).parent


def load_rows():
    payload = json.loads(DATA.read_text())
    return payload["rows"]


def aggregate_by_model_functional(rows):
    groups = {}
    for r in rows:
        key = (r["model"], r["functional"])
        groups.setdefault(key, {"raw": [], "corr": []})
        groups[key]["raw"].append(r["raw_mae_cij"])
        groups[key]["corr"].append(r["corrected_mae_cij"])
    out = {}
    for key, vals in groups.items():
        out[key] = (np.mean(vals["raw"]), np.mean(vals["corr"]))
    return out


def aggregate_by_element(rows):
    groups = {}
    for r in rows:
        groups.setdefault(r["element"], {"raw": [], "corr": []})
        groups[r["element"]]["raw"].append(r["raw_mae_cij"])
        groups[r["element"]]["corr"].append(r["corrected_mae_cij"])
    out = {el: (np.mean(v["raw"]), np.mean(v["corr"])) for el, v in groups.items()}
    return out


def plot_model_functional():
    rows = load_rows()
    agg = aggregate_by_model_functional(rows)
    models = ["CHGNet", "M3GNet", "TensorNet", "QET"]
    functionals = ["PBE", "r2SCAN"]
    x = np.arange(len(models))
    width = 0.35

    fig, ax = plt.subplots(figsize=(6, 4))
    colors = {"PBE": "#0b7285", "r2SCAN": "#c92a2a"}
    for i, func in enumerate(functionals):
        raw = [agg[(m, func)][0] for m in models]
        corr = [agg[(m, func)][1] for m in models]
        offset = width * (i - 0.5)
        ax.bar(x + offset - width/4, raw, width/2, label=f"{func} raw", color=colors[func], alpha=0.5)
        ax.bar(x + offset + width/4, corr, width/2, label=f"{func} corrected", color=colors[func], alpha=1.0)

    ax.set_ylabel("Mean C$_{ij}$ MAE (GPa)")
    ax.set_xticks(x)
    ax.set_xticklabels(models)
    ax.set_title("Round-2 3$\\times$3$\\times$3: raw vs. LOO-corrected MAE")
    ax.legend(ncol=2, fontsize=8)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.tight_layout()
    save(fig, "fig5_round2_raw_vs_corrected")


def plot_per_element():
    rows = load_rows()
    agg = aggregate_by_element(rows)
    elements = sorted(agg.keys(), key=lambda e: agg[e][0], reverse=True)
    raw = [agg[e][0] for e in elements]
    corr = [agg[e][1] for e in elements]

    fig, ax = plt.subplots(figsize=(7, 3.5))
    x = np.arange(len(elements))
    ax.bar(x - 0.2, raw, 0.4, label="raw", color="#868e96", alpha=0.7)
    ax.bar(x + 0.2, corr, 0.4, label="LOO corrected", color="#0b7285", alpha=0.9)
    ax.set_xticks(x)
    ax.set_xticklabels(elements)
    ax.set_ylabel("Mean C$_{ij}$ MAE (GPa)")
    ax.set_title("Round-2 per-element MAE reduction")
    ax.legend()
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.tight_layout()
    save(fig, "fig6_round2_per_element")


def plot_no_target_estimators():
    results = json.loads((ROOT / "data" / "no_target_magnitude_results.json").read_text())["results"]
    estimators = {
        "raw": np.mean([r["raw_mae"] for r in results]),
        "consensus": np.mean([r["consensus_mae"] for r in results]),
        "tuned": np.mean([r["tuned_mae"] for r in results]),
        "ridge": np.mean([r["ridge_mae"] for r in results]),
        "oracle": np.mean([r["oracle_mae"] for r in results]),
    }
    harms = {
        "consensus": sum(1 for r in results if r["consensus_mae"] > r["raw_mae"] + 1e-6),
        "tuned": sum(1 for r in results if r["tuned_mae"] > r["raw_mae"] + 1e-6),
        "ridge": sum(1 for r in results if r["ridge_mae"] > r["raw_mae"] + 1e-6),
    }

    fig, ax = plt.subplots(figsize=(6, 4))
    names = list(estimators.keys())
    values = list(estimators.values())
    colors = ["#868e96", "#74c0fc", "#ffd43b", "#fab005", "#0b7285"]
    bars = ax.bar(names, values, color=colors, alpha=0.85)
    ax.set_ylabel("Mean C$_{ij}$ MAE (GPa)")
    ax.set_title("No-target magnitude estimators")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    # Annotate harm counts for the three middle bars.
    for bar, name in zip(bars[1:4], ["consensus", "tuned", "ridge"]):
        height = bar.get_height()
        ax.annotate(f"{harms[name]} harm",
                    xy=(bar.get_x() + bar.get_width()/2, height),
                    xytext=(0, 3), textcoords="offset points",
                    ha="center", va="bottom", fontsize=8)

    fig.tight_layout()
    save(fig, "fig7_no_target_estimators")


def save(fig, name):
    fig.savefig(OUT / f"{name}.pdf")
    fig.savefig(OUT / f"{name}.png", dpi=300)
    plt.close(fig)
    print(f"wrote {name}.pdf/.png")


if __name__ == "__main__":
    plot_model_functional()
    plot_per_element()
    plot_no_target_estimators()
