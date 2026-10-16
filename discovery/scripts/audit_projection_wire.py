#!/usr/bin/env python3
"""Seal independent synthetic projection-wire and real-worker regression results.

No scientific labels, archives, fitting, or network acquisition are involved.
This is finite engineering evidence, not physical validity or formal refinement.
"""
import argparse
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
TEST = ROOT / "tests/test_projection_wire_review.py"
MODULES = ("projection_io", "projection", "coupled_io", "coupled", "coupled_worker",
           "cli", "core", "evidence", "serialization")
SOURCES = tuple(ROOT / "src/lupine_discovery" / (name+".py") for name in MODULES) + (TEST, Path(__file__).resolve())


def fingerprints():
    return {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest() for path in SOURCES}


def run():
    before = fingerprints()
    sys.path.insert(0, str(ROOT / "src"))
    spec = importlib.util.spec_from_file_location("projection_wire_independent_review", TEST)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    suite = unittest.defaultTestLoader.loadTestsFromModule(module)
    log = io.StringIO()
    result = unittest.TextTestRunner(stream=log, verbosity=2).run(suite)
    after = fingerprints()
    if before != after:
        raise ValueError("reviewed source changed during the independent audit")
    if not result.wasSuccessful() or result.skipped or result.testsRun != 19:
        sys.stderr.write(log.getvalue())
        raise ValueError("the complete independent wire/worker test set did not pass")
    for name in MODULES:
        origin = Path(sys.modules["lupine_discovery."+name].__file__).resolve()
        if origin != ROOT / "src/lupine_discovery" / (name+".py"):
            raise ValueError("a reviewed runtime module loaded outside this checkout")
    return {
        "schema": "lupine.discovery.projection_wire.independent-audit.v1", "status": "PASS",
        "tests_run": result.testsRun, "skipped_tests": 0,
        "source_sha256_before": before, "source_sha256_after": after,
        "synthetic_partial_truth_patterns": 144,
        "checks": [
            "Original wire, adapter relation, prepared model and nested receipt identities remain distinct and linked.",
            "Outer outcome seals reject before internal rebinding; both finite and unsupported receipts are sealed before the loader.",
            "Unsupported inputs produce no finite stand-in or coverage audit and retain the original universe.",
            "Complete ties, partial truth, empty/no-feasible universes and false-common-world optimum loss remain visible.",
            "Expanded dimensions, exact lexical limits and forbidden proofs reject before Fraction/build; oversized derived arithmetic rejects.",
            "The shared worker slot, real guarded select/replay/verify and malformed response failures preserve the original wrapper.",
            "A large valid CLI receipt remains inside the verification byte cap and is successfully reverified after export.",
        ],
        "scope": "Synthetic wrapper and transport checks, including real Linux worker subprocesses and CLI file round trips. Separate HTTP/browser suites are not represented by this receipt.",
        "limitations": ["Finite tests do not prove formal runtime refinement or exhaustive input correctness.",
                        "No scientific accuracy, field validity, coverage guarantee, or new model improvement is established."],
        "scientific_data_read": False, "model_fits": 0,
        "reproduce": ["python", "scripts/audit_projection_wire.py", "--output", "reports/projection-wire-independent-audit.json"],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "reports/projection-wire-independent-audit.json")
    args = parser.parse_args()
    if args.output.resolve() in {path.resolve() for path in SOURCES}:
        raise ValueError("audit output cannot replace reviewed source")
    receipt = run()
    raw = (json.dumps(receipt, indent=2, sort_keys=True)+"\n").encode()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.output.exists():
        if args.output.read_bytes() != raw:
            raise ValueError("existing audit receipt differs; choose a fresh output path")
    else:
        with args.output.open("xb") as stream:
            stream.write(raw)
    print(json.dumps({key: receipt[key] for key in ("status", "tests_run", "synthetic_partial_truth_patterns")}))


if __name__ == "__main__":
    main()
