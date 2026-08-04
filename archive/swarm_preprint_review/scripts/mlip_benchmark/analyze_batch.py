"""Quick analysis of the first MLIP batch run.

Usage:
    python analyze_batch.py first_batch_2026-04-26.jsonl
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path


def main(path: Path) -> None:
    records = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
    print(f"Records: {len(records)}")

    by_mlip = defaultdict(list)
    for r in records:
        by_mlip[r["potential_id"]].append(r)

    for mlip, recs in sorted(by_mlip.items()):
        print(f"\n{'='*50}")
        print(f"MLIP: {mlip} ({len(recs)} records)")
        print("="*50)

        errors = [r["error"] for r in recs if r.get("error") is not None]
        abs_errs = [abs(e) for e in errors]
        print(f"  Mean abs error: {sum(abs_errs)/len(abs_errs):.3f}")
        print(f"  Median abs error: {sorted(abs_errs)[len(abs_errs)//2]:.3f}")
        print(f"  Max abs error: {max(abs_errs):.3f}")

        by_prop = defaultdict(list)
        for r in recs:
            by_prop[r["property"]].append(abs(r.get("error", 0)))

        print("\n  By property (mean abs error):")
        for prop, errs in sorted(by_prop.items()):
            print(f"    {prop:4s}: {sum(errs)/len(errs):.3f}")

        print("\n  Worst 5 predictions:")
        worst = sorted(recs, key=lambda r: abs(r.get("error", 0)), reverse=True)[:5]
        for r in worst:
            print(f"    {r['element']:3s} {r['property']:4s}: pred={r['predicted']:8.2f} ref={r['reference']:8.2f} err={r['error']:+.3f}")

        print("\n  Best 5 predictions:")
        best = sorted(recs, key=lambda r: abs(r.get("error", 0)))[:5]
        for r in best:
            print(f"    {r['element']:3s} {r['property']:4s}: pred={r['predicted']:8.2f} ref={r['reference']:8.2f} err={r['error']:+.3f}")


if __name__ == "__main__":
    p = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("first_batch_2026-04-26.jsonl")
    main(p)
