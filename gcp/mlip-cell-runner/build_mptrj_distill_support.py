#!/usr/bin/env python3
"""Build a non-overlapping MPtrj support manifest for local Distill runs."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

import build_canonical_v2_mptrj as canonical


def row_identity(row: dict[str, Any]) -> tuple[str, str, str]:
    return (
        str(row.get("task_id") or ""),
        str(row.get("calc_id") or ""),
        str(row.get("ionic_step") or ""),
    )


def excluded_identities(manifest_path: Path | None) -> set[tuple[str, str, str]]:
    if manifest_path is None:
        return set()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    excluded: set[tuple[str, str, str]] = set()
    for group in (manifest.get("row_fixtures") or {}).values():
        if not isinstance(group, dict):
            continue
        for record in group.get("structures") or []:
            if not isinstance(record, dict):
                continue
            excluded.add(
                (
                    str(record.get("task_id") or ""),
                    str(record.get("calc_id") or ""),
                    str(record.get("ionic_step") or ""),
                )
            )
    excluded.discard(("", "", ""))
    return excluded


def filter_rows(rows: list[dict[str, Any]], excluded: set[tuple[str, str, str]]) -> list[dict[str, Any]]:
    return [row for row in rows if row_identity(row) not in excluded]


def support_row_from_manifest(manifest_path: Path, row_id: str) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    row_group = ((manifest.get("row_fixtures") or {}).get(row_id) or {}).get("structures") or []
    if not row_group:
        raise RuntimeError(f"{manifest_path} has no support structures for {row_id}")
    row_spec = (manifest.get("row_specs") or {}).get(row_id) or {
        "min_cases": 6,
        "error_tolerance": 50.0,
        "error_unit": "gpa_mae",
    }
    provenance = (manifest.get("reference_provenance") or {}).get(row_id) or {
        "source": f"{manifest_path.name}:{row_id}",
    }
    return {"structures": row_group}, row_spec, provenance


def build_manifest(args: argparse.Namespace) -> dict[str, Any]:
    canonical.MPTRJ_SPLIT = args.split
    candidates = canonical.fetch_mptrj_candidates(args.max_candidates, args.max_atoms)
    candidates = filter_rows(candidates, excluded_identities(args.exclude_manifest))
    force_rows = [row for row in candidates if canonical.max_force(row) > args.min_force]
    stress_rows = [row for row in candidates if canonical.stress_norm(row) > args.min_stress]
    if len(candidates) < args.per_row or len(force_rows) < args.per_row or len(stress_rows) < args.per_row:
        raise RuntimeError(
            "not enough non-overlapping MPtrj support rows "
            f"(energy={len(candidates)}, forces={len(force_rows)}, stress={len(stress_rows)})"
        )

    energy_rows = canonical.select_distinct(candidates, args.per_row, "mp_id")
    force_rows = canonical.select_distinct(force_rows, args.per_row, "task_id")
    stress_rows = canonical.select_distinct(stress_rows, args.per_row, "task_id")
    relaxation_rows = canonical.select_distinct(force_rows + candidates, min(3, args.per_row), "mp_id")
    elastic_group = None
    elastic_spec = None
    elastic_provenance = None
    if args.elastic_support_manifest:
        elastic_group, elastic_spec, elastic_provenance = support_row_from_manifest(
            args.elastic_support_manifest,
            "elastic_constants",
        )
    manifest = {
        "schema": "lupine.mlip.fixture_manifest.v2",
        "fixture_id": args.fixture_id,
        "title": "Canonical MPtrj Distill Support",
        "description": (
            "Non-overlapping public MPtrj support rows for fitting Lupine Distill "
            "runtime residual ribbons against the same broad distribution as the held-out baseline."
        ),
        "metadata": {
            "support_split": args.split,
            "max_atoms": args.max_atoms,
            "per_row": args.per_row,
            "excluded_manifest": str(args.exclude_manifest) if args.exclude_manifest else None,
        },
        "reference_provenance": {
            "mptrj": {
                "dataset": canonical.MPTRJ_DATASET,
                "config": canonical.MPTRJ_CONFIG,
                "split": args.split,
                "via": "Hugging Face Dataset Viewer rows API",
                "notes": "Support rows are excluded by task/calc/ionic-step identity from the held-out manifest.",
            }
        },
        "row_specs": {
            "energy_volume": {
                "min_cases": min(5, args.per_row),
                "error_tolerance": 0.10,
                "error_unit": "ev_per_atom_mae",
            },
            "forces": {
                "min_cases": min(5, args.per_row),
                "error_tolerance": 0.20,
                "error_unit": "ev_per_angstrom_rmse",
            },
            "stress": {
                "min_cases": min(5, args.per_row),
                "error_tolerance": 5.0,
                "error_unit": "gpa_mae",
            },
            "relaxation_stability": {
                "min_cases": min(3, args.per_row),
                "force_threshold": 0.05,
                "max_steps": 200,
                "error_tolerance": 0.10,
                "error_unit": "relaxation_penalty",
            },
        },
        "row_fixtures": {
            "energy_volume": {
                "structures": [
                    canonical.mptrj_record(row, "energy_volume", idx)
                    for idx, row in enumerate(energy_rows)
                ],
            },
            "forces": {
                "structures": [
                    canonical.mptrj_record(row, "forces", idx)
                    for idx, row in enumerate(force_rows)
                ],
            },
            "stress": {
                "structures": [
                    canonical.mptrj_record(row, "stress", idx)
                    for idx, row in enumerate(stress_rows)
                ],
            },
            "relaxation_stability": {
                "structures": [
                    canonical.mptrj_record(row, "relaxation_stability", idx)
                    for idx, row in enumerate(relaxation_rows)
                ],
            },
        },
    }
    if elastic_group and elastic_spec:
        manifest["row_specs"]["elastic_constants"] = elastic_spec
        manifest["row_fixtures"]["elastic_constants"] = elastic_group
        manifest["reference_provenance"]["elastic_constants"] = elastic_provenance
    canonical_json = json.dumps(manifest, sort_keys=True, separators=(",", ":")).encode("utf-8")
    manifest["manifest_hash"] = "sha256:" + hashlib.sha256(canonical_json).hexdigest()
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("gcp/mlip-cell-runner/fixtures/canonical_distill_support_mptrj_train_plus_elastic_v1.json"),
    )
    parser.add_argument("--exclude-manifest", type=Path, default=Path("gcp/mlip-cell-runner/fixtures/canonical_structures_v2_mptrj.json"))
    parser.add_argument("--fixture-id", default="canonical-distill-support-mptrj-train-plus-elastic-v1")
    parser.add_argument(
        "--elastic-support-manifest",
        type=Path,
        default=Path("gcp/mlip-cell-runner/fixtures/canonical_distill_support_v1.json"),
        help="Support-only manifest to borrow non-overlapping elastic_constants rows from.",
    )
    parser.add_argument("--split", default="train")
    parser.add_argument("--max-candidates", type=int, default=500)
    parser.add_argument("--max-atoms", type=int, default=80)
    parser.add_argument("--per-row", type=int, default=20)
    parser.add_argument("--min-force", type=float, default=0.05)
    parser.add_argument("--min-stress", type=float, default=0.05)
    args = parser.parse_args()

    manifest = build_manifest(args)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps({
        "output": str(args.output),
        "fixture_id": manifest["fixture_id"],
        "manifest_hash": manifest["manifest_hash"],
        "row_counts": {
            row_id: len(group["structures"])
            for row_id, group in manifest["row_fixtures"].items()
        },
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
