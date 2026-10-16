"""Strict scoped Pareto certificates and separately sealed outcome replay."""
from dataclasses import dataclass
from fractions import Fraction

from . import __version__
from .core import exact
from .evidence import Evidence, Scope, assess_links, digest, fields, nonempty
from .pareto import ParetoCandidate, select_pareto
from .serialization import encode, interval


PROBLEM_SCHEMA = "lupine.discovery.pareto_problem.v1"
OUTCOMES_SCHEMA = "lupine.discovery.pareto_outcomes.v1"


@dataclass(frozen=True)
class ParetoProblem:
    scenario_id: str
    candidates: tuple[ParetoCandidate, ...]
    objective_keys: tuple[str, ...]
    constraint_keys: tuple[str, ...]
    evidence_assessment: dict


def parse_pareto_problem(value):
    fields(value, ("schema", "scenario", "candidates"), ("evidence", "description"))
    if value["schema"] != PROBLEM_SCHEMA:
        raise ValueError("unsupported Pareto problem schema")
    if "description" in value and not isinstance(value["description"], str):
        raise ValueError("description must be a string")
    scenario = value["scenario"]
    fields(scenario, ("id", "objectives", "constraints"))
    sid = nonempty(scenario["id"], "scenario ID")
    objectives, constraints = scenario["objectives"], scenario["constraints"]
    if not isinstance(objectives, dict) or not objectives:
        raise ValueError("scenario objectives must be a nonempty object")
    if not isinstance(constraints, dict):
        raise ValueError("scenario constraints must be an object")
    if set(objectives) & set(constraints):
        raise ValueError("objective and constraint quantity keys must be disjoint")
    expected = {}
    for specs, is_objective in ((objectives, True), (constraints, False)):
        for key, spec in specs.items():
            nonempty(key, "quantity key")
            fields(spec, ("unit", "reference", "direction") if is_objective else ("unit", "reference"))
            if is_objective and spec["direction"] != "minimize":
                raise ValueError("normalize every objective to minimization explicitly")
            expected[key] = Scope(sid, key, nonempty(spec["unit"], "unit"),
                                  nonempty(spec["reference"], "reference"))
    records = value.get("evidence", [])
    if not isinstance(records, list):
        raise ValueError("evidence must be an array")
    evidence = {}
    for row in records:
        record = Evidence.from_dict(row)
        if record.evidence_id in evidence:
            raise ValueError("duplicate evidence ID")
        evidence[record.evidence_id] = record
    rows = value["candidates"]
    if not isinstance(rows, list):
        raise ValueError("candidates must be an array")
    candidates, assessments = [], {}
    for row in rows:
        fields(row, ("id", "objectives", "constraints"), ("evidence",))
        for name, specs in (("objectives", objectives), ("constraints", constraints)):
            if not isinstance(row[name], dict) or set(row[name]) != set(specs):
                raise ValueError(f"candidate {name} do not match scenario")
        candidate = ParetoCandidate(row["id"], {key: interval(val) for key, val in row["objectives"].items()},
                                    {key: interval(val) for key, val in row["constraints"].items()})
        candidates.append(candidate)
        links = row.get("evidence", {})
        if not isinstance(links, dict):
            raise ValueError("candidate evidence links must be an object")
        assessments[candidate.candidate_id] = assess_links(links, expected, evidence)
    select_pareto(candidates)  # shared identity, interval and target-shape checks
    return ParetoProblem(sid, tuple(candidates), tuple(sorted(objectives)), tuple(sorted(constraints)), assessments)


