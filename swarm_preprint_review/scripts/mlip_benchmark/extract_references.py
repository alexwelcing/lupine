"""Extract per-(element, property) DFT reference values from nist_benchmark.csv.

Output is a JSON dict keyed by element with the reference values for
C11, C12, C44, a0 (lattice constant). These are the targets MLIP predictions
will be compared against. The same DFT references underlie the 559 classical
potentials in the existing D1 ledger, so MLIP records will be directly
comparable in the manifold analysis.

Usage:
    python extract_references.py [--csv path/to/nist_benchmark.csv] [--out references.json]

Searches up from cwd for nist_benchmark.csv if no path is provided.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path
from statistics import mean
from typing import Optional

PROPERTIES = ("C11", "C12", "C44", "a0")
# Matches the 15 elements in the D1 ledger (8 FCC + 7 BCC).
ELEMENTS = ("Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb",
            "Fe", "Cr", "Mo", "W", "V", "Nb", "Ta")


def find_nist_benchmark(start: Optional[Path] = None) -> Optional[Path]:
    """Walk up from start (or cwd) to find nist_benchmark.csv."""
    cur = (start or Path.cwd()).resolve()
    for _ in range(8):
        candidate = cur / "nist_benchmark.csv"
        if candidate.is_file():
            return candidate
        if cur.parent == cur:
            return None
        cur = cur.parent
    return None


def extract(csv_path: Path) -> dict[str, dict[str, float]]:
    """Read the NIST benchmark CSV and return references[element][property]."""
    refs: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    with csv_path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            element = row.get("material", "").strip()
            prop = row.get("property", "").strip()
            ref_str = row.get("reference", "").strip()
            if element not in ELEMENTS or prop not in PROPERTIES or not ref_str:
                continue
            try:
                refs[element][prop].append(float(ref_str))
            except ValueError:
                continue

    out: dict[str, dict[str, float]] = {}
    for element, props in refs.items():
        out[element] = {prop: mean(values) for prop, values in props.items() if values}
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=Path, default=None,
                        help="Path to nist_benchmark.csv (auto-detected if omitted)")
    parser.add_argument("--out", type=Path, default=Path("references.json"))
    args = parser.parse_args()

    csv_path = args.csv or find_nist_benchmark()
    if csv_path is None:
        print("error: nist_benchmark.csv not found by walking up from cwd; "
              "pass --csv explicitly", file=sys.stderr)
        return 1

    refs = extract(csv_path)
    if not refs:
        print(f"error: no usable rows extracted from {csv_path}", file=sys.stderr)
        return 1

    args.out.write_text(json.dumps(refs, indent=2, sort_keys=True), encoding="utf-8")

    n_elem = len(refs)
    n_props = sum(len(v) for v in refs.values())
    coverage_per_element = {el: sorted(refs[el].keys()) for el in sorted(refs)}
    print(f"wrote {args.out} — {n_elem} elements, {n_props} (element, property) pairs")
    for el, props in coverage_per_element.items():
        missing = [p for p in PROPERTIES if p not in props]
        if missing:
            print(f"  {el}: have {props}, MISSING {missing}")
        else:
            print(f"  {el}: complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
