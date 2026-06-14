#!/usr/bin/env python3
"""Summarize and validate the 2026-06-07 Kimi MLIP evidence import."""

from __future__ import annotations

import argparse
import functools
import json
import math
import random
import statistics
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_DIR = ROOT / "data" / "mlip_benchmarks" / "kimi_2026_06_07"
REVIEW_READY_DIR = ROOT / "paper" / "review-ready"
DEFAULT_AGENDA_PATH = EVIDENCE_DIR / "followup_agenda.json"
BOOTSTRAP_SEED = 20260607
BOOTSTRAP_REPLICATES = 1000

REFERENCE_ELASTIC_GPA = {
    "Al": {"C11": 108.2, "C12": 61.3, "C44": 28.5},
    "Cu": {"C11": 168.4, "C12": 121.4, "C44": 75.4},
    "Ni": {"C11": 247.0, "C12": 147.0, "C44": 124.0},
    "Ag": {"C11": 124.0, "C12": 93.4, "C44": 46.1},
    "Au": {"C11": 186.0, "C12": 157.0, "C44": 42.0},
    "Pt": {"C11": 346.0, "C12": 250.0, "C44": 76.0},
    "Pd": {"C11": 227.0, "C12": 176.0, "C44": 71.0},
    "Pb": {"C11": 48.8, "C12": 41.4, "C44": 14.8},
    "Fe": {"C11": 230.0, "C12": 135.0, "C44": 117.0},
    "Cr": {"C11": 350.0, "C12": 67.8, "C44": 100.0},
    "Mo": {"C11": 460.0, "C12": 176.0, "C44": 110.0},
    "W": {"C11": 523.0, "C12": 203.0, "C44": 160.0},
    "V": {"C11": 230.0, "C12": 120.0, "C44": 43.0},
    "Nb": {"C11": 247.0, "C12": 135.0, "C44": 29.0},
    "Ta": {"C11": 260.0, "C12": 154.0, "C44": 82.0},
}


def load_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"expected object JSON in {path}")
    return payload


def finite_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and math.isfinite(float(value))


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def percentile(values: list[float], q: float) -> float:
    if not values:
        raise ValueError("cannot compute percentile of an empty list")
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * q
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[int(position)]
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def participation_ratio_from_rows(rows: list[list[float]]) -> float | None:
    if len(rows) < 2:
        return None
    width = len(rows[0])
    means = [statistics.fmean(row[idx] for row in rows) for idx in range(width)]
    cov = []
    for left in range(width):
        cov_row = []
        for right in range(width):
            cov_row.append(
                statistics.fmean(
                    (row[left] - means[left]) * (row[right] - means[right])
                    for row in rows
                )
            )
        cov.append(cov_row)
    trace = sum(cov[idx][idx] for idx in range(width))
    trace_sq = sum(cov[row][col] * cov[col][row] for row in range(width) for col in range(width))
    if trace_sq <= 1e-20:
        return None
    return float((trace * trace) / trace_sq)


def elastic_error_rows(payload: dict[str, Any]) -> dict[str, list[list[float]]]:
    rows_by_element: dict[str, list[list[float]]] = {}
    for row in payload.get("elastic_constants", []):
        if not isinstance(row, dict):
            continue
        element = row.get("element")
        if not isinstance(element, str) or element not in REFERENCE_ELASTIC_GPA:
            continue
        ref = REFERENCE_ELASTIC_GPA[element]
        try:
            errors = [
                float(row["C11"]) - ref["C11"],
                float(row["C12"]) - ref["C12"],
                float(row["C44"]) - ref["C44"],
            ]
        except (KeyError, TypeError, ValueError):
            continue
        rows_by_element.setdefault(element, []).append(errors)
    return rows_by_element