def pareto_certificate(value):
    problem = parse_pareto_problem(value)
    selection = select_pareto(problem.candidates)
    indexed = {candidate.candidate_id: candidate for candidate in problem.candidates}
    reasons = {}
    for cid, candidate in sorted(indexed.items()):
        if cid in selection.certified_infeasible:
            reasons[cid] = {"reason": "constraint_lower_bound_positive",
                            "constraints": sorted(key for key, bound in candidate.constraints.items() if bound.lower > 0)}
        elif cid in selection.dominance_witnesses:
            witness_id = selection.dominance_witnesses[cid]
            witness = indexed[witness_id]
            reasons[cid] = {"reason": "certified_feasible_bound_dominance", "witness": witness_id,
                            "strict_objectives": sorted(key for key, bound in candidate.objectives.items()
                                                        if witness.objectives[key].upper < bound.lower)}
        else:
            reasons[cid] = {"reason": "retained_not_proven_dominated_or_infeasible"}
    payload = encode({
        "schema": "lupine.discovery.pareto_certificate.v1", "engine_version": __version__,
        "problem_digest": digest(value), "scenario_id": problem.scenario_id,
        "claim": "conditional_finite_universe_feasible_pareto_retention",
        "physical_attestation": "not_established_by_this_program",
        "selection": selection, "reasons": reasons,
        "evidence_assessment": problem.evidence_assessment,
        "measurement_queue": {"kind": "deterministic_id_order_not_an_objective_ranking",
                              "candidate_ids": selection.retained},
        "assumptions": [
            "All objective and constraint intervals contain their stated true values.",
            "Each quantity uses its declared scenario, unit, reference and minimization direction.",
            "The candidate universe is the finite input; no completeness of matter is claimed.",
            "Pareto dominance means no worse in every objective and strictly better in at least one.",
        ],
    })
    return {**payload, "certificate_digest": digest(payload)}


@dataclass(frozen=True)
class ParetoTruth:
    candidate_id: str
    objectives: dict[str, Fraction | None]
    constraints: dict[str, Fraction | None]


def parse_pareto_outcomes(value, problem, problem_digest):
    fields(value, ("schema", "scenario_id", "problem_digest", "outcomes"))
    if value["schema"] != OUTCOMES_SCHEMA:
        raise ValueError("unsupported Pareto outcomes schema")
    if value["scenario_id"] != problem.scenario_id or value["problem_digest"] != problem_digest:
        raise ValueError("outcomes do not match the sealed Pareto problem")
    if not isinstance(value["outcomes"], list):
        raise ValueError("outcomes must be an array")
    universe = {candidate.candidate_id for candidate in problem.candidates}
    result = {}
    for row in value["outcomes"]:
        fields(row, ("id", "objectives", "constraints"))
        cid = nonempty(row["id"], "truth ID")
        if cid not in universe:
            raise ValueError("truth candidate ID outside prediction universe")
        if cid in result:
            raise ValueError("duplicate truth candidate ID")
        parsed = {}
        for name, keys in (("objectives", problem.objective_keys), ("constraints", problem.constraint_keys)):
            if not isinstance(row[name], dict):
                raise ValueError(f"truth {name} must be an object")
            if set(row[name]) - set(keys):
                raise ValueError(f"unknown truth {name} quantity")
            parsed[name] = {key: None if val is None else exact(val) for key, val in row[name].items()}
        result[cid] = ParetoTruth(cid, parsed["objectives"], parsed["constraints"])
    return result


def _truth_front(ids, truth, objective_keys):
    """Truth-only dominance: no intervals or selection membership enter."""
    return tuple(sorted(cid for cid in ids if not any(
        all(truth[other].objectives[key] <= truth[cid].objectives[key] for key in objective_keys)
        and any(truth[other].objectives[key] < truth[cid].objectives[key] for key in objective_keys)
        for other in ids if other != cid)))


