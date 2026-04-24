"""
Merge Tier 1 and Tier 2 OpenKIM elastic constant results into a unified benchmark.
Also produces summary statistics for the paper.
"""
import csv
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

BENCHMARKS_DIR = Path("atlas-distill/benchmarks")

def merge_csvs(output_name: str, *input_files: str):
    """Merge multiple CSVs with the same header into one."""
    all_rows = []
    header = None

    for f in input_files:
        path = BENCHMARKS_DIR / f
        if not path.exists():
            print(f"  [SKIP] {path} not found")
            continue
        with open(path, "r", encoding="utf-8") as fh:
            reader = csv.reader(fh)
            file_header = next(reader)
            if header is None:
                header = file_header
            for row in reader:
                all_rows.append(row)
        print(f"  [LOAD] {path}: {len(all_rows)} total rows so far")

    if not all_rows:
        print("  No data to merge!")
        return []

    out_path = BENCHMARKS_DIR / output_name
    with open(out_path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(header)
        writer.writerows(all_rows)

    print(f"\n  => Merged {len(all_rows)} rows -> {out_path}")
    return all_rows


def print_stats(csv_path: str):
    """Print summary statistics."""
    path = BENCHMARKS_DIR / csv_path
    if not path.exists():
        print(f"  File not found: {path}")
        return

    rows = list(csv.DictReader(open(path, encoding="utf-8")))
    print(f"\n{'='*60}")
    print(f"  Benchmark Summary: {path.name}")
    print(f"{'='*60}")
    print(f"  Total rows:        {len(rows)}")
    print(f"  Total potentials:  {len(rows)//3}")

    # Per element
    by_el = Counter(r["material"] for r in rows if r.get("property") == "C11")
    print(f"\n  Per-element (C11 entries):")
    for el, count in sorted(by_el.items(), key=lambda x: -x[1]):
        print(f"    {el:3s}: {count:4d} potentials")
    print(f"    {'---':3s}: {sum(by_el.values()):4d} total")

    # Per pair_style
    by_ps = Counter(r["pair_style"] for r in rows if r.get("pair_style"))
    print(f"\n  Per pair_style:")
    for ps, count in sorted(by_ps.items(), key=lambda x: -x[1]):
        print(f"    {ps:20s}: {count:4d} rows")

    # Crystal structure breakdown
    fcc = {"Al","Cu","Ni","Ag","Au","Pt","Pd","Pb"}
    bcc = {"Fe","Cr","Mo","W","V","Nb","Ta"}
    n_fcc = sum(1 for r in rows if r["material"] in fcc and r["property"] == "C11")
    n_bcc = sum(1 for r in rows if r["material"] in bcc and r["property"] == "C11")
    print(f"\n  By crystal structure (C11):")
    print(f"    FCC: {n_fcc} potentials")
    print(f"    BCC: {n_bcc} potentials")

    # Error statistics per element
    print(f"\n  Mean absolute error per element (C11):")
    by_el_errors = defaultdict(list)
    for r in rows:
        if r["property"] == "C11":
            try:
                ref = float(r["reference"])
                pred = float(r["predicted"])
                by_el_errors[r["material"]].append(abs(pred - ref))
            except (ValueError, KeyError):
                pass

    for el, errors in sorted(by_el_errors.items()):
        mae = sum(errors) / len(errors)
        max_err = max(errors)
        print(f"    {el:3s}: MAE = {mae:7.1f} GPa  (max = {max_err:7.1f} GPa, n = {len(errors)})")


if __name__ == "__main__":
    print("Merging benchmark files...\n")

    # Merge benchmark CSVs
    merge_csvs(
        "nist_populated_all.csv",
        "nist_populated.csv",
        "nist_populated_tier2.csv",
    )

    # Merge KIM results CSVs
    merge_csvs(
        "kim_elastic_results_all.csv",
        "kim_elastic_results.csv",
        "kim_elastic_results_tier2.csv",
    )

    # Print stats for all files
    for f in ["nist_populated.csv", "nist_populated_tier2.csv", "nist_populated_all.csv"]:
        if (BENCHMARKS_DIR / f).exists():
            print_stats(f)
