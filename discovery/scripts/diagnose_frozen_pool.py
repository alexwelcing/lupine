#!/usr/bin/env python3
"""Post-hoc interval geometry diagnosis with no evaluation-target access.

This explains a frozen selector output. Hypothetical radius contractions are
sensitivity controls, not recalibration, new intervals or benchmark accuracy.
"""
from fractions import Fraction
import argparse
import json
from pathlib import Path

import constrained_benchmark as benchmark
from lupine_discovery.core import Candidate, Interval, select


ROOT = Path(__file__).resolve().parents[1]
SCENARIOS = (
    ("frozen", "1", "1"),
    ("half_score_radius_only", "1/2", "1"),
    ("quarter_score_radius_only", "1/4", "1"),
    ("half_constraint_radius_only", "1", "1/2"),
    ("quarter_constraint_radius_only", "1", "1/4"),
    ("half_both_radii", "1/2", "1/2"),
    ("quarter_both_radii", "1/4", "1/4"),
    ("point_predictions_only", "0", "0"),
)


def exact_summary(values):
    ordered = sorted(Fraction(v) for v in values)
    if not ordered:
        return {"count": 0, "min": None, "median": None, "mean": None,
                "p90": None, "p95": None, "p99": None, "max": None}
    n = len(ordered)
    def quantile(p):
        rank = -(-(n * p.numerator) // p.denominator)
        return str(ordered[max(1, rank) - 1])
    median = ordered[n // 2] if n % 2 else (ordered[n // 2 - 1] + ordered[n // 2]) / 2
    return {"count": n, "min": str(ordered[0]), "median": str(median),
            "mean": str(sum(ordered, Fraction(0)) / n),
            "p90": quantile(Fraction(9, 10)), "p95": quantile(Fraction(19, 20)),
            "p99": quantile(Fraction(99, 100)), "max": str(ordered[-1])}


def diagnose_panel(panel, gap_radius, formation_radius, gap_factor=Fraction(1),
                   formation_factor=Fraction(1), verify_original=True):
    gap_factor, formation_factor = Fraction(gap_factor), Fraction(formation_factor)
    if gap_factor < 0 or formation_factor < 0:
        raise ValueError("radius multipliers must be nonnegative")
    q_gap, q_g = Fraction(gap_radius) * gap_factor, Fraction(formation_radius) * formation_factor
    if q_gap < 0 or q_g < 0:
        raise ValueError("radii must be nonnegative")
    candidates, predicted_gap, predicted_g = [], {}, {}
    for row in panel["candidates"]:
        jid = row["jid"]
        gap, g = Fraction(row["predicted_gap"]), Fraction(row["predicted_formation"])
        score_interval, constraint_interval = Interval(-gap-q_gap, -gap+q_gap), Interval(g-q_g, g+q_g)
        if verify_original and (list(map(str, (score_interval.lower, score_interval.upper))) != row["score_interval"]
                                or list(map(str, (constraint_interval.lower, constraint_interval.upper)))
                                != row["constraint_interval"]):
            raise ValueError("supplied frozen intervals differ from original predictions and radii")
        candidates.append(Candidate(jid, score_interval, {"formation": constraint_interval}))
        predicted_gap[jid], predicted_g[jid] = gap, g
    selected = select(candidates)
    if not candidates:
        raise ValueError("diagnosis requires a nonempty panel")
    index = {c.candidate_id: c for c in candidates}
    common_lower = max(c.score.lower for c in candidates)
    common_upper = min(c.score.upper for c in candidates)
    score_spread = max(predicted_gap.values()) - min(predicted_gap.values())
    nominal_feasible = [jid for jid, g in predicted_g.items() if g <= 0]
    certification_margins = [-(g + q_g) for g in predicted_g.values()]
    possibility_margins = [q_g - g for g in predicted_g.values()]
    strict_margins = [] if selected.threshold is None else [
        index[jid].score.lower - selected.threshold for jid in selected.possible_feasible]
    if not selected.possible_feasible:
        reason = "no_possibly_feasible_candidates"
    elif selected.incumbent is None:
        reason = "no_certified_incumbent_retains_all_possible"
    elif selected.certified_infeasible and selected.dominated:
        reason = "both_exclusion_channels_active"
    elif selected.certified_infeasible:
        reason = "feasibility_exclusions_only"
    elif selected.dominated:
        reason = "objective_exclusions_only"
    else:
        reason = "all_possible_no_strict_objective_separation"
    return {"panel_id": panel["id"], "role": panel["role"], "candidate_count": len(candidates),
            "certified_feasible_count": len(selected.certified_feasible),
            "possible_feasible_count": len(selected.possible_feasible),
            "certified_infeasible_count": len(selected.certified_infeasible),
            "unresolved_feasibility_count": len(selected.possible_feasible) - len(selected.certified_feasible),
            "retained_count": len(selected.retained), "objective_pruned_count": len(selected.dominated),
            "retained_ids_sha256": benchmark.digest(list(selected.retained)),
            "incumbent": selected.incumbent,
            "threshold": None if selected.threshold is None else str(selected.threshold),
            "nominal_feasible_count": len(nominal_feasible),
            "nominal_feasible_but_uncertified_count": sum(predicted_g[jid] + q_g > 0 for jid in nominal_feasible),
            "certification_margin": exact_summary(certification_margins),
            "possibility_margin": exact_summary(possibility_margins),
            "objective_strict_pruning_margin": exact_summary(strict_margins),
            "strict_pruning_boundary_ties_kept": sum(margin == 0 for margin in strict_margins),
            "predicted_gap_span": str(score_spread), "gap_interval_width": str(2*q_gap),
            "common_objective_intersection": [str(common_lower), str(common_upper)] if common_lower <= common_upper else None,
            "common_objective_intersection_width": str(common_upper-common_lower) if common_lower <= common_upper else None,
            "reason": reason}


def aggregate(panels):
    fields = ("candidate_count", "certified_feasible_count", "possible_feasible_count", "certified_infeasible_count",
              "unresolved_feasibility_count", "retained_count", "objective_pruned_count", "nominal_feasible_count",
              "nominal_feasible_but_uncertified_count", "strict_pruning_boundary_ties_kept")
    return {"panel_count": len(panels), **{field: sum(p[field] for p in panels) for field in fields},
            "panels_with_incumbent": sum(p["incumbent"] is not None for p in panels),
            "panels_without_incumbent": sum(p["incumbent"] is None for p in panels),
            "panels_with_common_objective_intersection": sum(p["common_objective_intersection"] is not None for p in panels),
            "panels_with_full_pool": sum(p["retained_count"] == p["candidate_count"] for p in panels),
            "predicted_gap_span": exact_summary([p["predicted_gap_span"] for p in panels]),
            "common_objective_intersection_width": exact_summary([
                p["common_objective_intersection_width"] for p in panels if p["common_objective_intersection_width"] is not None]),
            "best_strict_pruning_margin_per_incumbent_panel": exact_summary([
                p["objective_strict_pruning_margin"]["max"] for p in panels if p["incumbent"] is not None])}


def _distance_bucket(distance):
    if distance == 0:
        return "zero"
    for upper, label in [(Fraction(1, 4), "(0,1/4]"), (Fraction(1, 2), "(1/4,1/2]"),
                         (Fraction(1), "(1/2,1]"), (Fraction(2), "(1,2]")]:
        if distance <= upper:
            return label
    raise ValueError("atomic-fraction L1 distance outside [0,2]")


def calibration_diagnosis(frozen, metadata, predictions, calibration):
    rows = metadata["selected"]["calibration"]
    targets = calibration["targets"]
    if {r["jid"] for r in rows} != set(targets) or len(rows) != frozen["calibration"]["count"]:
        raise ValueError("calibration identity/count mismatch")
    errors = {target: [abs(Fraction(targets[row["jid"]][target])
                          - Fraction(predictions[row["jid"]]["predicted_"+target])) for row in rows]
              for target in ("gap", "formation")}
    summaries = {}
    rank = frozen["calibration"]["rank"]
    for target, residuals in errors.items():
        radius = Fraction(frozen["calibration"][target+"_radius"])
        if not 1 <= rank <= len(residuals) or sorted(residuals)[rank-1] != radius:
            raise ValueError("frozen radius does not equal its permitted calibration order statistic")
        summaries[target] = {**exact_summary(residuals), "applied_radius": str(radius), "applied_rank": rank,
                             "above_applied_radius": sum(r > radius for r in residuals),
                             "equal_to_applied_radius": sum(r == radius for r in residuals)}
    training = {r["jid"]: r["counts"] for r in metadata["selected"]["train"]}
    grouped = {name: {"gap": [], "formation": [], "distances": []}
               for name in ("zero", "(0,1/4]", "(1/4,1/2]", "(1/2,1]", "(1,2]")}
    for index, row in enumerate(rows):
        nearest = predictions[row["jid"]]["neighbors"][0]
        distance = benchmark.exact_distance(row["counts"], training[nearest])
        group = grouped[_distance_bucket(distance)]
        group["distances"].append(distance)
        for target in errors:
            group[target].append(errors[target][index])
    return {"residuals": summaries,
            "nearest_training_distance": exact_summary([x for group in grouped.values() for x in group["distances"]]),
            "residuals_by_fixed_distance_bucket": {
                name: {"count": len(group["distances"]),
                       "has_399_examples": len(group["distances"]) >= 399,
                       "gap": exact_summary(group["gap"]), "formation": exact_summary(group["formation"])}
                for name, group in grouped.items()},
            "bucket_status": "posthoc descriptive calibration diagnostics; no conditional-coverage guarantee or replacement calibration"}


def diagnose_inputs(frozen, metadata, predictions, calibration):
    if frozen["calibration"]["outcome_kind"] != "finite":
        return {"status": "unbounded_calibration", "reason": "No finite interval geometry to contract; no synthetic finite bound inserted."}
    gap_radius = Fraction(frozen["calibration"]["gap_radius"])
    formation_radius = Fraction(frozen["calibration"]["formation_radius"])
    primary = [p for p in frozen["panels"] if p["role"] == "primary"]
    baseline = [diagnose_panel(p, gap_radius, formation_radius) for p in primary]
    for panel, diagnosis in zip(primary, baseline):
        if diagnosis["retained_ids_sha256"] != benchmark.digest(sorted(panel["operational_retained"])):
            raise ValueError("diagnosis disagrees with sealed operational pool membership")
    sensitivity = []
    for name, score_factor, constraint_factor in SCENARIOS:
        panels = [diagnose_panel(p, gap_radius, formation_radius, Fraction(score_factor), Fraction(constraint_factor),
                                 verify_original=name == "frozen") for p in primary]
        sensitivity.append({"scenario": name, "score_radius_multiplier": score_factor,
                            "constraint_radius_multiplier": constraint_factor,
                            "status": "unchanged_frozen_input" if name == "frozen" else "hypothetical_not_calibrated",
                            "summary": aggregate(panels)})
    return {"status": "complete", "original_radii": {"gap_eV": str(gap_radius),
                "formation_eV_per_atom": str(formation_radius)},
            "primary": {"summary": aggregate(baseline), "panels": baseline,
                        "prediction_centers": {
                            target: exact_summary([c["predicted_"+target] for p in primary for c in p["candidates"]])
                            for target in ("gap", "formation")}},
            "calibration": calibration_diagnosis(frozen, metadata, predictions, calibration),
            "radius_sensitivity": sensitivity,
            "sensitivity_limit": "Only predicted input geometry changes. No target accuracy, coverage, optimum retention, or feasible-hit rate is evaluated. Zero radii mean point predictions, not known truths.",
            "shift": {"panel_count": sum(p["role"] == "shift" for p in frozen["panels"]),
                      "status": "unsupported_scope_operational_abstention_unchanged"}}


def run(freeze_path, output):
    freeze_path, output = Path(freeze_path), Path(output)
    frozen = benchmark.verify_freeze(freeze_path)
    cache = freeze_path.parent
    # These are the only additional documents opened; evaluation targets and
    # previously computed truth/replay reports have no path through this tool.
    metadata = benchmark.read_verified_json(cache/"metadata.json", frozen["metadata_sha256"])
    predictions = benchmark.read_verified_json(cache/"predictions.json", frozen["prediction_sha256"])
    calibration = benchmark.read_verified_json(cache/"calibration.json", frozen["calibration_sha256"])
    report = {"schema": "lupine.discovery.interval_bottleneck.v1", "analysis_status": "posthoc_after_first_evaluation_opened",
              "protocol_results_modified": False, "evaluation_target_file_opened": False,
              "evaluation_truth_report_opened": False, "new_coverage_validation": False,
              "protocol_id": frozen["protocol_id"], "protocol_commit": frozen["protocol_commit"],
              "protocol_sha256": frozen["protocol_sha256"],
              "format_amendment_commit": frozen["format_amendment_commit"],
              "format_amendment_sha256": frozen["format_amendment_sha256"],
              "input_sha256": {"freeze_file": benchmark.sha256_file(freeze_path),
                               "freeze_payload": frozen["receipt_sha256"],
                               "metadata": frozen["metadata_sha256"], "predictions": frozen["prediction_sha256"],
                               "calibration_labels": frozen["calibration_sha256"],
                               "source_receipt": frozen["source_receipt_sha256"]},
              "diagnostic_implementation_sha256": benchmark.sha256_file(Path(__file__)),
              "statistic_conventions": {"median": "middle value or exact mean of the two middle values",
                 "p90_p95_p99": "nearest-rank empirical order statistic ceil(n*p), descriptive only",
                 "strict_pruning_margin": "score_lower - best_certified_score_upper; positive excludes, zero retains",
                 "certification_margin": "-(predicted_formation + formation_radius); nonnegative certifies conditionally",
                 "possibility_margin": "formation_radius - predicted_formation; nonnegative is possibly feasible"},
              "diagnosis": diagnose_inputs(frozen, metadata, predictions, calibration)}
    benchmark.write_immutable(output, report)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("freeze", type=Path, nargs="?", default=benchmark.DEFAULT_CACHE/"freeze.json")
    parser.add_argument("--output", type=Path, default=ROOT/"reports/interval-bottleneck-v1.json")
    args = parser.parse_args()
    report = run(args.freeze, args.output)
    print(json.dumps({"status": report["diagnosis"]["status"], "output": str(args.output),
                      "report_sha256": benchmark.sha256_file(args.output),
                      "primary_summary": report["diagnosis"].get("primary", {}).get("summary")}))


if __name__ == "__main__":
    main()
