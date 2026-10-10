"""Strict calibrated problems: finite conditional bounds or honest abstention.

Calibration arithmetic does not establish its sampling premises. Unsupported or
unbounded calibration retains the entire input universe without fake intervals.
"""
from dataclasses import dataclass
from fractions import Fraction

from . import __version__
from .calibration import PREMISES, calibrate, plan_calibration
from .core import Selection, exact
from .evidence import Scope, assess_links, digest, fields, nonempty
from .replay import evaluate
from .serialization import encode, parse_outcomes, parse_problem


PROBLEM_SCHEMA = "lupine.discovery.calibrated_problem.v1"
CERTIFICATE_SCHEMA = "lupine.discovery.calibrated_certificate.v1"


@dataclass(frozen=True)
class CalibratedProblem:
    scenario_id: str
    candidate_ids: tuple[str, ...]
    constraint_keys: tuple[str, ...]
    calibration: dict
    prepared_problem: dict | None
    evidence_assessment: dict


def parse_calibrated_problem(value) -> CalibratedProblem:
    fields(value, ("schema", "scenario", "candidates", "calibration"), ("description",))
    if value["schema"] != PROBLEM_SCHEMA:
        raise ValueError("unsupported calibrated problem schema")
    if "description" in value and not isinstance(value["description"], str):
        raise ValueError("description must be a string")
    scenario = value["scenario"]
    fields(scenario, ("id", "objective", "constraints"))
    sid = nonempty(scenario["id"], "scenario ID")
    fields(scenario["objective"], ("unit", "reference", "direction"))
    if scenario["objective"]["direction"] != "minimize":
        raise ValueError("normalize the objective to minimization explicitly")
    if not isinstance(scenario["constraints"], dict):
        raise ValueError("scenario constraints must be an object")
    specs = {"score": scenario["objective"]}
    for key, spec in scenario["constraints"].items():
        nonempty(key, "constraint key")
        if key == "score":
            raise ValueError("score is reserved for the objective")
        fields(spec, ("unit", "reference"))
        specs[key] = spec
    expected = {key: Scope(sid, key, nonempty(spec["unit"], "unit"),
                           nonempty(spec["reference"], "reference"))
                for key, spec in specs.items()}
    rows = value["candidates"]
    if not isinstance(rows, list) or not rows:
        raise ValueError("calibrated candidates must be a nonempty array")
    nominal = {}
    for row in rows:
        fields(row, ("id", "score", "constraints"))
        cid = nonempty(row["id"], "candidate ID")
        if cid in nominal:
            raise ValueError("duplicate candidate ID")
        if not isinstance(row["constraints"], dict) or set(row["constraints"]) != set(scenario["constraints"]):
            raise ValueError("candidate constraints do not match scenario")
        nominal[cid] = {"score": exact(row["score"]),
                        **{key: exact(val) for key, val in row["constraints"].items()}}
    calibration = value["calibration"]
    fields(calibration, ("delta", "predictor_id", "calibration_id", "sampling_scope",
                         "premise_status", "residuals"))
    identifiers = {key: nonempty(calibration[key], key)
                   for key in ("predictor_id", "calibration_id", "sampling_scope")}
    premise_status = calibration["premise_status"]
    if premise_status not in ("assumed_unverified", "unsupported"):
        raise ValueError("premise_status must be assumed_unverified or unsupported")
    residuals = calibration["residuals"]
    if not isinstance(residuals, dict) or set(residuals) != set(specs):
        raise ValueError("calibration residual targets must match score and scenario constraints")
    if any(not isinstance(values, list) for values in residuals.values()):
        raise ValueError("calibration residuals must be arrays")
    lengths = {len(values) for values in residuals.values()}
    if len(lengths) != 1:
        raise ValueError("all calibration targets must use the same sample count")
    plan = plan_calibration(lengths.pop(), len(nominal), calibration["delta"], len(specs))
    outcomes = {key: calibrate(residuals[key], plan) for key in sorted(specs)}
    reasons = []
    if premise_status == "unsupported":
        reasons.append("sampling_scope_unsupported")
    if any(outcome.outcome_kind == "unbounded" for outcome in outcomes.values()):
        reasons.append("required_rank_exceeds_calibration_count")
    status = "abstained" if reasons else "finite_conditional"
    encoded_plan = encode(plan)
    # Unlike input-sized counts, this derived requirement can exceed JavaScript's
    # exact integer range. Keep its wire representation exact in every response.
    encoded_plan["minimum_finite_calibration_count"] = str(plan.minimum_finite_calibration_count)
    # The planner's default is an assumption, never an upgrade of input scope.
    encoded_plan["premise_status"] = premise_status
    if premise_status == "unsupported":
        encoded_plan["guarantee_status"] = "not_applicable_unsupported_sampling"
    assessment = encode({
        "status": status, "premise_status": premise_status, "reasons": reasons,
        "plan": encoded_plan,
        "targets": {key: {"radius": outcome.radius, "outcome_kind": outcome.outcome_kind,
                           "reason": outcome.reason} for key, outcome in outcomes.items()},
        **identifiers,
    })
    prepared = None
    if status == "finite_conditional":
        def bounds(cid, target):
            radius = outcomes[target].radius
            return encode([nominal[cid][target] - radius, nominal[cid][target] + radius])
        prepared = {
            "schema": "lupine.discovery.problem.v1", "scenario": scenario,
            "candidates": [{"id": cid, "score": bounds(cid, "score"),
                            "constraints": {key: bounds(cid, key) for key in sorted(scenario["constraints"])}}
                           for cid in sorted(nominal)],
        }
    evidence = {cid: {**assess_links({}, expected, {}),
                      "calibration_premise_status": premise_status}
                for cid in sorted(nominal)}
    return CalibratedProblem(sid, tuple(sorted(nominal)), tuple(sorted(scenario["constraints"])),
                             assessment, prepared, evidence)


