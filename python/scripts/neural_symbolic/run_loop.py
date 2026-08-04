"""Continuous Neural-Symbolic Execution Loop — single-command orchestrator.

Runs the three nodes in sequence, fusing GPU empirical physics into the Lean 4
formal engine:

    Node 1  GPU curvature thrust (MACE-MP-0 vs CHGNet shear C44)
      |     emits CurvatureBoundaryPayload (tmp/neural_symbolic/node1_*.json)
      v
    Node 2  Worker -> Phoenix OpenInference relay
      |     streams T3-REJECT breaches (live OTLP if PHOENIX_OTLP_RELAY_URL set,
      |     else durable local artifact)
      v
    Node 3  Lean 4 theorem synthesis
            authors machine-checked negative constraints (0 sorry) +
            atlas_theorems seed rows

Run with the GPU venv interpreter (it has torch/mace/chgnet/pydantic; `lean` must
be on PATH for Node 3 verification):

    C:/Users/alexw/mlip-gpu/Scripts/python.exe \
      python/scripts/neural_symbolic/run_loop.py
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_NODES = ("node1_curvature.py", "node2_relay.py", "node3_lean_synth.py")


def main() -> int:
    for node in _NODES:
        print(f"\n{'#' * 30} {node} {'#' * 30}", flush=True)
        rc = subprocess.run([sys.executable, str(_HERE / node)]).returncode
        if rc != 0:
            print(f"\n[loop] {node} exited rc={rc} — halting.", file=sys.stderr)
            return rc
    print("\n[loop] COMPLETE: GPU empirical physics -> relay -> machine-checked Lean (0 sorry).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
