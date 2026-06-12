#!/usr/bin/env python3
"""Small top-level entry point for the mlip_immi/ analysis lane.

Lists the common workflows and can dispatch to the underlying scripts.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

WORKFLOWS: dict[str, dict[str, str]] = {
    "elastic": {
        "script": "elastic_constants.py",
        "help": "Compute C11/C12/C44 for a cubic metal with MACE-MP-0.",
        "example": "python run.py elastic -- --element Cu --validate",
    },
    "audit": {
        "script": "audit_immi_elastics.py",
        "help": "Self-test the strain convention and audit real MLIP outputs.",
        "example": "python run.py audit -- --results mace_immi_results.json",
    },
    "phonon": {
        "script": "phonon_sentinel.py",
        "help": "Finite-displacement phonon stability check.",
        "example": "python run.py phonon -- --element Cu",
    },
    "universality": {
        "script": "run_universality_real_mlip.py",
        "help": "End-to-end Universality Theorem real-data sweep.",
        "example": "python run.py universality -- --models mace-mp-0,chgnet",
    },
    "cross-align": {
        "script": "cross_mlip_alignment.py",
        "help": "Cross-MLIP cosine alignment analysis.",
        "example": "python run.py cross-align",
    },
    "cross-align-ingest": {
        "script": "build_ingest_payload.py",
        "help": "Build the /claims/ingest payload from cross-align results.",
        "example": "python run.py cross-align-ingest",
    },
    "p2-generational": {
        "script": "run_p2_generational_stability.py",
        "help": "P2 generational-stability test on fitted elastic constants.",
        "example": "python run.py p2-generational",
    },
    "p2-strain": {
        "script": "run_p2_strain_energy_stability.py",
        "help": "P2 test from strain-energy residual curves.",
        "example": "python run.py p2-strain",
    },
    "meam": {
        "script": "meam_bootstrap.py",
        "help": "Bootstrap MEAM participation-ratio sample-size controls.",
        "example": "python run.py meam",
    },
    "meam-ingest": {
        "script": "build_meam_ingest.py",
        "help": "Build the /claims/ingest payload for the MEAM bootstrap closure.",
        "example": "python run.py meam-ingest",
    },
    "ingest": {
        "script": "ingest_to_worker.py",
        "help": "POST MACE-MP-0 predictions to the glim-think worker.",
        "example": "python run.py ingest",
    },
}


def list_workflows() -> None:
    print("mlip_immi/ workflows:")
    print()
    for name, info in WORKFLOWS.items():
        print(f"  {name:20s} {info['help']}")
        print(f"                       {info['example']}")
        print()
    print("Pass '--help' after a workflow name for script-specific options.")


def dispatch(name: str, args: list[str]) -> int:
    if name not in WORKFLOWS:
        print(f"Unknown workflow: {name}", file=sys.stderr)
        list_workflows()
        return 1
    script = HERE / WORKFLOWS[name]["script"]
    if not script.is_file():
        print(f"Script not found: {script}", file=sys.stderr)
        return 1
    return subprocess.call([sys.executable, str(script), *args])


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Entry point for the mlip_immi/ local real-data MLIP lane."
    )
    parser.add_argument(
        "workflow",
        nargs="?",
        help="Workflow name; use --list to see options.",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available workflows and exit.",
    )
    parser.add_argument(
        "workflow_args",
        nargs=argparse.REMAINDER,
        help="Arguments forwarded to the underlying script.",
    )
    args = parser.parse_args()

    if args.list or args.workflow is None:
        list_workflows()
        return 0

    return dispatch(args.workflow, args.workflow_args)


if __name__ == "__main__":
    sys.exit(main())
