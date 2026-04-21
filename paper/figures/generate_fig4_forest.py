#!/usr/bin/env python3
"""
Generate Figure 4: Meta-analysis forest plot.

Shows fixed-effects vs. random-effects pooled correlations
with 95% confidence intervals and heterogeneity statistics.
"""

import json
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

FIG_WIDTH = 8.5 / 2.54  # single column
FIG_HEIGHT = 7.0


def load_meta_data(json_path: Path) -> dict:
    with open(json_path, "r") as f:
        return json.load(f)


def plot_forest(data: dict, output_path: Path) -> None:
    fig, ax = plt.subplots(figsize=(FIG_WIDTH, FIG_HEIGHT))

    fixed = data.get("fixed_effects", {})
    random = data.get("random_effects", {})
    groups = fixed.get("group_results", [])

    y_positions = []
    labels = []
    effects = []
    ci_lowers = []
    ci_uppers = []
    colors = []

    # Individual groups (bottom to top)
    for i, g in enumerate(groups):
        y_positions.append(i)
        labels.append(g.get("group_id", f"Group {i}"))
        effects.append(g.get("r", 0.0))
        # Approximate CI from Fisher z SE
        z = g.get("z", 0.0)
        se = g.get("se_z", 0.2)
        ci_lowers.append(np.tanh(z - 1.96 * se))
        ci_uppers.append(np.tanh(z + 1.96 * se))
        colors.append("#1f77b4")

    # Fixed effects summary
    y_fixed = len(groups) + 0.5
    y_positions.append(y_fixed)
    labels.append("Fixed effects")
    effects.append(fixed.get("pooled_r", 0.0))
    ci_lowers.append(fixed.get("ci_lower", 0.0))
    ci_uppers.append(fixed.get("ci_upper", 0.0))
    colors.append("#d62728")

    # Random effects summary
    y_random = len(groups) + 1.5
    y_positions.append(y_random)
    labels.append("Random effects")
    effects.append(random.get("pooled_r", 0.0))
    ci_lowers.append(random.get("ci_lower", 0.0))
    ci_uppers.append(random.get("ci_upper", 0.0))
    colors.append("#2ca02c")

    # Plot
    for y, eff, lo, hi, color in zip(y_positions, effects, ci_lowers, ci_uppers, colors):
        ax.plot([lo, hi], [y, y], color=color, linewidth=2.0, solid_capstyle="round")
        ax.scatter(eff, y, color=color, s=60, zorder=3, edgecolors="black", linewidth=0.5)

    # Reference line at 0
    ax.axvline(x=0, color="black", linewidth=0.8, linestyle="-", alpha=0.5)

    # Heterogeneity stats as text
    i2 = random.get("i_squared", 0.0)
    tau = random.get("tau", 0.0)
    q_p = random.get("q_pvalue", 1.0)
    stats_text = f"$I^2$ = {i2:.1f}%  |  $\\tau$ = {tau:.3f}  |  Q p = {q_p:.4f}"
    ax.text(0.02, 0.98, stats_text, transform=ax.transAxes, fontsize=9,
            verticalalignment="top", bbox=dict(boxstyle="round", facecolor="wheat", alpha=0.5))

    ax.set_yticks(y_positions)
    ax.set_yticklabels(labels, fontsize=10)
    ax.set_xlabel("Correlation coefficient $r$", fontsize=11)
    ax.set_title("Meta-analysis: fixed vs. random effects", fontsize=12, fontweight="bold")
    ax.set_xlim(-0.5, 1.0)
    ax.grid(axis="x", ls="--", alpha=0.4)

    # Add legend
    from matplotlib.lines import Line2D
    legend_elements = [
        Line2D([0], [0], color="#1f77b4", lw=2, label="Individual groups"),
        Line2D([0], [0], color="#d62728", lw=2, label="Fixed effects"),
        Line2D([0], [0], color="#2ca02c", lw=2, label="Random effects"),
    ]
    ax.legend(handles=legend_elements, loc="lower right", fontsize=9)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.savefig(output_path.with_suffix(".pdf"), bbox_inches="tight")
    print(f"Figure 4 saved to {output_path} and {output_path.with_suffix('.pdf')}")


def main() -> int:
    json_path = Path(__file__).parent.parent.parent / "atlas-distill" / "meta_analysis.json"
    if not json_path.exists():
        print(f"Error: {json_path} not found. Run 'atlas-distill meta-analyze' first.")
        return 1

    output_path = Path(__file__).parent / "fig4_forest.png"
    data = load_meta_data(json_path)
    plot_forest(data, output_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
