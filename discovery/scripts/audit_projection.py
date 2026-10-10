#!/usr/bin/env python3
"""Run the independent synthetic projection tests and seal their exact sources.

This imports only the adapter/kernel and the independent synthetic test module.
It does not read scientific target tables, fit a model, or invoke the adapter's
own test/metric helpers. Finite test evidence is not formal refinement or
physical validation of any correction-field premise.
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
MODULE_NAMES = ("projection", "coupled", "core", "evidence", "serialization")
TEST_PATH = ROOT / "tests/test_projection_review.py"
SOURCE_PATHS = tuple(ROOT / "src/lupine_discovery" / (name+".py") for name in MODULE_NAMES) + (TEST_PATH, Path(__file__).resolve())
EXPECTED_COUNTS = {"source_equation_worlds": 5949, "anchor_worlds": 81,
                   "admitted_retention_worlds": 5913, "reversal_worlds": 4,
                   "varied_problem_count": 8}


def fingerprints():
    return {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest() for path in SOURCE_PATHS}


def run_audit():
    before = fingerprints()
    sys.path.insert(0, str(ROOT / "src"))
    spec = importlib.util.spec_from_file_location("projection_independent_review", TEST_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    for name in MODULE_NAMES:
        loaded = sys.modules["lupine_discovery."+name]
        if Path(loaded.__file__).resolve() != ROOT / "src/lupine_discovery" / (name+".py"):
            raise ValueError("review imported a module outside this checkout")
    suite = unittest.defaultTestLoader.loadTestsFromModule(module)
    log = io.StringIO()
    result = unittest.TextTestRunner(stream=log, verbosity=2).run(suite)
    after = fingerprints()
    if before != after:
        raise ValueError("source changed during the independent projection audit")
    if not result.wasSuccessful() or result.skipped or result.testsRun != 15:
        sys.stderr.write(log.getvalue())
        raise ValueError("the complete independent projection test set did not pass")
    if module.AUDIT_COUNTS != EXPECTED_COUNTS:
        raise ValueError("executed world counts differ from the sealed review plan")
    return {
        "schema": "lupine.discovery.projection.independent-audit.v1",
        "status": "PASS", "tests_run": result.testsRun, "skipped_tests": 0,
        "source_sha256_before": before, "source_sha256_after": after,
        "executed_counts": dict(module.AUDIT_COUNTS), "varied_problem_seed": 11931,
        "count_scope": "Counts are executed synthetic world cases; categories overlap and must not be summed as distinct worlds.",
        "oracle": "Direct Fraction evaluation of theta=b+Sz, q=nominal-weights·theta+radius·error, and whole-expression target maps; no production translation helper supplies expected values.",
        "checks": [
            "Signed normalization and target conversion, including rectangular and empty parameter spaces.",
            "Source anchor lower/upper inequalities match generated rows pointwise.",
            "Separate field blocks and distinct discrepancies cannot merge through equal names or separator characters.",
            "Gain, exact ties and reversal worlds preserve every feasible minimizer under admitted premises.",
            "Full physical-context and field/source quantity scopes reject implicit transfer.",
            "Missing and empirical-only field/discrepancy bounds produce no kernel model and retain the complete universe.",
            "Contradictory anchors report model inconsistency and retain every candidate.",
            "Source and premise metadata bind adapter identity; generated relation records remain immutable.",
        ],
        "limitations": [
            "Finite executable evidence, not a formal refinement proof of Python from Lean.",
            "No physical validation, learned predictor, empirical coverage guarantee, or scientific replication.",
            "No proof of complete optimization/search or an end-to-end resource bound.",
        ],
        "scientific_data_read": False, "new_model_fit": False,
        "reproduce": ["python", "scripts/audit_projection.py", "--output", "reports/projection-independent-audit.json"],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "reports/projection-independent-audit.json")
    args = parser.parse_args()
    if args.output.resolve() in {path.resolve() for path in SOURCE_PATHS}:
        raise ValueError("audit output must not replace reviewed source")
    receipt = run_audit()
    raw = (json.dumps(receipt, indent=2, sort_keys=True)+"\n").encode()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.output.exists():
        if args.output.read_bytes() != raw:
            raise ValueError("existing audit receipt differs; choose a fresh output path")
    else:
        with args.output.open("xb") as stream:
            stream.write(raw)
    print(json.dumps({key: receipt[key] for key in ("status", "tests_run", "executed_counts")}))


if __name__ == "__main__":
    main()