def _evaluate_pareto(problem, truth, selection):
    checks, feasible, objectives_complete = {}, {}, {}
    for candidate in sorted(problem.candidates, key=lambda row: row.candidate_id):
        cid = candidate.candidate_id
        row = truth.get(cid)
        objectives_complete[cid] = row is not None and all(row.objectives.get(key) is not None for key in problem.objective_keys)
        constraints_complete = not problem.constraint_keys or (row is not None and
            all(row.constraints.get(key) is not None for key in problem.constraint_keys))
        violation = row is not None and any(val is not None and val > 0 for val in row.constraints.values())
        feasible[cid] = False if violation else True if constraints_complete else None
        checks[cid] = {
            "objective_coverage": {key: None if row is None or row.objectives.get(key) is None else
                                   bound.contains(row.objectives[key]) for key, bound in sorted(candidate.objectives.items())},
            "constraint_coverage": {key: None if row is None or row.constraints.get(key) is None else
                                    bound.contains(row.constraints[key]) for key, bound in sorted(candidate.constraints.items())},
            "truth_complete": bool(objectives_complete[cid] and constraints_complete),
            "true_feasible": feasible[cid],
        }
    complete = all(row["truth_complete"] for row in checks.values())
    observed = tuple(cid for cid in sorted(checks) if feasible[cid] is True and objectives_complete[cid])
    observed_front = _truth_front(observed, truth, problem.objective_keys)
    true_front = observed_front if complete else None
    objective_checks = {key: [row["objective_coverage"][key] for row in checks.values()
                             if row["objective_coverage"][key] is not None] for key in problem.objective_keys}
    constraint_checks = [val for row in checks.values() for val in row["constraint_coverage"].values() if val is not None]
    covered = [val for values in objective_checks.values() for val in values] + constraint_checks
    soundness = "not_evaluated_empty_universe" if not checks else "refuted_on_observed_outcomes" if False in covered else (
        "supported_on_complete_finite_archive" if complete else "unresolved_missing_outcomes")
    witness_checks = {}
    for excluded, witness in selection["dominance_witnesses"].items():
        if feasible[witness] is False:
            correct = False
        elif feasible[witness] is None or not objectives_complete[witness] or not objectives_complete[excluded]:
            correct = None
        else:
            correct = (all(truth[witness].objectives[key] <= truth[excluded].objectives[key] for key in problem.objective_keys)
                       and any(truth[witness].objectives[key] < truth[excluded].objectives[key] for key in problem.objective_keys))
        witness_checks[excluded] = correct
    def rate(values):
        return Fraction(sum(values), len(values)) if values else None
    return {
        "selection": selection, "certification_state": "conditional_on_sound_interval_premises",
        "empirical_soundness": soundness, "outcome_completeness": "complete" if complete else "partial",
        "missing_truth_ids": tuple(cid for cid, row in checks.items() if not row["truth_complete"]),
        "per_candidate": checks,
        "objective_coverage": {key: rate(values) for key, values in objective_checks.items()},
        "objective_coverage_count": {key: len(values) for key, values in objective_checks.items()},
        "constraint_coverage": rate(constraint_checks), "constraint_coverage_count": len(constraint_checks),
        "observed_pareto_front": observed_front,
        "observed_front_scope": "complete_objective_vectors_among_known_feasible_observed_candidates_only",
        "true_pareto_front": true_front,
        "all_true_pareto_candidates_retained": all(cid in selection["retained"] for cid in true_front) if true_front else None,
        "pool_fraction": Fraction(len(selection["retained"]), len(problem.candidates)) if problem.candidates else None,
        "certified_rejection_correctness": {cid: None if feasible[cid] is None else not feasible[cid]
                                            for cid in selection["certified_infeasible"]},
        "dominance_witness_correctness": witness_checks,
        "excluded_pareto_correctness": {cid: cid not in true_front for cid in sorted(set(checks) - set(selection["retained"]))}
                                       if complete and true_front else None,
    }


def pareto_replay_report(value, outcome_value):
    # Fix the actual candidate pool before parsing the separately sealed truth.
    receipt = pareto_certificate(value)
    problem = parse_pareto_problem(value)
    truth = parse_pareto_outcomes(outcome_value, problem, receipt["problem_digest"])
    return {"schema": "lupine.discovery.pareto_replay.v1", "problem_digest": receipt["problem_digest"],
            "outcomes_digest": digest(outcome_value),
            "evaluation": encode(_evaluate_pareto(problem, truth, receipt["selection"]))}