def bootstrap_ensemble_pr(
    rows_by_element: dict[str, list[list[float]]],
    *,
    n_replicates: int = BOOTSTRAP_REPLICATES,
    seed: int = BOOTSTRAP_SEED,
) -> dict[str, Any]:
    rng = random.Random(seed)
    by_element: dict[str, dict[str, Any]] = {}
    values_by_element: dict[str, list[float]] = {element: [] for element in rows_by_element}
    top3_counts: dict[str, int] = dict.fromkeys(rows_by_element, 0)

    point_values = {
        element: participation_ratio_from_rows(rows)
        for element, rows in rows_by_element.items()
    }
    for _ in range(n_replicates):
        replicate_values: dict[str, float] = {}
        for element, rows in rows_by_element.items():
            sample = [rows[rng.randrange(len(rows))] for _ in rows]
            pr = participation_ratio_from_rows(sample)
            if pr is None:
                continue
            values_by_element[element].append(pr)
            replicate_values[element] = pr
        for element, _value in sorted(replicate_values.items(), key=lambda item: item[1], reverse=True)[:3]:
            top3_counts[element] += 1

    for element, values in values_by_element.items():
        by_element[element] = {
            "point_pr": point_values[element],
            "bootstrap_n": len(values),
            "ci_lower": percentile(values, 0.025) if values else None,
            "ci_upper": percentile(values, 0.975) if values else None,
            "top3_frequency": top3_counts[element] / n_replicates,
        }

    top3_stability = [
        {"element": element, "top3_frequency": top3_counts[element] / n_replicates}
        for element in sorted(top3_counts, key=lambda key: top3_counts[key], reverse=True)[:5]
    ]
    return {
        "method": "row-bootstrap over three MLIP error vectors per element",
        "seed": seed,
        "replicates": n_replicates,
        "by_element": by_element,
        "top3_stability": top3_stability,
    }


def best_threshold(points: list[dict[str, float]], score_key: str, label_key: str) -> dict[str, float]:
    thresholds = sorted({point[score_key] for point in points})
    positives = sum(1 for point in points if point[label_key] > 0)
    negatives = len(points) - positives
    if positives == 0 or negatives == 0:
        raise ValueError("threshold sweep needs both positive and negative labels")

    best: dict[str, float] | None = None
    for threshold in thresholds:
        tp = sum(1 for point in points if point[score_key] >= threshold and point[label_key] > 0)
        fp = sum(1 for point in points if point[score_key] >= threshold and point[label_key] == 0)
        tpr = tp / positives
        fpr = fp / negatives
        youden = tpr - fpr
        candidate = {
            "threshold": threshold,
            "tpr": tpr,
            "fpr": fpr,
            "youden_j": youden,
        }
        if best is None:
            best = candidate
            continue
        if (
            candidate["youden_j"],
            candidate["tpr"],
            -candidate["fpr"],
        ) > (
            best["youden_j"],
            best["tpr"],
            -best["fpr"],
        ):
            best = candidate
    if best is None:
        raise ValueError("no threshold candidates")
    return best


def force_calibrated_refusal(force_payload: dict[str, Any]) -> dict[str, Any]:
    raw_rows = force_payload.get("data")
    if not isinstance(raw_rows, list) or not raw_rows:
        raise ValueError("force correlation payload has no data rows")
    force_values = [float(row["force_mae"]) for row in raw_rows if isinstance(row, dict) and finite_number(row.get("force_mae"))]
    threshold = percentile(force_values, 0.75)
    points = []
    for row in raw_rows:
        if not isinstance(row, dict):
            continue
        distances = row.get("distances")
        if not isinstance(distances, list) or len(distances) < 2:
            continue
        force_mae = float(row["force_mae"])
        points.append(
            {
                "layer_0": float(distances[0]),
                "layer_1": float(distances[1]),
                "total": float(row.get("total_distance", float(distances[0]) + float(distances[1]))),
                "large_force_error": 1.0 if force_mae >= threshold else 0.0,
            }
        )
    best = {
        key: best_threshold(points, key, "large_force_error")
        for key in ["layer_0", "layer_1", "total"]
    }
    max_force = max(force_values)
    return {
        "label": "top-quartile force MAE within imported Kimi force-error data",
        "force_mae_threshold": threshold,
        "force_mae_max": max_force,
        "n_structures": len(points),
        "positive_count": sum(1 for point in points if point["large_force_error"] > 0),
        "best_thresholds": best,
        "caveat": (
            "Imported force MAE values are near machine precision; this is a deterministic "
            "shape check, not a production force-refusal threshold."
            if max_force < 1e-9
            else "Force MAE scale is material enough for calibration."
        ),
    }


