#!/usr/bin/env python3
"""Run bundled exact known-answer cases with no network or third-party dependencies."""
import argparse
import json
from pathlib import Path

from lupine_discovery.benchmarks import run_known_answers


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="Save the complete deterministic JSON report.")
    args = parser.parse_args()
    report = run_known_answers()
    text = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding="utf-8")
        print(json.dumps(report["summary"], sort_keys=True))
    else:
        print(text, end="")
    return 1 if report["summary"]["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
