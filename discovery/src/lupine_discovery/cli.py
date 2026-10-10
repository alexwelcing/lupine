"""Deterministic local CLI; no model, network, or outcome access during selection."""
import argparse
import json
from pathlib import Path
import sys

from . import __version__
from .core import select
from .evidence import digest
from .replay import evaluate
from .serialization import encode, loads, parse_outcomes, parse_problem


def certificate(value):
    problem = parse_problem(value)
    decision = select(problem.candidates)
    indexed = {c.candidate_id: c for c in problem.candidates}
    reasons = {}
    for cid, candidate in sorted(indexed.items()):
        if cid in decision.certified_infeasible:
            reasons[cid] = {"reason": "constraint_lower_bound_positive", "constraints":
                            sorted(k for k, v in candidate.constraints.items() if v.lower > 0)}
        elif cid in decision.dominated:
            reasons[cid] = {"reason": "incumbent_upper_strictly_below_candidate_lower",
                            "witness": decision.incumbent}
        else:
            reasons[cid] = {"reason": "retained_not_proven_worse_or_infeasible"}
    # This is an explicitly heuristic measurement queue, never a top-k pool cut.
    queue = sorted(decision.retained, key=lambda cid: (
        -sum(v.lower <= 0 < v.upper for v in indexed[cid].constraints.values()),
        -(indexed[cid].score.upper - indexed[cid].score.lower), cid))
    payload = encode({"schema": "lupine.discovery.certificate.v1", "engine_version": __version__,
                      "problem_digest": digest(value), "scenario_id": problem.scenario_id,
                      "claim": "conditional_finite_universe_minimizer_retention",
                      "physical_attestation": "not_established_by_this_program",
                      "selection": decision, "reasons": reasons,
                      "evidence_assessment": problem.evidence_assessment,
                      "measurement_queue": {"kind": "heuristic_not_a_guarantee",
                                            "candidate_ids": queue},
                      "assumptions": ["All score and constraint intervals contain their stated true values.",
                                      "All candidates use the declared scenario, units, reference and objective.",
                                      "The candidate universe is the finite input; no completeness of matter is claimed."]})
    return {**payload, "certificate_digest": digest(payload)}


def verify_certificate(problem_value, supplied):
    if supplied != certificate(problem_value):
        raise ValueError("certificate differs from exact deterministic recomputation")
    return {"schema": "lupine.discovery.verification.v1", "verified": True,
            "scope": "identity_and_exact_runtime_recomputation_only",
            "physical_attestation": "not_established_by_this_program",
            "certificate_digest": supplied["certificate_digest"]}


def replay_report(value, outcome_value):
    problem = parse_problem(value)
    outcomes = parse_outcomes(outcome_value, problem.scenario_id, digest(value))
    return {"schema": "lupine.discovery.replay.v1", "problem_digest": digest(value),
            "outcomes_digest": digest(outcome_value),
            "evaluation": encode(evaluate(problem.candidates, outcomes))}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    workbench = sub.add_parser("serve", help="Run the local research workbench")
    workbench.add_argument("--port", type=int, default=8765)
    for name in ("select", "verify", "replay"):
        command = sub.add_parser(name)
        command.add_argument("problem", type=Path)
        if name == "verify":
            command.add_argument("certificate", type=Path)
        if name == "replay":
            command.add_argument("outcomes", type=Path)
        command.add_argument("--output", type=Path)
    args = parser.parse_args(argv)
    try:
        if args.command == "serve":
            from .server import serve
            return serve(args.port)
        value = loads(args.problem.read_text())
        if args.command == "select":
            result = certificate(value)
        elif args.command == "verify":
            result = verify_certificate(value, loads(args.certificate.read_text()))
        else:
            outcome_value = loads(args.outcomes.read_text())
            result = replay_report(value, outcome_value)
        output = json.dumps(result, indent=2, sort_keys=True, allow_nan=False) + "\n"
        if args.output:
            args.output.write_text(output)
        else:
            sys.stdout.write(output)
        return 0
    except (OSError, ValueError, TypeError, KeyError, ZeroDivisionError) as exc:
        sys.stderr.write(f"lupine-discovery: {exc}\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
