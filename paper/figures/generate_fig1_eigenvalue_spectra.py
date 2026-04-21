#!/usr/bin/env python3
"""
Generate Figure 1: Eigenvalue spectra for FCC benchmark potentials.

Reads atlas-distill manifold_analysis.json and produces a publication-quality
log-scale plot showing the geometric hierarchy of eigenvalues for EAM, LJ, and SW.
"""

import json
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

# Nature/Science figure sizing: double column = 17.8 cm
FIG_WIDTH = 17.8 / 2.54  # cm to inches
FIG_HEIGHT = 5.0

# Professional color palette
COLORS = {
    "EAM": "#1f77b4",  # blue
    "LJ": "#d62728",   # red
    "SW": "#2ca02c",   # green
}

MARKERS = {
    "EAM": "o",
    "LJ": "s",
    "SW": "^",
}


def load_manifold_data(json_path: Path) -> list[dict]:
    with open(json_path, "r") as f:
        return json.load(f)


def plot_eigenvalue_spectra(data: list[dict], output_path: Path) -> None:
    fig, ax = plt.subplots(figsize=(FIG_WIDTH, FIG_HEIGHT))

    for entry in data:
        potential = entry["potential"]
        eigenvalues = np.array(entry["eigenvalues"])
        indices = np.arange(1, len(eigenvalues) + 1)

        # Geometric fit line
        log_ev = np.log(eigenvalues)
        slope = entry["log_slope"]
        intercept = entry["log_intercept"]
        fit_line = np.exp(intercept + slope * (indices - 1))

        color = COLORS.get(potential, "#333333")
        marker = MARKERS.get(potential, "o")

        ax.scatter(
            indices,
            eigenvalues,
            color=color,
            marker=marker,
            s=80,
            label=f"{potential} (PR={entry['effective_dimensionality']:.2f})",
            zorder=3,
        )

        ax.plot(
            indices,
            fit_line,
            color=color,
            linestyle="--",
            linewidth=1.5,
            alpha=0.7,
            label=f"{potential} fit (R²={entry['log_r_squared']:.3f})",
        )

    ax.set_yscale("log")
    ax.set_xlabel("Eigenvalue index $i$", fontsize=11)
    ax.set_ylabel("Eigenvalue $\\lambda_i$ (GPa$^2$)", fontsize=11)
    ax.set_title(
        "FCC elastic constant error eigenvalue spectra", fontsize=12, fontweight="bold"
    )
    ax.legend(loc="upper right", fontsize=9, framealpha=0.9)
    ax.grid(True, which="both", ls="--", alpha=0.4)
    ax.set_xticks(indices)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.savefig(output_path.with_suffix(".pdf"), bbox_inches="tight")
    print(f"Figure 1 saved to {output_path} and {output_path.with_suffix('.pdf')}")


def main() -> int:
    json_path = Path(__file__).parent.parent.parent / "atlas-distill" / "manifold_analysis.json"
    if not json_path.exists():
        print(f"Error: {json_path} not found. Run 'atlas-distill manifold' first.")
        return 1

    output_dir = Path(__file__).parent
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "fig1_eigenvalue_spectra.png"

    data = load_manifold_data(json_path)
    plot_eigenvalue_spectra(data, output_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
