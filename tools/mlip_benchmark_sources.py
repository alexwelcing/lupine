#!/usr/bin/env python3
"""Validate and inspect the real-material MLIP benchmark source packet."""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
from collections.abc import Iterable
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "data" / "mlip_benchmarks" / "manifest_sources.json"
REQUIRED_SOURCE_FIELDS = ("source_id", "source_type", "title", "urls", "citation_keys", "license", "stewardship")
REQUIRED_LANE_FIELDS = ("lane_id", "material_family", "role", "required_tasks", "pass_conditions", "primary_sources")
READY_STATUSES = {"ready_local_evidence"}
NI_BULK_RESULT_FIELDS = ("c11", "c12", "c44", "a0", "ecoh")


def load_manifest(path: pathlib.Path = DEFAULT_MANIFEST) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError("source manifest must be a JSON object")
    return payload


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _has_text(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _repo_path(root: pathlib.Path, value: Any) -> pathlib.Path | None:
    if not _has_text(value):
        return None
    return root / str(value).replace("/", "\\")


def validate_source_packet(manifest: dict[str, Any], *, root: pathlib.Path = ROOT, check_local: bool = True) -> list[str]:
    """Return human-readable validation issues. An empty list is a pass."""

    issues: list[str] = []
    if manifest.get("schema") != "lupine.mlip.benchmark_sources.v1":
        issues.append("schema must be lupine.mlip.benchmark_sources.v1")
    if not _has_text(manifest.get("packet_id")):
        issues.append("packet_id is required")

    sources = _as_list(manifest.get("sources"))
    lanes = _as_list(manifest.get("material_lanes"))
    source_ids = {source.get("source_id") for source in sources if isinstance(source, dict)}
    lane_ids = {lane.get("lane_id") for lane in lanes if isinstance(lane, dict)}

    if not sources:
        issues.append("sources must contain at least one source")
    if not lanes:
        issues.append("material_lanes must contain at least one lane")

    for idx, source in enumerate(sources):
        if not isinstance(source, dict):
            issues.append(f"sources[{idx}] must be an object")
            continue
        source_id = source.get("source_id", f"sources[{idx}]")
        for field in REQUIRED_SOURCE_FIELDS:
            value = source.get(field)
            if field in {"urls", "citation_keys"}:
                if not _as_list(value) or not all(_has_text(item) for item in _as_list(value)):
                    issues.append(f"{source_id}.{field} must contain text values")
            elif not _has_text(value):
                issues.append(f"{source_id}.{field} is required")
        for lane_id in _as_list(source.get("use_in_lanes")):
            if lane_id not in lane_ids:
                issues.append(f"{source_id}.use_in_lanes references unknown lane {lane_id}")

    for idx, lane in enumerate(lanes):
        if not isinstance(lane, dict):
            issues.append(f"material_lanes[{idx}] must be an object")
            continue
        lane_id = lane.get("lane_id", f"material_lanes[{idx}]")
        for field in REQUIRED_LANE_FIELDS:
            value = lane.get(field)
            if field in {"required_tasks", "pass_conditions", "primary_sources"}:
                if not _as_list(value) or not all(_has_text(item) for item in _as_list(value)):
                    issues.append(f"{lane_id}.{field} must contain text values")
            elif not _has_text(value):
                issues.append(f"{lane_id}.{field} is required")
        for source_id in _as_list(lane.get("primary_sources")):
            if source_id not in source_ids:
                issues.append(f"{lane_id}.primary_sources references unknown source {source_id}")

    gates = _as_dict(manifest.get("acceptance_gates"))
    for gate_id in ("source_packet", "ni_local_baseline", "distill_accuracy"):
        if not _as_list(gates.get(gate_id)):
            issues.append(f"acceptance_gates.{gate_id} is required")

    reference_values = _as_dict(manifest.get("reference_values"))
    elastic_anchor = _as_dict(reference_values.get("ni_fcc_bulk_elastic_anchor"))
    elastic_values = _as_dict(elastic_anchor.get("values"))
    for key in ("c11_gpa", "c12_gpa", "c44_gpa"):
        if not isinstance(elastic_values.get(key), (int, float)):
            issues.append(f"reference_values.ni_fcc_bulk_elastic_anchor.values.{key} is required")
    lattice_anchor = _as_dict(reference_values.get("ni_fcc_lattice_anchor"))
    lattice_values = _as_dict(lattice_anchor.get("values"))
    if not isinstance(lattice_values.get("a0_angstrom"), (int, float)):
        issues.append("reference_values.ni_fcc_lattice_anchor.values.a0_angstrom is required")

    ready_count = 0
    meam_count = 0
    for idx, baseline in enumerate(_as_list(manifest.get("local_ni_classical_inventory"))):
        if not isinstance(baseline, dict):
            issues.append(f"local_ni_classical_inventory[{idx}] must be an object")
            continue
        baseline_id = baseline.get("baseline_id", f"local_ni_classical_inventory[{idx}]")
        for field in ("baseline_id", "label", "pair_style", "doi", "local_dir", "potential_file", "status", "publication_use"):
            if not _has_text(baseline.get(field)):
                issues.append(f"{baseline_id}.{field} is required")
        status = str(baseline.get("status", ""))
        if status in READY_STATUSES:
            ready_count += 1
        if str(baseline.get("pair_style", "")).startswith("meam"):
            meam_count += 1
        if check_local:
            for field in ("local_dir", "potential_file"):
                repo_path = _repo_path(root, baseline.get(field))
                if repo_path is not None and not repo_path.exists():
                    issues.append(f"{baseline_id}.{field} does not exist: {baseline.get(field)}")
            result_value = baseline.get("result_json")
            if status in READY_STATUSES:
                repo_path = _repo_path(root, result_value)
                if repo_path is None or not repo_path.exists():
                    issues.append(f"{baseline_id}.result_json is required for ready evidence")
    if ready_count < 3:
        issues.append("at least three ready Ni classical baselines are required")
    if meam_count < 1:
        issues.append("at least one Ni MEAM candidate is required")

    return issues


def ni_inventory(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for baseline in _as_list(manifest.get("local_ni_classical_inventory")):
        if not isinstance(baseline, dict):
            continue
        rows.append({
            "baseline_id": baseline.get("baseline_id"),
            "label": baseline.get("label"),
            "pair_style": baseline.get("pair_style"),
            "doi": baseline.get("doi"),
            "status": baseline.get("status"),
            "publication_use": baseline.get("publication_use"),
            "result_json": baseline.get("result_json"),
        })
    return rows


def ni_reference_values(manifest: dict[str, Any]) -> dict[str, float]:
    reference_values = _as_dict(manifest.get("reference_values"))
    elastic_values = _as_dict(_as_dict(reference_values.get("ni_fcc_bulk_elastic_anchor")).get("values"))
    lattice_values = _as_dict(_as_dict(reference_values.get("ni_fcc_lattice_anchor")).get("values"))
    refs: dict[str, float] = {}
    mapping = {
        "c11": "c11_gpa",
        "c12": "c12_gpa",
        "c44": "c44_gpa",
        "a0": "a0_angstrom",
    }
    for output_key, input_key in mapping.items():
        source = lattice_values if output_key == "a0" else elastic_values
        value = source.get(input_key)
        if isinstance(value, (int, float)):
            refs[output_key] = float(value)
    return refs


def _load_result(root: pathlib.Path, value: Any) -> dict[str, Any] | None:
    result_path = _repo_path(root, value)
    if result_path is None or not result_path.exists():
        return None
    with result_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return payload if isinstance(payload, dict) else None


def ni_bulk_results(manifest: dict[str, Any], *, root: pathlib.Path = ROOT) -> list[dict[str, Any]]:
    refs = ni_reference_values(manifest)
    rows: list[dict[str, Any]] = []
    for baseline in _as_list(manifest.get("local_ni_classical_inventory")):
        if not isinstance(baseline, dict):
            continue
        result = _load_result(root, baseline.get("result_json"))
        if result is None:
            continue
        row: dict[str, Any] = {
            "baseline_id": baseline.get("baseline_id"),
            "label": baseline.get("label"),
            "pair_style": baseline.get("pair_style"),
            "doi": baseline.get("doi"),
            "status": baseline.get("status"),
            "success": bool(result.get("success")),
        }
        for field in NI_BULK_RESULT_FIELDS:
            value = result.get(field)
            if isinstance(value, (int, float)):
                row[field] = float(value)
                ref = refs.get(field)
                if ref is not None:
                    row[f"{field}_reference"] = ref
                    row[f"{field}_abs_error"] = abs(float(value) - ref)
        rows.append(row)
    return rows


def _print_table(rows: list[dict[str, Any]]) -> None:
    headers = ["label", "pair_style", "status", "publication_use", "doi"]
    widths = {header: max(len(header), *(len(str(row.get(header, ""))) for row in rows)) for header in headers}
    print("  ".join(header.ljust(widths[header]) for header in headers))
    print("  ".join("-" * widths[header] for header in headers))
    for row in rows:
        print("  ".join(str(row.get(header, "")).ljust(widths[header]) for header in headers))


def _print_bulk_table(rows: list[dict[str, Any]]) -> None:
    headers = ["label", "pair_style", "c11", "c12", "c44", "a0", "ecoh", "doi"]
    widths = {header: max(len(header), *(len(_format_cell(row.get(header))) for row in rows)) for header in headers}
    print("  ".join(header.ljust(widths[header]) for header in headers))
    print("  ".join("-" * widths[header] for header in headers))
    for row in rows:
        print("  ".join(_format_cell(row.get(header)).ljust(widths[header]) for header in headers))


def _format_cell(value: Any) -> str:
    if isinstance(value, float):
        return f"{value:.6g}"
    if value is None:
        return ""
    return str(value)


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=pathlib.Path, default=DEFAULT_MANIFEST)
    sub = parser.add_subparsers(dest="command", required=True)
    validate_parser = sub.add_parser("validate", help="Validate source packet")
    validate_parser.add_argument("--no-local-path-check", action="store_true")
    inventory_parser = sub.add_parser("ni-inventory", help="Print Ni classical baseline inventory")
    inventory_parser.add_argument("--json", action="store_true", dest="as_json")
    bulk_parser = sub.add_parser("ni-bulk-results", help="Print ready Ni bulk elastic/lattice evidence")
    bulk_parser.add_argument("--json", action="store_true", dest="as_json")
    args = parser.parse_args(list(argv) if argv is not None else None)

    manifest = load_manifest(args.manifest)
    if args.command == "validate":
        issues = validate_source_packet(manifest, root=ROOT, check_local=not args.no_local_path_check)
        if issues:
            print(json.dumps({"status": "fail", "issues": issues}, indent=2), file=sys.stderr)
            return 1
        print(json.dumps({
            "status": "pass",
            "packet_id": manifest["packet_id"],
            "sources": len(_as_list(manifest.get("sources"))),
            "lanes": len(_as_list(manifest.get("material_lanes"))),
            "ni_classical_inventory": len(_as_list(manifest.get("local_ni_classical_inventory"))),
        }, indent=2))
        return 0
    if args.command == "ni-inventory":
        rows = ni_inventory(manifest)
        if args.as_json:
            print(json.dumps(rows, indent=2, sort_keys=True))
        else:
            _print_table(rows)
        return 0
    if args.command == "ni-bulk-results":
        rows = ni_bulk_results(manifest, root=ROOT)
        if args.as_json:
            print(json.dumps(rows, indent=2, sort_keys=True))
        else:
            _print_bulk_table(rows)
        return 0
    raise AssertionError(args.command)


if __name__ == "__main__":
    raise SystemExit(main())
