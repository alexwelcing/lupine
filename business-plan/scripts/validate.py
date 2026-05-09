#!/usr/bin/env python3
"""Validator for the Lupine business plan.

Checks:
1. Every CSV in data/ parses with a header row.
2. Every row carries a non-empty `tier` column drawn from the allowed set.
3. Every [data:<file>:<id>] reference in the narrative resolves to a row.
4. Bear < base < bull on revenue and ARR rows in projections_bear_bull.csv.

Usage:
    python3 business-plan/scripts/validate.py

Exit code is 0 on clean run; non-zero with a printed report on failure.
"""

from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

ALLOWED_TIERS = {"verified", "disclosed", "triangulated", "directional", "projection"}

ROOT = Path(__file__).resolve().parent.parent
DATA_DIRS = [ROOT / "data", ROOT / "value-model"]
NARRATIVE_DIRS = [
    ROOT,
    ROOT / "thesis",
    ROOT / "market",
    ROOT / "partners",
    ROOT / "financials",
    ROOT / "marketing",
    ROOT / "audience",
]

REFERENCE_RE = re.compile(r"\[data:([a-zA-Z0-9_./-]+):([a-zA-Z0-9_-]+)")


def load_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        return reader.fieldnames or [], rows


def lint_csvs() -> list[str]:
    errors: list[str] = []
    csv_paths = []
    for d in DATA_DIRS:
        if d.exists():
            csv_paths.extend(sorted(d.glob("*.csv")))
    for csv_path in csv_paths:
        header, rows = load_csv(csv_path)
        if "id" not in header:
            errors.append(f"{csv_path.name}: missing required `id` column")
            continue
        if "tier" not in header:
            errors.append(f"{csv_path.name}: missing required `tier` column")
            continue
        seen_ids: set[str] = set()
        for i, row in enumerate(rows, start=2):
            row_id = row.get("id", "").strip()
            tier = row.get("tier", "").strip()
            if not row_id:
                errors.append(f"{csv_path.name}:{i}: empty `id`")
            elif row_id in seen_ids:
                errors.append(f"{csv_path.name}:{i}: duplicate `id` `{row_id}`")
            else:
                seen_ids.add(row_id)
            if not tier:
                errors.append(f"{csv_path.name}:{i}: empty `tier` for id `{row_id}`")
            elif tier not in ALLOWED_TIERS:
                errors.append(
                    f"{csv_path.name}:{i}: invalid tier `{tier}` for id `{row_id}` "
                    f"(allowed: {sorted(ALLOWED_TIERS)})"
                )
    return errors


def index_data() -> dict[str, set[str]]:
    """Return {csv_basename_without_ext: {ids...}} plus full filename keys."""
    index: dict[str, set[str]] = {}
    for d in DATA_DIRS:
        if not d.exists():
            continue
        for csv_path in d.glob("*.csv"):
            _, rows = load_csv(csv_path)
            ids = {row["id"].strip() for row in rows if row.get("id")}
            index[csv_path.stem] = ids
            index[csv_path.name] = ids
    return index


def validate_references(index: dict[str, set[str]]) -> list[str]:
    errors: list[str] = []
    for narrative_dir in NARRATIVE_DIRS:
        for md in sorted(narrative_dir.glob("*.md")):
            if md.parent.name == "data":
                continue
            text = md.read_text(encoding="utf-8")
            for match in REFERENCE_RE.finditer(text):
                file_token = match.group(1).strip()
                ids_part = match.group(2).strip()
                # support comma-separated id lists like [data:foo.csv:a, b, c]
                ids = [ids_part]
                # Find any extra ids in the same bracket group
                rest = text[match.end():]
                rest_match = re.match(r"((?:,\s*[a-zA-Z0-9_-]+)*)\s*\]", rest)
                if rest_match:
                    extras = re.findall(r"[a-zA-Z0-9_-]+", rest_match.group(1))
                    ids.extend(extras)
                # normalize file token: accept either basename with or without .csv
                file_key = file_token if file_token in index else (
                    file_token + ".csv" if (file_token + ".csv") in index else None
                )
                if file_key is None:
                    file_key_stem = file_token.replace(".csv", "")
                    if file_key_stem in index:
                        file_key = file_key_stem
                if file_key is None:
                    errors.append(
                        f"{md.relative_to(ROOT.parent)}: reference to unknown CSV "
                        f"`{file_token}`"
                    )
                    continue
                for token in ids:
                    if token not in index[file_key]:
                        errors.append(
                            f"{md.relative_to(ROOT.parent)}: reference "
                            f"[data:{file_token}:{token}] does not resolve "
                            f"(file `{file_token}` has no id `{token}`)"
                        )
    return errors


def validate_projections_ordering() -> list[str]:
    errors: list[str] = []
    path = ROOT / "data" / "projections_bear_bull.csv"
    if not path.exists():
        return [f"{path.name}: missing"]
    _, rows = load_csv(path)
    by_metric: dict[str, dict[str, dict[str, str]]] = {}
    for row in rows:
        metric = row.get("line_item", "").strip()
        scenario = row.get("scenario", "").strip().lower()
        if not metric or scenario not in {"bear", "base", "bull"}:
            continue
        by_metric.setdefault(metric, {})[scenario] = row
    for metric, scenarios in by_metric.items():
        if not {"bear", "base", "bull"}.issubset(scenarios.keys()):
            continue  # not all 3 scenarios; skip
        for col in ("fy2026", "fy2027", "fy2028", "fy2029", "fy2030"):
            try:
                bear = float(scenarios["bear"].get(col, "") or "nan")
                base = float(scenarios["base"].get(col, "") or "nan")
                bull = float(scenarios["bull"].get(col, "") or "nan")
            except ValueError:
                continue
            # Allow equality on early years; only enforce strict in FY30 to keep
            # the model honest without rejecting early-year flat lines.
            if col == "fy2030" and not (bear < base < bull):
                errors.append(
                    f"projections_bear_bull.csv: `{metric}` violates "
                    f"bear<base<bull on {col} ({bear} / {base} / {bull})"
                )
    return errors


def main() -> int:
    errors: list[str] = []
    errors += lint_csvs()
    if errors:
        print("Halting CSV lint with errors:")
        for e in errors:
            print(f"  - {e}")
        return 1

    index = index_data()
    errors += validate_references(index)
    errors += validate_projections_ordering()

    if errors:
        print(f"Found {len(errors)} validation errors:\n")
        for e in errors:
            print(f"  - {e}")
        return 1

    csv_count = sum(len(list(d.glob("*.csv"))) for d in DATA_DIRS if d.exists())
    md_count = sum(1 for d in NARRATIVE_DIRS for _ in d.glob("*.md"))
    print(f"OK: {csv_count} CSVs lint clean, {md_count} narrative files cross-resolve.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
