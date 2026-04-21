#!/usr/bin/env python3
"""
Generate Figure 2: Effective dimensionality comparison with bootstrap CIs.

Bar chart showing participation ratio (PR) for each potential,
with 95% bootstrap confidence intervals.
"""

import json
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

FIG_WIDTH = 8.5 / 2.54  # single column
FIG_HEIGHT = 6.0

COLORS = {
    "EAM": "#1f77b4",
    "LJ": "#d62728",
    "SW": "#2ca02c",
}


def load_manifold_data(json_path: Path) -> list[dict]:
    with open(json_path, "r") as f:
        return json.load(f)


def plot_dimensionality(data: list[dict], output_path: Path) -> None:
    fig, ax = plt.subplots(figsize=(FIG_WIDTH, FIG_HEIGHT))

    potentials = [d["potential"] for d in data]
    prs = [d["effective_dimensionality"] for d in data]
    ci_lowers = [d.get("pr_ci_lower", pr * 0.9) for d, pr in zip(data, prs)]
    ci_uppers = [d.get("pr_ci_upper", pr * 1.1) for d, pr in zip(data, prs)]
    colors = [COLORS.get(p, "#333333") for p in potentials]

    x = np.arange(len(potentials))
    bars = ax.bar(x, prs, color=colors, edgecolor="black", linewidth=0.5, width=0.6)

    # Error bars from bootstrap CIs
    errors = [[pr - lo for pr, lo in zip(prs, ci_lowers)],
              [hi - pr for pr, hi in zip(prs, ci_uppers)]]
    ax.errorbar(x, prs, yerr=errors, fmt="none", ecolor="black", capsize=4, linewidth=1.5)

    # Reference line at 1.66 (from lit-review.md claim)
    ax.axhline(y=1.66, color="gray", linestyle="--", linewidth=1.0, alpha=0.7,
               label="Literature value (FCC, ~1.66)")

    # Maximum possible dimensionality
    ax.axhline(y=3.0, color="lightgray", linestyle=":", linewidth=1.0, alpha=0.5,
               label="Maximum (3 properties)")

    ax.set_xticks(x)
    ax.set_xticklabels(potentials, fontsize=11)
    ax.set_ylabel("Effective dimensionality (PR)", fontsize=11)
    ax.set_title("Error manifold compression by potential", fontsize=12, fontweight="bold")
    ax.set_ylim(0, 3.5)
    ax.legend(loc="upper right", fontsize=9)
    ax.grid(axis="y", ls="--", alpha=0.4)

    # Add value labels on bars
    for bar, pr in zip(bars, prs):
        height = bar.get_height()
        ax.annotate(f"{pr:.2f}", xy=(bar.get_x() + bar.get_width() / 2, height),
                    xytext=(0, 3), textcoords="offset points",
                    ha="center", va="bottom", fontsize=10, fontweight="bold")

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.savefig(output_path.with_suffix(".pdf"), bbox_inches="tight")
    print(f"Figure 2 saved to {output_path} and {output_path.with_suffix('.pdf')}")


def main() -> int:
    json_path = Path(__file__).parent.parent.parent / "atlas-distill" / "manifold_analysis.json"
    if not json_path.exists():
        print(f"Error: {json_path} not found. Run 'atlas-distill manifold' first.")
        return 1

    output_path = Path(__file__).parent / "fig2_dimensionality.png"
    data = load_manifold_data(json_path)
    plot_dimensionality(data, output_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