def _abstained_selection(problem):
    return Selection((), problem.candidate_ids, problem.candidate_ids, (), (), None, None, None)


def calibrated_certificate(value):
    problem = parse_calibrated_problem(value)
    if problem.prepared_problem is not None:
        # The existing finite core remains the sole pruning implementation.
        from .cli import certificate
        payload = certificate(problem.prepared_problem)
        del payload["certificate_digest"]
        payload["assumptions"] += list(PREMISES)
    else:
        payload = {
            "engine_version": __version__, "scenario_id": problem.scenario_id,
            "claim": "whole_universe_retention_by_abstention",
            "physical_attestation": "not_established_by_this_program",
            "selection": _abstained_selection(problem),
            "reasons": {cid: {"reason": "retained_due_to_calibration_abstention",
                               "calibration_reasons": problem.calibration["reasons"]}
                        for cid in problem.candidate_ids},
            "measurement_queue": {"kind": "deterministic_id_order_no_ranking_guarantee",
                                  "candidate_ids": problem.candidate_ids},
            "assumptions": [
                "No calibrated interval guarantee is available; every input candidate is retained.",
                "The candidate universe is the finite input; no completeness of matter is claimed.",
                *PREMISES,
            ],
        }
    payload.update({"schema": CERTIFICATE_SCHEMA, "problem_digest": digest(value),
                    "calibration": problem.calibration, "prepared_problem": problem.prepared_problem,
                    "evidence_assessment": problem.evidence_assessment})
    payload = encode(payload)
    return {**payload, "certificate_digest": digest(payload)}


def _audit_abstention(problem, outcomes, selection):
    """Audit the actual all-retained decision; no selector or interval exists here."""
    universe = set(problem.candidate_ids)
    keys = set(problem.constraint_keys)
    truth = {}
    for row in outcomes:
        if row.candidate_id in truth:
            raise ValueError("duplicate truth candidate ID")
        if row.candidate_id not in universe:
            raise ValueError("truth candidate ID outside prediction universe")
        if set(row.constraints) - keys:
            raise ValueError("unknown truth constraint")
        truth[row.candidate_id] = row
    checks, feasible = {}, {}
    for cid in problem.candidate_ids:
        row = truth.get(cid)
        constraints_complete = not keys or (row is not None and set(row.constraints) == keys)
        violation = row is not None and any(val > 0 for val in row.constraints.values())
        feasible[cid] = False if violation else True if constraints_complete else None
        checks[cid] = {
            "score_covered": None,
            "constraint_coverage": {key: None for key in problem.constraint_keys},
            "truth_complete": bool(constraints_complete and row is not None and row.score is not None),
            "true_feasible": feasible[cid],
        }
    complete = all(check["truth_complete"] for check in checks.values())
    observed = [cid for cid in problem.candidate_ids if feasible[cid] is True and
                cid in truth and truth[cid].score is not None]
    best = min((truth[cid].score for cid in observed), default=None)
    optimum = best if complete else None
    minimizers = tuple(cid for cid in observed if truth[cid].score == optimum) if complete else None
    return {
        "selection": selection, "certification_state": "abstained_no_interval_certificate",
        "empirical_soundness": "not_evaluated_abstention",
        "outcome_completeness": "complete" if complete else "partial",
        "missing_truth_ids": tuple(cid for cid, check in checks.items() if not check["truth_complete"]),
        "per_candidate": checks,
        "score_coverage": None, "score_coverage_count": 0,
        "constraint_coverage": None, "constraint_coverage_count": 0,
        "observed_best_feasible_score": best, "true_feasible_optimum": optimum,
        "true_minimizers": minimizers,
        "all_true_minimizers_retained": all(cid in selection["retained"] for cid in minimizers) if minimizers else None,
        "incumbent_true_feasible": None, "incumbent_regret": None, "regret_bound_holds": None,
        "pool_fraction": Fraction(len(selection["retained"]), len(problem.candidate_ids)),
        "certified_rejection_correctness": {},
        "excluded_optimum_correctness": {} if complete and minimizers else None,
    }


def calibrated_replay_report(value, outcome_value):
    # Seal the actual decision before even parsing the separately supplied truth.
    receipt = calibrated_certificate(value)
    problem = parse_calibrated_problem(value)
    outcomes = parse_outcomes(outcome_value, problem.scenario_id, receipt["problem_digest"])
    if problem.prepared_problem is None:
        evaluation = _audit_abstention(problem, outcomes, receipt["selection"])
    else:
        prepared = parse_problem(problem.prepared_problem)
        evaluation = evaluate(prepared.candidates, outcomes)
        if encode(evaluation["selection"]) != receipt["selection"]:
            raise ValueError("replay selection differs from the sealed calibrated decision")
    return {"schema": "lupine.discovery.replay.v1", "problem_digest": receipt["problem_digest"],
            "outcomes_digest": digest(outcome_value), "calibration": receipt["calibration"],
            "evaluation": encode(evaluation)}
