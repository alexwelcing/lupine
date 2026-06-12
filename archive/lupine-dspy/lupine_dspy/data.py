"""
Data bridge: loads benchmark data from atlas-distill CSVs and the
Cloudflare glim-think swarm API into DSPy-compatible schemas.

This module provides the concrete data layer that feeds the DSPy
signatures, bridging the Rust/TypeScript data stores with Python.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Optional

import httpx

from .schemas import BenchmarkRecord, ManifoldResult, UniversalAlignmentResult

# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────

GLIM_THINK_URL = "https://glim-think-v1.aw-ab5.workers.dev"
BENCHMARKS_DIR = Path(__file__).parent.parent.parent / "atlas-distill" / "benchmarks"


# ─────────────────────────────────────────────────────────────
# CSV Loaders
# ─────────────────────────────────────────────────────────────


def load_benchmark_csv(
    path: str | Path,
    element_filter: Optional[str] = None,
) -> list[BenchmarkRecord]:
    """Load benchmark records from a CSV file.

    Supports the NIST-populated CSV format from atlas-distill:
      material, potential, property, reference, predicted, unit, nist_id, pair_style, doi
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Benchmark file not found: {path}")

    records = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Skip rows without predicted values
            predicted = row.get("predicted", "").strip()
            if not predicted:
                continue

            try:
                ref_val = float(row.get("reference", 0))
                pred_val = float(predicted)
            except (ValueError, TypeError):
                continue

            element = row.get("material", row.get("element", "")).strip()
            if element_filter and element != element_filter:
                continue

            record = BenchmarkRecord(
                element=element,
                potential_id=row.get("nist_id", "unknown"),
                potential_label=row.get("potential", row.get("potential_label", "unknown")),
                pair_style=row.get("pair_style", "unknown"),
                property=row.get("property", ""),
                reference=ref_val,
                predicted=pred_val,
                unit=row.get("unit", "GPa"),
            )
            record.compute_error()
            records.append(record)

    return records


def load_all_benchmarks(element_filter: Optional[str] = None) -> list[BenchmarkRecord]:
    """Load all available benchmark CSVs from the atlas-distill benchmarks directory."""
    all_records = []

    # Priority order: populated > tier2 > raw
    priority_files = [
        "nist_populated_all.csv",
        "nist_populated.csv",
        "nist_populated_tier2.csv",
        "kim_elastic_results_all.csv",
        "kim_elastic_results.csv",
        "fcc_elastic_constants.csv",
        "bcc_elastic_constants.csv",
    ]

    for filename in priority_files:
        fpath = BENCHMARKS_DIR / filename
        if fpath.exists():
            records = load_benchmark_csv(fpath, element_filter)
            if records:
                all_records.extend(records)
                break  # Use the first file that has data

    return all_records


# ─────────────────────────────────────────────────────────────
# Cloudflare Swarm Bridge
# ─────────────────────────────────────────────────────────────


def fetch_swarm_feed() -> dict:
    """Fetch the live feed from the glim-think Cloudflare worker."""
    resp = httpx.get(f"{GLIM_THINK_URL}/feed", timeout=15.0)
    resp.raise_for_status()
    return resp.json()


def fetch_swarm_health() -> dict:
    """Fetch the health status of the glim-think worker."""
    resp = httpx.get(f"{GLIM_THINK_URL}/health", timeout=10.0)
    resp.raise_for_status()
    return resp.json()


def parse_swarm_manifold(feed: dict) -> Optional[ManifoldResult]:
    """Extract ManifoldResult from the swarm feed's metrics.manifold field."""
    metrics = feed.get("metrics", {})
    manifold = metrics.get("manifold")
    if not manifold:
        return None

    return ManifoldResult(
        potential="swarm_aggregate",
        n_materials=manifold.get("vectorCount", 0),
        n_properties=len(manifold.get("properties", [])),
        participation_ratio=manifold.get("participationRatio", 0.0),
        top_eigenvalue_fraction=(
            manifold["topEigenvalue"] / manifold["traceCovariance"]
            if manifold.get("traceCovariance", 0) > 0
            else 0.0
        ),
        is_hyper_ribbon=manifold.get("hyperRibbon", False),
        principal_direction=manifold.get("principalDirection", []),
    )


def parse_swarm_experiments(feed: dict) -> list[dict]:
    """Extract completed experiment results from the swarm feed."""
    proven = feed.get("provens", [])
    return [
        {
            "experiment_id": exp["experiment_id"],
            "element": exp["element"],
            "potential_label": exp["potential_label"],
            "status": exp["status"],
            "discriminative_property": exp.get("discriminative_property", ""),
        }
        for exp in proven
    ]


# ─────────────────────────────────────────────────────────────
# Summary Generators (for DSPy inputs)
# ─────────────────────────────────────────────────────────────


def summarize_records(records: list[BenchmarkRecord]) -> str:
    """Generate a concise summary string for feeding into DSPy signatures."""
    if not records:
        return "No records available."

    elements = set(r.element for r in records)
    pair_styles = set(r.pair_style for r in records)
    properties = set(r.property for r in records)
    potentials = set(r.potential_label for r in records)

    avg_error = sum(abs(r.error_pct or 0) for r in records) / len(records)

    return (
        f"N={len(records)} records across {len(elements)} elements "
        f"({', '.join(sorted(elements))}), "
        f"{len(potentials)} potentials, "
        f"{len(pair_styles)} pair_styles ({', '.join(sorted(pair_styles))}), "
        f"properties: {', '.join(sorted(properties))}. "
        f"Mean |error|: {avg_error:.2f}%."
    )


def compute_stratified_correlations(
    records: list[BenchmarkRecord],
    group_by: str = "element",
) -> dict[str, float]:
    """Compute per-group Pearson correlations between reference and predicted values."""
    import numpy as np

    groups: dict[str, list[tuple[float, float]]] = {}
    for r in records:
        key = getattr(r, group_by, "unknown")
        groups.setdefault(key, []).append((r.reference, r.predicted))

    correlations = {}
    for key, pairs in groups.items():
        if len(pairs) < 3:
            continue
        refs = np.array([p[0] for p in pairs])
        preds = np.array([p[1] for p in pairs])
        if np.std(refs) > 0 and np.std(preds) > 0:
            correlations[key] = float(np.corrcoef(refs, preds)[0, 1])

    return correlations
