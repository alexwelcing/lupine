"""Sealed, finite known-answer checks of the selector, not physical validation.

Problem resources contain intervals only. Outcome resources are opened only after
selection and are bound to the exact problem digest. The independent oracle uses
only exhaustive truth enumeration; it never sees the intervals or selector result.
"""
from copy import deepcopy
from fractions import Fraction
from importlib.resources import files
import json

from .core import select
from .evidence import digest
from .replay import evaluate
from .serialization import encode, parse_outcomes, parse_problem


def _resource(name):
    return json.loads(files("lupine_discovery.resources").joinpath(name).read_text(encoding="utf-8"))


def _entry(case_id):
    for entry in _resource("catalog.json"):
        if entry["id"] == case_id:
            return entry
    raise ValueError(f"unknown benchmark case: {case_id}")


def case_catalog():
    """List interval-only demonstrations without exposing their known answers."""
    return [{key: entry[key] for key in ("id", "title", "description", "kind", "has_outcomes")}
            for entry in _resource("catalog.json")]


def get_case(case_id):
    """Get an independent copy of the problem; never include hidden outcomes."""
    entry = _entry(case_id)
    return {**{key: entry[key] for key in ("id", "title", "description", "kind")},
            "problem": _resource(f"problems/{case_id}.json")}


def get_case_outcomes(case_id, problem):
    """Reveal outcomes only for the exact packaged problem, rejecting edits.

    This prevents a stale answer file being replayed against a changed problem.
    It does not make these publicly available fixtures a blind study.
    """
    entry = _entry(case_id)
    expected_digest = digest(_resource(f"problems/{entry['id']}.json"))
    if digest(problem) != expected_digest:
        raise ValueError("known answers require the unchanged packaged problem")
    result = _resource(f"outcomes/{entry['id']}.json")
    parse_outcomes(result, problem["scenario"]["id"], expected_digest)
    return result


def archived_reports():
    """Return the original archived aggregates unchanged, including failures.

    Both archived tasks refuted simultaneous interval soundness on their test
    sets. The band-gap task lost five tied optima. See empirical_soundness and
    interval_pool.all_optima_retained; this file is not a passing release gate.
    """
    return _resource("archived-v1.json")


def _truth_oracle(outcomes):
    """Solve the finite problem by direct truth enumeration, without core calls."""
    rows = outcomes["outcomes"]
    feasible = [row for row in rows
                if all(Fraction(value) <= 0 for value in row["constraints"].values())]
    best = min((Fraction(row["score"]) for row in feasible), default=None)
    return {
        "true_feasible_ids": sorted(row["id"] for row in feasible),
        "true_minimizers": sorted(row["id"] for row in feasible if Fraction(row["score"]) == best),
        "true_feasible_optimum": None if best is None else str(best),
    }


def _formula_truth(entry):
    """A second truth source for formula cases, independent of fixture outcomes."""
    if entry["id"] == "integer-design-grid":
        return [{"id": f"x{x}-y{y}", "score": str((x - 3) ** 2 + 2 * (y - 5) ** 2),
                 "constraints": {"capacity": str(x + y - 9), "minimum_x": str(2 - x)}}
                for x in range(9) for y in range(9)]
    if entry["id"] == "signed-composition":
        return [{"id": f"a{a}-b{b}", "score": str(2 * a - 3 * b + Fraction(1, 2)),
                 "constraints": {"combined": str(max(a + b - 6, 1 - a))}}
                for a in (0, 2, 4) for b in (0, 2, 4)]
    return None


