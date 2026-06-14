"""End-to-end runner: predict elastic constants via one or more MLIPs and emit
JSONL records ready for `glim ingest` / POST /ingest/batch.

Each row is a `BenchmarkRecord` matching the D1 ledger schema:
    record_id, element, potential_id, potential_label, pair_style,
    property, reference, predicted, unit, provenance, agent_id, timestamp

Output is JSONL (one record per line) so the file can be streamed into
`/ingest/batch` directly.

Usage:
    python run_predictions.py \\
        --references references.json \\
        --mlips chgnet,mace_mp0,m3gnet \\
        --out mlip_records.jsonl

Compute estimates (single CPU, no GPU):
    chgnet:  ~5 s per element  (~75 s for 15 elements)
    mace_mp0: ~30 s per element (~7 min for 15 elements, fp32)
    m3gnet:  ~10 s per element (~2.5 min for 15 elements)

Smoke test (no install needed, validates plumbing on FCC metals):
    python run_predictions.py --references references.json --mlips emt \\
        --elements Al,Cu,Ni --out smoke.jsonl
"""
from __future__ import annotations

import argparse
import json
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

from calculators import CALCULATORS, make_calculator
from elastic import DEFAULT_LATTICE, ElasticResult, elastic_constants
from extract_references import ELEMENTS, PROPERTIES


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _record(element: str, mlip_id: str, mlip_label: str,
            structure: str, prop: str, reference: float, predicted: float,
            unit: str) -> dict:
    """Build a BenchmarkRecord dict matching the D1 ledger schema."""
    ts = _now()
    safe_ts = ts.replace(":", "-").replace(".", "-")
    return {
        "recordId": f"mlip_{mlip_id}_{element}_{prop}_{safe_ts}",
        "element": element,
        "potentialId": mlip_id,
        "potentialLabel": mlip_label,
        "pairStyle": "mlip",
        "property": prop,
        "reference": reference,
        "predicted": predicted,
        "unit": unit,
        "provenance": {
            "source": "mlip_benchmark/run_predictions.py",
            "structure": structure,
            "harness_version": "0.1.0",
        },
        "agentId": "mlip_benchmark_runner",
        "timestamp": ts,
    }


def _expand(result: ElasticResult, references: dict[str, float],
            mlip_id: str, mlip_label: str) -> list[dict]:
    """Convert one ElasticResult into per-property BenchmarkRecord dicts."""
    out: list[dict] = []
    pred_map: dict[str, tuple[float, str]] = {
        "C11": (result.c11, "GPa"),
        "C12": (result.c12, "GPa"),
        "C44": (result.c44, "GPa"),
        "a0":  (result.a0,  "A"),
    }
    for prop, (predicted, unit) in pred_map.items():
        if prop not in references:
            continue
        out.append(_record(
            result.element, mlip_id, mlip_label, result.structure,
            prop, references[prop], predicted, unit,
        ))
    return out


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--references", type=Path, required=True,
                   help="JSON output from extract_references.py")
    p.add_argument("--mlips", default="chgnet",
                   help="Comma-separated MLIP ids (see calculators.CALCULATORS)")
    p.add_argument("--elements", default=None,
                   help="Comma-separated element subset (default: all 15)")
    p.add_argument("--out", type=Path, required=True,
                   help="JSONL output path")
    p.add_argument("--continue-on-error", action="store_true",
                   help="Skip element/MLIP combos that throw, log and continue")
    args = p.parse_args()

    if not args.references.exists():
        print(f"error: {args.references} not found; run extract_references.py first",
              file=sys.stderr)
        return 1

    refs: dict[str, dict[str, float]] = json.loads(args.references.read_text(encoding="utf-8"))
    elements = (args.elements.split(",") if args.elements
                else [e for e in ELEMENTS if e in refs])
    mlips = [m.strip() for m in args.mlips.split(",") if m.strip()]

    unknown = [m for m in mlips if m not in CALCULATORS]
    if unknown:
        print(f"error: unknown MLIPs {unknown}; choices: {sorted(CALCULATORS)}",
              file=sys.stderr)
        return 1

    args.out.parent.mkdir(parents=True, exist_ok=True)
    n_records = 0
    n_failures = 0

    with args.out.open("w", encoding="utf-8") as f:
        for mlip_id in mlips:
            label, _ = CALCULATORS[mlip_id]
            try:
                calc = make_calculator(mlip_id)
            except ImportError as e:
                print(f"skip mlip={mlip_id}: {e}", file=sys.stderr)
                if args.continue_on_error:
                    continue
                return 2

            for element in elements:
                if element not in refs:
                    print(f"skip {mlip_id}/{element}: no references", file=sys.stderr)
                    continue
                if element not in DEFAULT_LATTICE:
                    print(f"skip {mlip_id}/{element}: no default lattice", file=sys.stderr)
                    continue
                try:
                    result = elastic_constants(element, calc)
                    rows = _expand(result, refs[element], mlip_id, label)
                    for row in rows:
                        f.write(json.dumps(row) + "\n")
                        n_records += 1
                    print(f"ok  {mlip_id}/{element}: a0={result.a0:.3f} "
                          f"C11={result.c11:.1f} C12={result.c12:.1f} C44={result.c44:.1f}")
                except Exception as e:  # noqa: BLE001 — domain harness, log & continue
                    n_failures += 1
                    print(f"FAIL {mlip_id}/{element}: {e}", file=sys.stderr)
                    if not args.continue_on_error:
                        traceback.print_exc()
                        return 3

    print(f"\nwrote {n_records} records to {args.out} ({n_failures} failures)")
    return 0 if n_failures == 0 or args.continue_on_error else 4


if __name__ == "__main__":
    sys.exit(main())
