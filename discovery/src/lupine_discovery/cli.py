"""Deterministic local CLI; selection reads no outcomes or network data."""
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
    if isinstance(value, dict) and value.get("schema") == "lupine.discovery.projection_problem.v1":
        from .projection_io import projection_certificate
        return projection_certificate(value)
    if isinstance(value, dict) and value.get("schema") == "lupine.discovery.coupled_problem.v1":
        from .coupled_io import coupled_certificate
        return coupled_certificate(value)
    if isinstance(value, dict) and value.get("schema") == "lupine.discovery.pareto_problem.v1":
        from .pareto_io import pareto_certificate
        return pareto_certificate(value)
    if isinstance(value, dict) and value.get("schema") == "lupine.discovery.calibrated_problem.v1":
        from .calibrated import calibrated_certificate
        return calibrated_certificate(value)
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
    recomputed = certificate(problem_value)
    # JSON booleans compare equal to Python integers; count-bearing receipts
    # require a type-sensitive identity check as well as ordinary equality.
    exact_json = isinstance(problem_value, dict) and problem_value.get("schema") in {
        "lupine.discovery.calibrated_problem.v1", "lupine.discovery.pareto_problem.v1",
        "lupine.discovery.coupled_problem.v1", "lupine.discovery.projection_problem.v1"}
    if supplied != recomputed or (exact_json and digest(supplied) != digest(recomputed)):
        raise ValueError("certificate differs from exact deterministic recomputation")
    return {"schema": "lupine.discovery.verification.v1", "verified": True,
            "scope": "identity_and_exact_runtime_recomputation_only",
            "physical_attestation": "not_established_by_this_program",
            "certificate_digest": supplied["certificate_digest"]}


def replay_report(value, outcome_value):
    if isinstance(value, dict) and value.get("schema") == "lupine.discovery.projection_problem.v1":
        from .projection_io import projection_replay_report
        return projection_replay_report(value, outcome_value)
    if isinstance(value, dict) and value.get("schema") == "lupine.discovery.coupled_problem.v1":
        from .coupled_io import coupled_replay_report
        return coupled_replay_report(value, outcome_value)
    if isinstance(value, dict) and value.get("schema") == "lupine.discovery.pareto_problem.v1":
        from .pareto_io import pareto_replay_report
        return pareto_replay_report(value, outcome_value)
    if isinstance(value, dict) and value.get("schema") == "lupine.discovery.calibrated_problem.v1":
        from .calibrated import calibrated_replay_report
        return calibrated_replay_report(value, outcome_value)
    problem = parse_problem(value)
    outcomes = parse_outcomes(outcome_value, problem.scenario_id, digest(value))
    return {"schema": "lupine.discovery.replay.v1", "problem_digest": digest(value),
            "outcomes_digest": digest(outcome_value),
            "evaluation": encode(evaluate(problem.candidates, outcomes))}


def _read_document(path, coupled=False):
    """All CLI documents: 2 MiB/depth32; coupled/projection: 256 KiB/depth24."""
    from .coupled_io import MAX_DOCUMENT_BYTES, loads_coupled, preflight_json_text
    maximum = MAX_DOCUMENT_BYTES if coupled else 2 * 1024 * 1024
    with path.open('rb') as handle:
        raw = handle.read(maximum + 1)
    if coupled:
        return loads_coupled(raw)
    value = loads(preflight_json_text(raw, max_bytes=maximum, max_depth=32))
    if isinstance(value, dict) and value.get('schema') == 'lupine.discovery.coupled_problem.v1':
        return loads_coupled(raw)
    if isinstance(value, dict) and value.get('schema') == 'lupine.discovery.projection_problem.v1':
        from .projection_io import loads_projection
        return loads_projection(raw)
    return value


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__,
        epilog="CLI JSON documents are limited to 2 MiB and nesting depth 32; coupled and projection use stricter input profiles and compact output capped at 2 MiB.")
    sub = parser.add_subparsers(dest="command", required=True)
    workbench = sub.add_parser("serve", help="Run the local research workbench",
        description="Open the local workbench at http://127.0.0.1:8765. Coupled and projection HTTP modes require Linux process guards.")
    workbench.add_argument("--port", type=int, default=8765, help="Loopback port (default: 8765)")
    descriptions = {
        "select": "Create an exact conditional candidate-pool certificate from a problem; no outcomes are read.",
        "verify": "Recompute a certificate from its original problem and check exact identity; this does not verify physical truth.",
        "replay": "Audit a fixed candidate pool against separately bound known outcomes, preserving failures and unknown values.",
        "coupled-domains": "Export exact common and candidate-feasible domains for a coupled problem, without screening or reading outcomes.",
    }
    for name in ("select", "verify", "replay", "coupled-domains"):
        command = sub.add_parser(name, help=descriptions[name], description=descriptions[name],
            epilog="Successful commands return JSON and exit 0; invalid input or a mismatched certificate exits 2. Scientific replay failures remain in the JSON result.")
        command.add_argument("problem", type=Path, help="Original versioned problem JSON; use integers or quoted exact decimal/rational values")
        if name == "verify":
            command.add_argument("certificate", type=Path, help="Certificate JSON to compare with exact deterministic recomputation")
        if name == "replay":
            command.add_argument("outcomes", type=Path, help="Separate outcomes JSON bound to this problem (and its certificate for coupled mode)")
        command.add_argument("--output", type=Path, help="Write result JSON to this file (default: standard output)")
    args = parser.parse_args(argv)
    try:
        if args.command == "serve":
            from .server import serve
            return serve(args.port)
        value = _read_document(args.problem, coupled=args.command == "coupled-domains")
        if args.command == "select":
            result = certificate(value)
        elif args.command == "coupled-domains":
            from .coupled_io import coupled_domains
            result = coupled_domains(value)
        elif args.command == "verify":
            result = verify_certificate(value, _read_document(args.certificate))
        elif isinstance(value, dict) and value.get("schema") in {
                "lupine.discovery.coupled_problem.v1", "lupine.discovery.projection_problem.v1"}:
            # The loader opens truth only after the complete original receipt is sealed.
            result = replay_report(value, lambda: _read_document(args.outcomes, coupled=True))
        else:
            outcome_value = _read_document(args.outcomes)
            result = replay_report(value, outcome_value)
        bounded_output = isinstance(value, dict) and value.get("schema") in {
            "lupine.discovery.coupled_problem.v1", "lupine.discovery.projection_problem.v1"}
        formatting = {"separators": (",", ":")} if bounded_output else {"indent": 2}
        output = json.dumps(result, sort_keys=True, allow_nan=False, **formatting) + "\n"
        if bounded_output and len(output.encode('utf-8')) > 2 * 1024 * 1024:
            raise ValueError("coupled/projection output exceeds 2 MiB; reduce input size or proof-work limits")
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