def _run_case(entry):
    case_id = entry["id"]
    problem_value = get_case(case_id)["problem"]
    problem = parse_problem(problem_value)
    # Selection has finished before the outcome resource is read.
    selection = select(problem.candidates)
    outcomes_value = get_case_outcomes(case_id, problem_value)
    outcomes = parse_outcomes(outcomes_value, problem.scenario_id, digest(problem_value))
    oracle = _truth_oracle(outcomes_value)
    replay = evaluate(problem.candidates, outcomes)
    truth_by_id = {row["id"]: row for row in outcomes_value["outcomes"]}
    optimum_ids = oracle["true_minimizers"]
    retention = all(cid in selection.retained for cid in optimum_ids) if optimum_ids else None
    incumbent_regret = None
    if selection.incumbent is not None and selection.incumbent in oracle["true_feasible_ids"]:
        incumbent_regret = str(Fraction(truth_by_id[selection.incumbent]["score"])
                               - Fraction(oracle["true_feasible_optimum"]))
    # Independently check every endpoint against truth; replay must agree.
    score_sound = all(Fraction(row["score"][0]) <= Fraction(truth_by_id[row["id"]]["score"])
                      <= Fraction(row["score"][1]) for row in problem_value["candidates"])
    constraints_sound = all(Fraction(bounds[0]) <= Fraction(truth_by_id[row["id"]]["constraints"][key])
                            <= Fraction(bounds[1]) for row in problem_value["candidates"]
                            for key, bounds in row["constraints"].items())
    sound = score_sound and constraints_sound
    regret_holds = None if incumbent_regret is None or selection.regret_bound is None else (
        Fraction(incumbent_regret) <= selection.regret_bound)
    observed = {
        **oracle,
        "candidate_count": len(problem.candidates),
        "true_feasible_count": len(oracle["true_feasible_ids"]),
        "retained": list(selection.retained),
        "pool_size": len(selection.retained),
        "pool_fraction": str(Fraction(len(selection.retained), len(problem.candidates))),
        "incumbent": selection.incumbent,
        "threshold": encode(selection.threshold),
        "regret_bound": encode(selection.regret_bound),
        "incumbent_regret": incumbent_regret,
        "regret_bound_holds": regret_holds,
        "all_true_minimizers_retained": retention,
        "score_intervals_sound": score_sound,
        "constraint_intervals_sound": constraints_sound,
        "intervals_sound": sound,
        "empirical_soundness": replay["empirical_soundness"],
        "certified_infeasible": list(selection.certified_infeasible),
    }
    checks = {f"expected_{key}": observed[key] == value for key, value in entry["expected"].items()}
    checks.update({
        "replay_selection_matches_sealed_run": replay["selection"] == selection,
        "replay_minimizers_match_independent_oracle": list(replay["true_minimizers"]) == optimum_ids,
        "replay_optimum_matches_independent_oracle": encode(replay["true_feasible_optimum"])
        == oracle["true_feasible_optimum"],
        "replay_regret_matches_independent_oracle": encode(replay["incumbent_regret"]) == incumbent_regret,
        "replay_retention_matches_independent_oracle": replay["all_true_minimizers_retained"] == retention,
        "replay_soundness_matches_direct_endpoint_checks": replay["empirical_soundness"] == (
            "supported_on_complete_finite_archive" if sound else "refuted_on_observed_outcomes"),
        "outcome_universe_matches_problem": set(truth_by_id) == {c.candidate_id for c in problem.candidates},
    })
    formula = _formula_truth(entry)
    if formula is not None:
        checks["stored_truth_matches_independent_formula_enumeration"] = outcomes_value["outcomes"] == formula
    if entry["kind"] == "synthetic_sound":
        checks["all_supplied_intervals_contain_truth"] = sound
        checks["all_feasible_optima_retained"] = retention is not False
        checks["incumbent_regret_within_conditional_bound"] = regret_holds is not False
        checks["all_certified_infeasibility_decisions_correct"] = not (
            set(selection.certified_infeasible) & set(oracle["true_feasible_ids"]))
    else:
        checks["deliberately_unsound_input_detected_on_replay"] = not sound
        checks["negative_control_exposes_lost_optimum"] = retention is False
    return {
        "id": case_id, "title": entry["title"], "kind": entry["kind"],
        "status": "pass" if all(checks.values()) else "fail",
        "problem_digest": digest(problem_value), "outcome_digest": digest(outcomes_value),
        "oracle": entry["oracle"], "expected": deepcopy(entry["expected"]),
        "observed": observed, "checks": checks,
    }


def run_known_answers():
    """Execute fixture expectations, keeping negative controls separate."""
    cases = [_run_case(entry) for entry in _resource("catalog.json")]
    by_id = {case["id"]: case for case in cases}
    before, after = (by_id[key]["observed"] for key in ("loose-intervals", "refined-intervals"))
    old, new = (get_case(key)["problem"] for key in ("loose-intervals", "refined-intervals"))
    old_rows, new_rows = ({row["id"]: row for row in value["candidates"]} for value in (old, new))
    nested = old_rows.keys() == new_rows.keys() and all(
        Fraction(old_bounds[0]) <= Fraction(new_bounds[0]) <= Fraction(new_bounds[1]) <= Fraction(old_bounds[1])
        for key in old_rows
        for old_bounds, new_bounds in [(old_rows[key]["score"], new_rows[key]["score"])]
        + [(old_rows[key]["constraints"][g], new_rows[key]["constraints"][g])
           for g in old_rows[key]["constraints"]])
    refinement_checks = {
        "same_semantic_scope": old["scenario"] == new["scenario"],
        "intervals_nested": nested,
        "retained_subset": set(after["retained"]) <= set(before["retained"]),
        "regret_bound_nonincreasing": Fraction(after["regret_bound"]) <= Fraction(before["regret_bound"]),
        "both_retain_all_optima": before["all_true_minimizers_retained"] and after["all_true_minimizers_retained"],
    }
    refined_case = by_id["refined-intervals"]
    refined_case["checks"].update({f"refinement_{key}": value for key, value in refinement_checks.items()})
    refined_case["status"] = "pass" if all(refined_case["checks"].values()) else "fail"
    sound_cases = [case for case in cases if case["kind"] == "synthetic_sound"]
    negative_cases = [case for case in cases if case["kind"] == "synthetic_negative_control"]
    report = {
        "schema": "lupine.discovery.known_answers.v1",
        "summary": {"total": len(cases), "passed": sum(case["status"] == "pass" for case in cases),
                    "failed": sum(case["status"] != "pass" for case in cases)},
        "pass_meaning": "Predeclared expectations match independent finite truth; negative-control passes mean failures were exposed.",
        "physical_validation_status": "unestablished; synthetic engine checks do not validate a materials predictor",
        "study_status": "Public deterministic fixtures, not a prospective blinded experiment",
        "sound_case_metrics": {
            "total": len(sound_cases),
            "passed": sum(case["status"] == "pass" for case in sound_cases),
            "cases_with_feasible_optima": sum(bool(case["observed"]["true_minimizers"]) for case in sound_cases),
            "cases_retaining_all_optima": sum(case["observed"]["all_true_minimizers_retained"] is True
                                             for case in sound_cases),
            "cases_with_smaller_pool": sum(case["observed"]["pool_size"] < case["observed"]["candidate_count"]
                                           for case in sound_cases),
        },
        "negative_control_metrics": {
            "total": len(negative_cases),
            "detected_unsound_intervals": sum(not case["observed"]["intervals_sound"] for case in negative_cases),
            "lost_optimum_cases": sum(case["observed"]["all_true_minimizers_retained"] is False
                                      for case in negative_cases),
            "not_counted_as_sound_case_successes": True,
        },
        "cases": cases,
    }
    report["refinement_check"] = {
        "before": "loose-intervals", "after": "refined-intervals",
        "pool_size_before": before["pool_size"], "pool_size_after": after["pool_size"],
        **refinement_checks,
    }
    return report