def summarize_cross_mlip(payload: dict[str, Any]) -> dict[str, Any]:
    correlations = payload.get("cross_correlations")
    ensemble_pr = payload.get("ensemble_pr")
    elastic_constants = payload.get("elastic_constants")
    if not isinstance(correlations, dict):
        raise ValueError("cross_mlip payload is missing cross_correlations")
    if not isinstance(ensemble_pr, dict):
        raise ValueError("cross_mlip payload is missing ensemble_pr")
    if not isinstance(elastic_constants, list):
        raise ValueError("cross_mlip payload is missing elastic_constants")

    pair_values: dict[str, list[float]] = {}
    for key, value in correlations.items():
        if not finite_number(value):
            continue
        pair = str(key).split(":", 1)[1]
        pair_values.setdefault(pair, []).append(float(value))

    pair_means = {
        pair: statistics.fmean(values)
        for pair, values in sorted(pair_values.items())
        if values
    }
    low_correlations = [
        {"key": key, "r": float(value)}
        for key, value in sorted(correlations.items(), key=lambda item: float(item[1]))
        if finite_number(value) and float(value) < 0.95
    ]

    all_pr = {
        key.split(":", 1)[0]: float(value)
        for key, value in ensemble_pr.items()
        if key.endswith(":all") and finite_number(value)
    }
    top_pr = [
        {"element": element, "pr": value}
        for element, value in sorted(all_pr.items(), key=lambda item: item[1], reverse=True)[:5]
    ]
    low_pr = [
        {"element": element, "pr": value}
        for element, value in sorted(all_pr.items(), key=lambda item: item[1])[:5]
    ]

    physical_flags = []
    for row in elastic_constants:
        if not isinstance(row, dict):
            continue
        flags = []
        c11 = row.get("C11")
        c12 = row.get("C12")
        c44 = row.get("C44")
        if finite_number(c11) and float(c11) <= 0:
            flags.append("C11<=0")
        if finite_number(c44) and float(c44) <= 0:
            flags.append("C44<=0")
        if finite_number(c11) and finite_number(c12) and float(c11) <= float(c12):
            flags.append("C11<=C12")
        if flags:
            physical_flags.append(
                {
                    "element": row.get("element"),
                    "model": row.get("model"),
                    "flags": flags,
                    "C11": c11,
                    "C12": c12,
                    "C44": c44,
                }
            )

    return {
        "elastic_count": len(elastic_constants),
        "correlation_count": len(correlations),
        "ensemble_pr_count": len(ensemble_pr),
        "pair_means": pair_means,
        "low_correlations": low_correlations,
        "top_ensemble_pr": top_pr,
        "low_ensemble_pr": low_pr,
        "physical_flags": physical_flags,
        "ensemble_pr_bootstrap": bootstrap_ensemble_pr(elastic_error_rows(payload)),
    }


def summarize_md_interface(evidence_dir: Path) -> dict[str, Any]:
    force = load_json(evidence_dir / "md_force_error_correlation.json")
    active = load_json(evidence_dir / "md_active_learning_curve.json")
    mixed = load_json(evidence_dir / "md_hybrid_decision.json")
    element_specific = load_json(evidence_dir / "md_element_specific_hybrid.json")

    curve = active.get("curve")
    if not isinstance(curve, list) or not curve:
        raise ValueError("md_active_learning_curve.json has no curve")
    first = curve[0]
    last = curve[-1]

    return {
        "force_correlations": force.get("correlations", {}),
        "force_calibrated_refusal": force_calibrated_refusal(force),
        "active_learning": {
            "initial_max_pool_distance": first.get("max_pool_distance"),
            "final_max_pool_distance": last.get("max_pool_distance"),
            "max_pool_distance_drop": (
                float(first["max_pool_distance"]) - float(last["max_pool_distance"])
                if finite_number(first.get("max_pool_distance"))
                and finite_number(last.get("max_pool_distance"))
                else None
            ),
        },
        "mixed_reference_best_thresholds": mixed.get("best_thresholds", {}),
        "element_specific_best_thresholds": element_specific.get("best_thresholds", {}),
    }


@functools.lru_cache(maxsize=4)
def build_summary(evidence_dir: Path = EVIDENCE_DIR) -> dict[str, Any]:
    cross_mlip = load_json(evidence_dir / "cross_mlip_cloud_v7_results.json")
    irrep = load_json(evidence_dir / "irrep_vandermonde_mace_mp0.json")
    real_exit = load_json(evidence_dir / "real_early_exit_mace_mp0.json")
    simulated_exit = load_json(evidence_dir / "simulated_acceleration_mace_mp0.json")

    return {
        "schema": "lupine.kimi.evidence_summary.v1",
        "source": {
            "imported_from": "archive/kimi-workspace-export",
            "session_date": "2026-06-07",
            "evidence_dir": rel(evidence_dir),
        },
        "cross_mlip": summarize_cross_mlip(cross_mlip),
        "irrep_vandermonde": irrep,
        "real_early_exit": real_exit,
        "simulated_acceleration": simulated_exit,
        "md_interface": summarize_md_interface(evidence_dir),
    }

