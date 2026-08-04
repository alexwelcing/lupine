"""Tier 2: recompute raw elastic constants from public checkpoints.

Downloads the MatPES 2025.2 checkpoints via matgl and runs them through the
frozen harness, then diffs against the committed cell JSONs (tolerance 1 GPa).

  python tier2_recompute.py --cell tensornet_pbe
  python tier2_recompute.py --all
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from harness import compute_elastic_constants  # noqa: E402
from references import REFERENCE_C_GPA  # noqa: E402

HERE = Path(__file__).parent
DATA = HERE / "data"
TOL_GPA = 1.0

MODELS = {
    "m3gnet_pbe": "M3GNet-PES-MatPES-PBE-2025.2",
    "m3gnet_r2scan": "M3GNet-PES-MatPES-r2SCAN-2025.2",
    "tensornet_pbe": "TensorNet-PES-MatPES-PBE-2025.2",
    "tensornet_r2scan": "TensorNet-PES-MatPES-r2SCAN-2025.2",
    "chgnet_matpes_pbe": "CHGNet-PES-MatPES-PBE-2025.2.10",
    "chgnet_matpes_r2scan": "CHGNet-PES-MatPES-r2SCAN-2025.2.10",
    "qet_pbe": "QET-PES-MatPES-PBE-2025.2",
    "qet_r2scan": "QET-PES-MatPES-r2SCAN-2025.2",
}


def run_cell(cell: str) -> int:
    import matgl
    from matgl.ext.ase import PESCalculator

    committed = {r["element"]: r
                 for r in json.loads((DATA / f"cell_{cell}.json").read_text())["results"]
                 if "error" not in r}
    calc = PESCalculator(matgl.load_model(MODELS[cell]))
    bad = 0
    for el in REFERENCE_C_GPA:
        r = compute_elastic_constants(el, calc)
        c = committed[el]
        dmax = max(abs(r.C11 - c["C11"]), abs(r.C12 - c["C12"]), abs(r.C44 - c["C44"]))
        status = "OK " if dmax <= TOL_GPA else "DIFF"
        if dmax > TOL_GPA:
            bad += 1
        print(f"  {el:3s} {status} recomputed=({r.C11:7.1f},{r.C12:7.1f},{r.C44:7.1f}) "
              f"committed=({c['C11']:7.1f},{c['C12']:7.1f},{c['C44']:7.1f}) max|d|={dmax:.3f} GPa")
    return bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cell", choices=sorted(MODELS))
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()
    cells = sorted(MODELS) if args.all else [args.cell or "tensornet_pbe"]
    total_bad = 0
    for cell in cells:
        print(f"== {cell} ({MODELS[cell]}) ==")
        total_bad += run_cell(cell)
    if total_bad:
        print(f"\nTIER 2 FAILED: {total_bad} element-model mismatches > {TOL_GPA} GPa")
        return 1
    print("\nTIER 2 PASS — recomputed elastic constants match committed cells.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