def agenda_item(
    *,
    task_id: str,
    lane: str,
    title: str,
    rationale: str,
    status: str,
    priority: int,
    evidence_paths: list[Path],
    next_action: str,
    gates: list[str],
    suggested_surfaces: list[str],
    verification_commands: list[str],
    control_plane_payload: dict[str, Any],
) -> dict[str, Any]:
    return {
        "task_id": task_id,
        "lane": lane,
        "title": title,
        "status": status,
        "priority": priority,
        "rationale": rationale,
        "evidence_paths": [rel(path) for path in evidence_paths],
        "next_action": next_action,
        "gates": gates,
        "suggested_surfaces": suggested_surfaces,
        "verification_commands": verification_commands,
        "control_plane_payload": control_plane_payload,
    }


def build_followup_agenda(
    summary: dict[str, Any],
    evidence_dir: Path = EVIDENCE_DIR,
) -> dict[str, Any]:
    """Build deterministic follow-up tasks from the validated Kimi evidence."""
    issues = validate_summary(summary)
    if issues:
        raise ValueError(f"cannot build agenda from invalid evidence: {issues}")

    irrep = summary["irrep_vandermonde"]
    real_exit = summary["real_early_exit"]
    md = summary["md_interface"]
    cross = summary["cross_mlip"]
    stop1 = real_exit["speedup_by_stop_layer"]["1"]
    mixed_total = md["mixed_reference_best_thresholds"]["total"]

    tasks = [
        agenda_item(
            task_id="kimi-20260607-weak-form-lean",
            lane="formal-verification",
            title="Formalize the weak acceleration/refusal theorem",
            status="done",
            priority=1,
            rationale=(
                "The parameter and irrep Vandermonde thresholds both fail, so the theorem "
                "lane should move to Lipschitz/reach/coverage assumptions rather than rho >= 1.5."
            ),
            evidence_paths=[
                evidence_dir / "irrep_vandermonde_mace_mp0.json",
                evidence_dir / "simulated_acceleration_mace_mp0.json",
                evidence_dir / "real_early_exit_mace_mp0.json",
            ],
            next_action=(
                "WeakAcceleration.lean now states the weak-form assumptions and proves the "
                "speedup/refusal skeleton that current evidence supports. Next extension is "
                "to replace scalar certificate fields with Lipschitz/reach definitions."
            ),
            gates=[
                "lake build in lean-spec",
                "zero sorry outside documented conjecture comments",
                "no claim that rho >= 1.5 holds for MACE or CHGNet",
            ],
            suggested_surfaces=[
                "lean-spec/",
                "docs/conjectures/ledger.md",
                "docs/science/kimi-mlip-universality-import.md",
            ],
            verification_commands=["cd lean-spec && lake build"],
            control_plane_payload={
                "kind": "research_question",
                "id": "rq_kimi_weak_form_lean_20260607",
                "hypothesis_id": "h_kimi_weak_form_acceleration_20260607",
                "priority": 1,
            },
        ),
        agenda_item(
            task_id="kimi-20260607-force-calibrated-refusal",
            lane="mlip-md-interface",
            title="Build force-calibrated refusal metric from layerwise distance",
            status="running",
            priority=1,
            rationale=(
                "Layer-0 distance correlates with force error, but the current hybrid policy "
                "uses energy disagreement and a mixed reference set."
            ),
            evidence_paths=[
                evidence_dir / "md_force_error_correlation.json",
                evidence_dir / "md_hybrid_decision.json",
                evidence_dir / "md_element_specific_hybrid.json",
            ],
            next_action=(
                "A repo-native force-MAE threshold sweep now exists for the imported data. "
                "Next extension is a production scorer with material-scale force labels and "
                "mixed, structure-specific, and chemistry-specific references."
            ),
            gates=[
                "must preserve mixed-reference baseline",
                "must report TPR/FPR and calibration sample size",
                "must not use classical fallback labels as DFT truth",
            ],
            suggested_surfaces=["tools/", "mlip_immi/", "gcp/mlip-cell-runner/"],
            verification_commands=[
                "python tools/mlip_kimi_evidence.py --check",
                "python -m pytest tools/test_mlip_kimi_evidence.py",
            ],
            control_plane_payload={
                "kind": "research_question",
                "id": "rq_kimi_force_refusal_20260607",
                "hypothesis_id": "h_kimi_layerwise_distance_uq_20260607",
                "priority": 1,
            },
        ),
        agenda_item(
            task_id="kimi-20260607-deeper-early-exit",
            lane="runtime-acceleration",
            title="Retest real early-exit on deeper MACE/SevenNet before acceleration claims",
            status="queued",
            priority=2,
            rationale=(
                f"MACE-MP-0 medium stop layer 1 averaged {float(stop1['mean_speedup']):.2f}x "
                "with material energy error, below the idealized bound."
            ),
            evidence_paths=[
                evidence_dir / "real_early_exit_mace_mp0.json",
                evidence_dir / "simulated_acceleration_mace_mp0.json",
            ],
            next_action=(
                "Port only the reusable timing harness, then evaluate deeper models with native "
                "readout support and explicit accuracy gates."
            ),
            gates=[
                "report graph construction and model-forward time separately",
                "accuracy gate must be force-aware, not energy-only",
                "median speedup must improve, not just mean speedup",
            ],
            suggested_surfaces=["tools/", "gcp/mlip-cell-runner/", "docs/runbooks/"],
            verification_commands=[
                "python tools/mlip_kimi_evidence.py --check",
                "python -m pytest tools/test_mlip_kimi_evidence.py",
            ],
            control_plane_payload={
                "kind": "research_question",
                "id": "rq_kimi_deeper_early_exit_20260607",
                "hypothesis_id": "h_kimi_real_early_exit_deeper_models_20260607",
                "priority": 2,
            },
        ),
        agenda_item(
            task_id="kimi-20260607-cross-mlip-rerun",
            lane="cloud-reproducibility",
            title="Reproduce Cloud Run cross-MLIP v7 with timestamped artifacts",
            status="queued",
            priority=2,
            rationale=(
                "The v7 evidence is useful, but future reruns must not overwrite results.json "
                "and should keep the Fe/Al/W sentinels visible."
            ),
            evidence_paths=[
                evidence_dir / "cross_mlip_cloud_v7_results.json",
                evidence_dir / "cross_mlip_cloud_v7_analysis.txt",
            ],
            next_action=(
                "Refactor the cloud script into shared strain logic plus model wrappers, then "
                "rerun on a versioned GCS prefix."
            ),
            gates=[
                "versioned GCS result path",
                "exception-safe torch dtype restoration",
                "physical-instability warnings retained in output",
                "no SevenNet/e3nn patch without pinned image provenance",
            ],
            suggested_surfaces=["gcp/", "tools/", "docs/runbooks/cross-mlip-cloud-experiment.md"],
            verification_commands=[
                "python tools/mlip_kimi_evidence.py --check",
                "just engine-test",
            ],
            control_plane_payload={
                "kind": "research_question",
                "id": "rq_kimi_cross_mlip_cloud_rerun_20260607",
                "hypothesis_id": "h_kimi_cross_mlip_v7_reproducibility_20260607",
                "priority": 2,
            },
        ),
        agenda_item(
            task_id="kimi-20260607-pr-bootstrap",
            lane="statistical-validation",
            title="Add bootstrap confidence intervals to Kimi ensemble PR claims",
            status="done",
            priority=3,
            rationale=(
                "The v7 PR ranking is useful, but Ta/V/Pt rankings need uncertainty before "
                "publication or policy promotion."
            ),
            evidence_paths=[evidence_dir / "cross_mlip_cloud_v7_results.json"],
            next_action=(
                "The evidence analyzer now emits bootstrap PR intervals and rank-stability "
                "checks for the three-MLIP ensembles. Next extension is paper-table formatting."
            ),
            gates=[
                "bootstrap CI reported for every element:all PR",
                "rank-stability summary for Ta, V, Pt, Cr, and Fe",
                "explicit note that Fe is a correlation sentinel, not a high-PR sentinel",
            ],
            suggested_surfaces=["tools/mlip_kimi_evidence.py", "paper/"],
            verification_commands=[
                "python tools/mlip_kimi_evidence.py --check",
                "python -m pytest tools/test_mlip_kimi_evidence.py",
            ],
            control_plane_payload={
                "kind": "research_question",
                "id": "rq_kimi_pr_bootstrap_20260607",
                "hypothesis_id": "h_kimi_cross_mlip_pr_stability_20260607",
                "priority": 3,
            },
        ),
        agenda_item(
            task_id="kimi-20260607-paper3-lean-verification-review",
            lane="publication-review",
            title="Review Paper 3 Lean verification manuscript",
            status="ready_for_review",
            priority=2,
            rationale=(
                "The exported Lean-verification manuscript is strategically valuable, but "
                "its theorem counts, T-number references, and Lean toolchain details must be "
                "reconciled against the current lean-spec build before promotion."
            ),
            evidence_paths=[
                REVIEW_READY_DIR / "paper3-lean-verification.tex",
                REVIEW_READY_DIR / "advanced-paper-review-ledger.md",
                ROOT / "docs" / "formal-proof-ledger.md",
            ],
            next_action=(
                "Run a theorem inventory pass over current lean-spec, then revise the "
                "manuscript so synthetic, theorem-shaped, and empirically grounded claims are "
                "separated in the text."
            ),
            gates=[
                "current theorem inventory attached or cited",
                "Lean toolchain and Mathlib/ATLAS pins match lean-spec",
                "synthetic proof claims separated from empirical validation claims",
            ],
            suggested_surfaces=[
                "paper/review-ready/",
                "lean-spec/",
                "docs/formal-proof-ledger.md",
            ],
            verification_commands=[
                "cd lean-spec && lake build OpenDistillationFactory",
                "python tools/mlip_kimi_evidence.py --check",
            ],
            control_plane_payload={
                "kind": "research_question",
                "id": "rq_kimi_paper3_lean_review_20260607",
                "hypothesis_id": "h_kimi_formal_verification_paper_review_20260607",
                "priority": 2,
            },
        ),
        agenda_item(
            task_id="kimi-20260607-paper4-acceleration-review",
            lane="publication-review",
            title="Review Paper 4 causal acceleration manuscript",
            status="ready_for_review",
            priority=2,
            rationale=(
                "The acceleration manuscript captures the right weak-form direction, but "
                "production acceleration claims must be downgraded to match the scalar Lean "
                "gate and the mixed real early-exit evidence."
            ),
            evidence_paths=[
                REVIEW_READY_DIR / "paper4-causal-acceleration.tex",
                REVIEW_READY_DIR / "advanced-paper-review-ledger.md",
                evidence_dir / "real_early_exit_mace_mp0.json",
                evidence_dir / "simulated_acceleration_mace_mp0.json",
            ],
            next_action=(
                "Revise the manuscript to cite the real early-exit negative result and frame "
                "2x-5x speedups as a review hypothesis until deeper-model evidence passes."
            ),
            gates=[
                "real early-exit negative result cited in the manuscript",
                "2x-5x speedups framed as target or hypothesis unless new evidence passes",
                "proof language synchronized with WeakAcceleration.lean",
            ],
            suggested_surfaces=[
                "paper/review-ready/",
                "lean-spec/OpenDistillationFactory/Materials/Theory/WeakAcceleration.lean",
                "docs/science/kimi-mlip-universality-import.md",
            ],
            verification_commands=[
                "python tools/mlip_kimi_evidence.py --check",
                "python -m pytest tools/test_mlip_kimi_evidence.py",
            ],
            control_plane_payload={
                "kind": "research_question",
                "id": "rq_kimi_paper4_acceleration_review_20260607",
                "hypothesis_id": "h_kimi_causal_acceleration_paper_review_20260607",
                "priority": 2,
            },
        ),
    ]

    return {
        "schema": "lupine.kimi.followup_agenda.v1",
        "source_summary_schema": summary["schema"],
        "session_date": summary["source"]["session_date"],
        "generated_from": summary["source"]["evidence_dir"],
        "summary_sentinels": {
            "irrep_rho": irrep["rho"],
            "irrep_passes_threshold": irrep["passes_threshold"],
            "real_stop1_mean_speedup": stop1["mean_speedup"],
            "mixed_total_youden_j": mixed_total["youden_j"],
            "lowest_cross_mlip_correlation": cross["low_correlations"][0],
            "top_ensemble_pr": cross["top_ensemble_pr"][0],
        },
        "tasks": tasks,
    }


def validate_followup_agenda(agenda: dict[str, Any], summary: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    tasks = agenda.get("tasks")
    if agenda.get("schema") != "lupine.kimi.followup_agenda.v1":
        issues.append("unexpected agenda schema")
    if not isinstance(tasks, list) or len(tasks) < 5:
        issues.append("agenda should contain at least five follow-up tasks")
        return issues

    task_ids = [task.get("task_id") for task in tasks if isinstance(task, dict)]
    if len(task_ids) != len(set(task_ids)):
        issues.append("agenda task_ids must be unique")
    required_lanes = {
        "formal-verification",
        "mlip-md-interface",
        "runtime-acceleration",
        "cloud-reproducibility",
        "statistical-validation",
        "publication-review",
    }
    lanes = {task.get("lane") for task in tasks if isinstance(task, dict)}
    missing = required_lanes - lanes
    if missing:
        issues.append(f"agenda is missing lanes: {sorted(missing)}")

    for task in tasks:
        if not isinstance(task, dict):
            issues.append("agenda task is not an object")
            continue
        if task.get("status") not in {"queued", "running", "done", "ready_for_review"}:
            issues.append(f"{task.get('task_id')} has unsupported status {task.get('status')}")
        if not task.get("evidence_paths"):
            issues.append(f"{task.get('task_id')} has no evidence paths")
        if not task.get("gates"):
            issues.append(f"{task.get('task_id')} has no gates")
        payload = task.get("control_plane_payload")
        if not isinstance(payload, dict) or payload.get("kind") != "research_question":
            issues.append(f"{task.get('task_id')} missing research_question payload")

    sentinels = agenda.get("summary_sentinels", {})
    if sentinels.get("irrep_passes_threshold") is not summary["irrep_vandermonde"]["passes_threshold"]:
        issues.append("agenda irrep sentinel does not match summary")
    if sentinels.get("lowest_cross_mlip_correlation") != summary["cross_mlip"]["low_correlations"][0]:
        issues.append("agenda low-correlation sentinel does not match summary")
    return issues


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def validate_summary(summary: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    cross = summary["cross_mlip"]
    if cross["elastic_count"] != 45:
        issues.append(f"expected 45 elastic calculations, got {cross['elastic_count']}")
    if cross["correlation_count"] != 45:
        issues.append(f"expected 45 cross correlations, got {cross['correlation_count']}")
    if cross["ensemble_pr_count"] != 105:
        issues.append(f"expected 105 ensemble PR values, got {cross['ensemble_pr_count']}")
    if not cross["low_correlations"]:
        issues.append("expected at least one sub-0.95 cross-MLIP correlation sentinel")
    if not cross["physical_flags"]:
        issues.append("expected physical-instability flags to remain visible")
    bootstrap = cross["ensemble_pr_bootstrap"]
    if bootstrap["by_element"]["Ta"]["point_pr"] < 1.3:
        issues.append("expected Ta to remain a high-PR sentinel")
    if bootstrap["by_element"]["Fe"]["point_pr"] > 1.1:
        issues.append("expected Fe to remain a disagreement sentinel, not a high-PR sentinel")

    irrep = summary["irrep_vandermonde"]
    if irrep.get("passes_threshold") is not False:
        issues.append("irrep Vandermonde result should fail the 1.5 threshold")
    if not (0.34 <= float(irrep.get("rho", -1.0)) <= 0.42):
        issues.append("irrep rho moved outside the imported evidence range")
    if float(irrep.get("r2", 0.0)) < 0.95:
        issues.append("irrep geometric fit should remain strong even though threshold fails")

    real_exit = summary["real_early_exit"]
    stop1 = real_exit["speedup_by_stop_layer"]["1"]
    bound1 = real_exit["theoretical_bounds"]["1"]
    if float(stop1["mean_speedup"]) >= float(bound1):
        issues.append("real stop-layer-1 speedup should stay below the ideal bound")
    err1 = real_exit["energy_error_by_stop_layer"]["1"]
    if float(err1["mae_ev"]) < 0.5:
        issues.append("real early-exit energy error is unexpectedly low; recheck import")

    md = summary["md_interface"]
    layer0 = md["force_correlations"]["layer_0"]
    total = md["force_correlations"]["total"]
    if float(layer0["pearson_r"]) < 0.5:
        issues.append("layer-0 force-error correlation should be visible")
    if float(total["pearson_r"]) < 0.45:
        issues.append("total-distance force-error correlation should be visible")
    force_refusal = md["force_calibrated_refusal"]
    if float(force_refusal["best_thresholds"]["layer_0"]["youden_j"]) < 0.5:
        issues.append("force-calibrated layer-0 refusal sentinel should be visible")
    if float(force_refusal["force_mae_max"]) >= 1e-9:
        issues.append("force-calibrated imported scale changed; revisit caveat")

    mixed_total = md["mixed_reference_best_thresholds"]["total"]
    cu_total = md["element_specific_best_thresholds"]["total"]
    if float(mixed_total["youden_j"]) <= float(cu_total["youden_j"]):
        issues.append("mixed reference should outperform Cu-only in imported evidence")

    return issues


def markdown_summary(summary: dict[str, Any]) -> str:
    cross = summary["cross_mlip"]
    irrep = summary["irrep_vandermonde"]
    real_exit = summary["real_early_exit"]
    md = summary["md_interface"]
    bootstrap = cross["ensemble_pr_bootstrap"]
    force_refusal = md["force_calibrated_refusal"]
    lines = [
        "# Kimi MLIP Evidence Summary",
        "",
        f"- Elastic calculations: {cross['elastic_count']}",
        f"- Cross-MLIP correlations: {cross['correlation_count']}",
        f"- Ensemble PR values: {cross['ensemble_pr_count']}",
        f"- Lowest correlation sentinel: {cross['low_correlations'][0]}",
        f"- Highest ensemble PR sentinel: {cross['top_ensemble_pr'][0]}",
        f"- Ta bootstrap PR CI: [{bootstrap['by_element']['Ta']['ci_lower']:.3f}, {bootstrap['by_element']['Ta']['ci_upper']:.3f}]",
        f"- Irrep rho: {irrep['rho']:.3f} (threshold {irrep['threshold']}, pass={irrep['passes_threshold']})",
        (
            "- Real early-exit stop 1: "
            f"{real_exit['speedup_by_stop_layer']['1']['mean_speedup']:.2f}x, "
            f"MAE {real_exit['energy_error_by_stop_layer']['1']['mae_ev']:.3f} eV"
        ),
        (
            "- MD force-error correlation: "
            f"layer0 r={md['force_correlations']['layer_0']['pearson_r']:.3f}, "
            f"total r={md['force_correlations']['total']['pearson_r']:.3f}"
        ),
        (
            "- Force-calibrated refusal shape check: "
            f"layer0 J={force_refusal['best_thresholds']['layer_0']['youden_j']:.3f}; "
            f"max force MAE={force_refusal['force_mae_max']:.2e}"
        ),
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--markdown", action="store_true", help="print a compact Markdown summary")
    parser.add_argument("--check", action="store_true", help="validate imported evidence contracts")
    parser.add_argument("--agenda", action="store_true", help="print deterministic follow-up agenda JSON")
    parser.add_argument(
        "--write-agenda",
        nargs="?",
        const=str(DEFAULT_AGENDA_PATH),
        help="write deterministic follow-up agenda JSON; defaults to the evidence directory",
    )
    args = parser.parse_args()

    summary = build_summary()
    issues = validate_summary(summary)
    agenda = build_followup_agenda(summary)
    agenda_issues = validate_followup_agenda(agenda, summary)
    if args.check:
        all_issues = issues + agenda_issues
        if all_issues:
            for issue in all_issues:
                print(f"ERROR: {issue}")
            return 1
        print("Kimi evidence import passed validation")
        return 0
    if args.write_agenda:
        if agenda_issues:
            for issue in agenda_issues:
                print(f"ERROR: {issue}")
            return 1
        write_json(Path(args.write_agenda), agenda)
        print(f"Wrote {args.write_agenda}")
        return 0
    if args.agenda:
        print(json.dumps({**agenda, "validation_issues": agenda_issues}, indent=2, sort_keys=True))
        return 0 if not agenda_issues else 1
    if args.markdown:
        print(markdown_summary(summary), end="")
    else:
        print(
            json.dumps(
                {
                    **summary,
                    "followup_agenda": agenda,
                    "validation_issues": issues + agenda_issues,
                },
                indent=2,
                sort_keys=True,
            )
        )
    return 0 if not issues and not agenda_issues else 1


if __name__ == "__main__":
    raise SystemExit(main())
