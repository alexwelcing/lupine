#!/usr/bin/env python3
"""Acquire pinned mixed JSON into an ignored cache and emit metadata only.

The custodian necessarily acquires target-bearing bytes. No target values,
freeform source text, fitted quantities or scientific outcomes are emitted.
Acquisition must not be run until this implementation has been reviewed and
committed. This is custody tooling, not an evaluation protocol.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from decimal import Decimal
from functools import cache as memoize
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.request import HTTPRedirectHandler, Request, build_opener


ROOT = Path(__file__).resolve().parents[1]
COMMIT = "81079a8e1bac7ed332712cc92002bd3435e40776"
REPOSITORY = "alexwelcing/lupine-rhizo"
INVENTORY_SHA256 = "4874aebfa7e6f8003b6b733750ddac6675770a7b815b9ac8e1de81f55d118f42"
MATERIALS = ("Ag", "Al", "Au", "Ca", "Cu", "Ni", "Pd", "Pt", "Sr")
MODELS = ("chgnet", "mace-mp-small", "mace-mp-medium", "mace-mpa-0-medium")
PROPERTIES = ("gamma_100", "gamma_111", "vacancy_formation_energy", "gamma_110")
TARGET_NAMES = dict(zip(PROPERTIES, ("surface_energy_100", "surface_energy_111", "vacancy_formation_energy", "surface_energy_110")))
PROPERTY_UNITS = {name: "eV" if name == "vacancy_formation_energy" else "J/m^2" for name in PROPERTIES}
METHODS = ("DFT-PBE", "experiment")
STRUCTURES = ("fcc", "bcc", "diamond", "rocksalt", "b2", "l12")
UNITS = ("eV", "eV/atom", "J/m^2", "mJ/m^2", "GPa", "Angstrom", "dimensionless")
REFERENCES = ("data/y_matrix_targets/surface_energies.json", "data/y_matrix_targets/vacancy_formation.json")
SCHEMAS = {"run": "lupine.statics_run.v1", "evidence": "lupine.mlip.calc_evidence.v1", "reference": "lupine.y_matrix_targets.v1"}
FILE_STATUSES = {"VERIFIED", "MISSING", "SIZE_MISMATCH", "BLOB_MISMATCH", "JSON_INVALID", "SCHEMA_CONFLICT", "METADATA_INVALID", "READ_FAILED", "ACQUISITION_FAILED"}
GATE_STATUSES = {"PASS", "UNKNOWN", "CONFLICT", "REVIEW_REQUIRED", "UNSUPPORTED"}
MAX_FILE_BYTES = 262144
PUBLIC_ERRORS = {"CACHE_PATH_INVALID", "CLI_ARGUMENT_INVALID", "INVENTORY_COMMIT_CONFLICT", "INVENTORY_IDENTITY_INVALID",
                 "INVENTORY_METADATA_INVALID", "INVENTORY_PATH_SET_CONFLICT", "INVENTORY_READ_FAILED", "INVENTORY_SEAL_CONFLICT",
                 "PUBLIC_OUTPUT_EXISTS_WITH_DIFFERENT_BYTES", "PUBLIC_SCALAR_INVALID", "PUBLIC_SCHEMA_CONFLICT", "PUBLIC_SCOPE_CONFLICT",
                 "PUBLIC_SEAL_CONFLICT", "PUBLIC_UNIVERSE_CONFLICT", "UNEXPECTED_INPUT_PATH"}


class CustodyError(Exception):
    """Public exceptions contain only reviewed constant reason codes."""


def canonical_bytes(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True, allow_nan=False)+"\n").encode("ascii")


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha1(raw):
    return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw).hexdigest()


def _sha(value, length=64):
    return value if isinstance(value, str) and re.fullmatch(r"[0-9a-f]{"+str(length)+"}", value) else None


def _member(value, choices):
    return value if isinstance(value, str) and value in choices else None


def _object(value):
    return value if isinstance(value, dict) else {}


def _present(value, key):
    # Presence is structural. Null, false, empty, finite or plausible is irrelevant.
    return isinstance(value, dict) and key in value


def _unit_status(actual, expected):
    known = _member(actual, UNITS)
    return "UNKNOWN" if known is None else ("PASS" if known == expected else "CONFLICT")


def _pairs(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise CustodyError("DUPLICATE_KEY")
        value[key] = item
    return value


def _constant(_):
    raise CustodyError("NONSTANDARD_JSON_CONSTANT")


def strict_decode(raw):
    try:
        value = json.loads(raw, object_pairs_hook=_pairs, parse_float=Decimal, parse_int=Decimal, parse_constant=_constant)
    except (ValueError, UnicodeError, RecursionError, CustodyError):
        raise CustodyError("JSON_INVALID") from None
    if not isinstance(value, dict):
        raise CustodyError("JSON_INVALID")
    return value


@dataclass(frozen=True)
class ArtifactSpec:
    path: str
    git_blob_sha1: str
    size: int


def triple_paths(material, model):
    stem = f"{material}_fcc_{model}"
    return (f"data/y_matrix_runs/{stem}.json", f"data/y_matrix_runs/{stem}.evidence.json", f"data/y_matrix_runs/bound/{stem}.evidence.json")


def expected_paths():
    return tuple(path for material in MATERIALS for model in MODELS for path in triple_paths(material, model))+REFERENCES


def validate_specs(specs):
    specs = tuple(specs)
    if len(specs) != 110 or {s.path for s in specs} != set(expected_paths()):
        raise CustodyError("INVENTORY_PATH_SET_CONFLICT")
    for spec in specs:
        if _sha(spec.git_blob_sha1, 40) is None or type(spec.size) is not int or not 0 < spec.size <= MAX_FILE_BYTES:
            raise CustodyError("INVENTORY_IDENTITY_INVALID")
    return {s.path: s for s in specs}


def load_inventory(path=None):
    path = Path(path) if path is not None else ROOT/"reports/projection-source-inventory.json"
    try:
        raw = path.read_bytes()
    except OSError:
        raise CustodyError("INVENTORY_READ_FAILED") from None
    if sha256(raw) != INVENTORY_SHA256:
        raise CustodyError("INVENTORY_SEAL_CONFLICT")
    value = json.loads(raw)
    try:
        if value["repositories"]["rhizo"]["commit"] != COMMIT:
            raise CustodyError("INVENTORY_COMMIT_CONFLICT")
        rows = [row for unit in value["metadata_only_fcc_units"] for row in unit["artifacts"]]
        rows += [row for row in value["metadata_only_reference_and_report_artifacts"] if row["path"] in REFERENCES]
        specs = tuple(ArtifactSpec(row["path"], row["git_blob_sha1"], row["bytes"]) for row in rows)
        validate_specs(specs)
    except (KeyError, TypeError, ValueError):
        raise CustodyError("INVENTORY_METADATA_INVALID") from None
    return specs


def _property_metadata(records):
    if not isinstance(records, list):
        raise CustodyError("METADATA_INVALID")
    result = {name: {"record_count": 0, "unit_status": "UNKNOWN", "record_status": "MISSING"} for name in PROPERTIES}
    for item in records:
        if not isinstance(item, dict):
            raise CustodyError("METADATA_INVALID")
        name = _member(item.get("name"), PROPERTIES)
        if name is None:
            continue
        row = result[name]
        row["record_count"] += 1
        status = _unit_status(item.get("unit"), PROPERTY_UNITS[name])
        row["unit_status"] = status if row["record_count"] == 1 else ("CONFLICT" if "CONFLICT" in {row["unit_status"], status} else ("UNKNOWN" if "UNKNOWN" in {row["unit_status"], status} else "PASS"))
        row["record_status"] = "SINGLE" if row["record_count"] == 1 else "DUPLICATE"
    return result


def _evidence_metadata(value):
    source, provenance = _object(value.get("source")), _object(value.get("provenance"))
    return {"material": _member(value.get("material"), MATERIALS),
            "model_id": _member(source.get("model_id"), MODELS),
            "backend": _member(source.get("backend"), ("ase", "torchsim", "lammps")),
            "device": _member(source.get("device"), ("cpu", "cuda")),
            # Versions are free text in the source; a presence flag avoids a covert value channel.
            "calculator_version_field_present": _present(source, "calculator_version"),
            "input_hash_field_present": _present(provenance, "inputs_sha256"),
            "input_hash_format_valid": _sha(provenance.get("inputs_sha256")) is not None,
            "_private_inputs_sha256": _sha(provenance.get("inputs_sha256")),
            "properties": _property_metadata(value.get("properties"))}


def _run_metadata(value):
    results = _object(value.get("results"))
    surface_rows = results.get("surfaces", [])
    if not isinstance(surface_rows, list):
        raise CustodyError("METADATA_INVALID")
    facets = {name: 0 for name in ("100", "111", "110")}
    for row in surface_rows:
        miller = _member(_object(_object(row).get("values")).get("miller"), facets)
        if miller is not None:
            facets[miller] += 1
    return {"material": _member(value.get("material"), MATERIALS),
            "structure": _member(value.get("structure_type"), STRUCTURES),
            "model_id": _member(value.get("model_id"), MODELS),
            "device": _member(value.get("device"), ("cpu", "cuda")),
            "calculator_version_field_present": _present(value, "calculator_version"),
            "geometry_source": "MODEL_STATICS_COMPANION",
            "lattice_record_present": _present(results, "lattice"),
            "vacancy_record_present": _present(results, "vacancy"),
            "surface_record_counts": facets,
            "numeric_geometry_exported": False,
            "conditions_status": "UNKNOWN"}


def _reference_metadata(value):
    records = value.get("entries")
    if not isinstance(records, list):
        raise CustodyError("METADATA_INVALID")
    result = []
    for ordinal, row in enumerate(records):
        if not isinstance(row, dict):
            raise CustodyError("METADATA_INVALID")
        source = _object(row.get("source"))
        target_name = _member(row.get("property"), TARGET_NAMES.values())
        name = next((k for k, v in TARGET_NAMES.items() if v == target_name), None)
        result.append({"ordinal": ordinal,
                       "material": _member(row.get("material"), MATERIALS),
                       "structure": _member(row.get("structure"), STRUCTURES),
                       "property": name,
                       "unit_status": _unit_status(row.get("unit"), PROPERTY_UNITS[name]) if name is not None else "UNKNOWN",
                       "method": _member(row.get("method"), METHODS),
                       "citation_field_present": _present(source, "citation"),
                       "source_locator_field_present": _present(source, "doi_or_url"),
                       "notes_field_present": _present(source, "notes"),
                       "primary_source_identity_status": "UNKNOWN",
                       "reference_uncertainty_status": "UNKNOWN",
                       "conditions_status": "UNKNOWN"})
    return {"family": _member(value.get("family"), ("surface_energies", "vacancy_formation")), "entries": result}


def _parse_artifact(spec, raw):
    record = {"path": spec.path, "expected_git_blob_sha1": spec.git_blob_sha1, "expected_bytes": spec.size,
              "received_sha256": None, "received_bytes": None, "status": "MISSING", "metadata": None}
    if raw is None:
        return record
    if not isinstance(raw, bytes):
        record["status"] = "READ_FAILED"
        return record
    record.update(received_sha256=sha256(raw), received_bytes=len(raw))
    if len(raw) != spec.size:
        record["status"] = "SIZE_MISMATCH"
        return record
    if git_blob_sha1(raw) != spec.git_blob_sha1:
        record["status"] = "BLOB_MISMATCH"
        return record
    try:
        value = strict_decode(raw)
        kind = "reference" if spec.path in REFERENCES else ("evidence" if spec.path.endswith(".evidence.json") else "run")
        if value.get("schema") != SCHEMAS[kind]:
            record["status"] = "SCHEMA_CONFLICT"
            return record
        record["metadata"] = {"kind": kind, **{"run": _run_metadata, "evidence": _evidence_metadata, "reference": _reference_metadata}[kind](value)}
        record["status"] = "VERIFIED"
    except CustodyError as exc:
        record["status"] = str(exc) if str(exc) in {"JSON_INVALID", "METADATA_INVALID"} else "METADATA_INVALID"
    except (TypeError, ValueError, KeyError, RecursionError):
        record["status"] = "METADATA_INVALID"
    return record


def _unit(material, model, records, references):
    paths = triple_paths(material, model)
    triple = [records[path] for path in paths]
    metadata = [row["metadata"] for row in triple]
    complete = all(row["status"] == "VERIFIED" for row in triple)
    identity = "UNKNOWN"
    input_identity = "UNKNOWN"
    if complete:
        pairs = [(row["material"], material) for row in metadata]+[(row["model_id"], model) for row in metadata]+[(metadata[0]["structure"], "fcc")]
        identity = "CONFLICT" if any(actual is not None and actual != expected for actual, expected in pairs) else ("UNKNOWN" if any(actual is None for actual, _ in pairs) else "PASS")
        a, b = metadata[1]["_private_inputs_sha256"], metadata[2]["_private_inputs_sha256"]
        if a is not None and b is not None:
            input_identity = "PASS" if a == b else "CONFLICT"
    properties = []
    for name in PROPERTIES:
        matches = [{"path": path, "ordinal": entry["ordinal"], "method": entry["method"], "unit_status": entry["unit_status"]}
                   for path, entry in references if entry["material"] == material and entry["structure"] == "fcc" and entry["property"] == name]
        conflict = (material in {"Ag", "Au", "Pt"} and name == "gamma_110") or (material == "Sr" and name == "gamma_111")
        properties.append({"name": name, "unit": PROPERTY_UNITS[name],
                           "unbound_record_count": metadata[1]["properties"][name]["record_count"] if metadata[1] is not None else None,
                           "bound_record_count": metadata[2]["properties"][name]["record_count"] if metadata[2] is not None else None,
                           "reference_candidates": matches,
                           "reference_match_status": "UNKNOWN" if not matches else ("REVIEW_REQUIRED" if len(matches) > 1 else "PASS"),
                           "reference_choice_made": False,
                           "facet_jurisdiction": "REVIEW_REQUIRED" if conflict else "UNKNOWN",
                           "jurisdiction_reason": "README_RECONSTRUCTED_TERMINATION" if conflict else "CONDITIONS_NOT_ESTABLISHED"})
    return {"material": material, "structure": "fcc", "model_id": model, "artifact_paths": list(paths),
            "gates": {"archive_integrity_and_schema": "PASS" if complete else "UNKNOWN",
                      "symbolic_triple_identity": identity, "declared_input_hash_agreement": input_identity,
                      "checkpoint_identity": "UNKNOWN", "primary_source_rights": "UNKNOWN",
                      "reference_conditions_and_uncertainty": "UNKNOWN", "fixed_fcc_map_source": "PASS",
                      "physical_discrepancy_bounds": "UNSUPPORTED", "scientific_common_field_support": "UNKNOWN",
                      "multiple_same_block_heldout_candidates": "UNKNOWN"},
            "checkpoint": {"declared_digest_available_in_reviewed_schema": False, "checkpoint_bytes_verified": False},
            "properties": properties, "numerical_target_completeness_checked": False,
            "eligibility_decision": "NOT_MADE", "split_assigned": False}


def extract_files(specs, captured_by_path):
    """Pure redaction. Synthetic specs are for tests; public CLI pins inventory."""
    indexed = validate_specs(specs)
    if set(captured_by_path)-set(indexed):
        raise CustodyError("UNEXPECTED_INPUT_PATH")
    artifacts = [_parse_artifact(indexed[path], captured_by_path.get(path)) for path in expected_paths()]
    records = {row["path"]: row for row in artifacts}
    references = [(path, entry) for path in REFERENCES if records[path]["metadata"] is not None for entry in records[path]["metadata"]["entries"]]
    units = [_unit(material, model, records, references) for material in MATERIALS for model in MODELS]
    for row in artifacts:
        if row["metadata"] is not None:
            row["metadata"].pop("_private_inputs_sha256", None)
    received = sum(row["received_bytes"] is not None for row in artifacts)
    parsed = sum(row["status"] not in {"MISSING", "READ_FAILED", "SIZE_MISMATCH", "BLOB_MISMATCH", "JSON_INVALID", "ACQUISITION_FAILED"} for row in artifacts)
    report = {"schema": "lupine.discovery.projection_custody.v1", "repository": REPOSITORY, "commit": COMMIT,
              "inventory_sha256": INVENTORY_SHA256, "status": "METADATA_COMPLETE" if all(row["status"] == "VERIFIED" for row in artifacts) else "METADATA_INCOMPLETE",
              "scope": {"target_bearing_source_bytes_acquired": bool(received), "mixed_source_json_decoded": bool(parsed),
                        "targets_withheld_from_researcher_output": True, "fully_blinded_research_claim": False,
                        "upstream_loaders_executed": False, "fitting_or_simulation_performed": False,
                        "new_protocol_registered": False, "scientific_eligibility_decisions_made": False,
                        "target_numeric_validity_checked": False},
              "counts": {"expected_artifacts": 110, "received_artifacts": received, "expected_units": 36,
                         "units_reported": len(units), "metadata_verified_artifacts": sum(row["status"] == "VERIFIED" for row in artifacts)},
              "artifacts": artifacts, "units": units,
              "limits": {"hard_discrepancy_bounds": "NOT_SUPPLIED", "primary_source_rights": "UNRESOLVED",
                         "checkpoint_verification": "NOT_PERFORMED", "historical_outcomes": "PREVIOUSLY_STUDIED",
                         "record_presence": "STRUCTURAL_ONLY_NOT_NUMERICAL_COMPLETENESS",
                         "interpretation": "CUSTODY_AND_METADATA_ONLY_NOT_PHYSICAL_VALIDATION"}}
    validate_public_report(report)
    report["content_sha256"] = sha256(canonical_bytes(report))
    return report


def _keys(value, keys):
    if not isinstance(value, dict) or set(value) != set(keys):
        raise CustodyError("PUBLIC_SCHEMA_CONFLICT")


def validate_public_report(report):
    """Reject additions at every output mapping; arbitrary metadata is never copied."""
    if isinstance(report, dict) and "content_sha256" in report:
        report = dict(report)
        expected = report.pop("content_sha256")
        if expected != sha256(canonical_bytes(report)):
            raise CustodyError("PUBLIC_SEAL_CONFLICT")
    _keys(report, {"schema", "repository", "commit", "inventory_sha256", "status", "scope", "counts", "artifacts", "units", "limits"})
    _keys(report["scope"], {"target_bearing_source_bytes_acquired", "mixed_source_json_decoded", "targets_withheld_from_researcher_output", "fully_blinded_research_claim", "upstream_loaders_executed", "fitting_or_simulation_performed", "new_protocol_registered", "scientific_eligibility_decisions_made", "target_numeric_validity_checked"})
    if any(type(x) is not bool for x in report["scope"].values()):
        raise CustodyError("PUBLIC_SCHEMA_CONFLICT")
    for field in report["scope"]:
        if field not in {"target_bearing_source_bytes_acquired", "mixed_source_json_decoded"}:
            expected = field == "targets_withheld_from_researcher_output"
            if report["scope"][field] is not expected:
                raise CustodyError("PUBLIC_SCOPE_CONFLICT")
    _keys(report["counts"], {"expected_artifacts", "received_artifacts", "expected_units", "units_reported", "metadata_verified_artifacts"})
    _keys(report["limits"], {"hard_discrepancy_bounds", "primary_source_rights", "checkpoint_verification", "historical_outcomes", "record_presence", "interpretation"})
    if (len(report["artifacts"]) != 110 or [row.get("path") for row in report["artifacts"]] != list(expected_paths())
            or len(report["units"]) != 36
            or [(row.get("material"), row.get("model_id")) for row in report["units"]] != [(m, p) for m in MATERIALS for p in MODELS]
            or report["counts"]["expected_artifacts"] != 110 or report["counts"]["expected_units"] != 36 or report["counts"]["units_reported"] != 36):
        raise CustodyError("PUBLIC_UNIVERSE_CONFLICT")
    for artifact in report["artifacts"]:
        _keys(artifact, {"path", "expected_git_blob_sha1", "expected_bytes", "received_sha256", "received_bytes", "status", "metadata"})
        if artifact["path"] not in expected_paths() or artifact["status"] not in FILE_STATUSES:
            raise CustodyError("PUBLIC_SCHEMA_CONFLICT")
        meta = artifact["metadata"]
        if meta is None:
            continue
        if meta["kind"] == "run":
            _keys(meta, {"kind", "material", "structure", "model_id", "device", "calculator_version_field_present", "geometry_source", "lattice_record_present", "vacancy_record_present", "surface_record_counts", "numeric_geometry_exported", "conditions_status"})
            _keys(meta["surface_record_counts"], {"100", "111", "110"})
            if meta["numeric_geometry_exported"] is not False:
                raise CustodyError("PUBLIC_SCOPE_CONFLICT")
        elif meta["kind"] == "evidence":
            _keys(meta, {"kind", "material", "model_id", "backend", "device", "calculator_version_field_present", "input_hash_field_present", "input_hash_format_valid", "properties"})
            _keys(meta["properties"], PROPERTIES)
            for row in meta["properties"].values():
                _keys(row, {"record_count", "unit_status", "record_status"})
        elif meta["kind"] == "reference":
            _keys(meta, {"kind", "family", "entries"})
            for row in meta["entries"]:
                _keys(row, {"ordinal", "material", "structure", "property", "unit_status", "method", "citation_field_present", "source_locator_field_present", "notes_field_present", "primary_source_identity_status", "reference_uncertainty_status", "conditions_status"})
        else:
            raise CustodyError("PUBLIC_SCHEMA_CONFLICT")
    for unit in report["units"]:
        _keys(unit, {"material", "structure", "model_id", "artifact_paths", "gates", "checkpoint", "properties", "numerical_target_completeness_checked", "eligibility_decision", "split_assigned"})
        _keys(unit["gates"], {"archive_integrity_and_schema", "symbolic_triple_identity", "declared_input_hash_agreement", "checkpoint_identity", "primary_source_rights", "reference_conditions_and_uncertainty", "fixed_fcc_map_source", "physical_discrepancy_bounds", "scientific_common_field_support", "multiple_same_block_heldout_candidates"})
        if any(value not in GATE_STATUSES for value in unit["gates"].values()):
            raise CustodyError("PUBLIC_SCHEMA_CONFLICT")
        fixed_gates = {"checkpoint_identity": "UNKNOWN", "primary_source_rights": "UNKNOWN",
                       "reference_conditions_and_uncertainty": "UNKNOWN", "fixed_fcc_map_source": "PASS",
                       "physical_discrepancy_bounds": "UNSUPPORTED", "scientific_common_field_support": "UNKNOWN",
                       "multiple_same_block_heldout_candidates": "UNKNOWN"}
        if any(unit["gates"][field] != expected for field, expected in fixed_gates.items()):
            raise CustodyError("PUBLIC_SCOPE_CONFLICT")
        if (unit["structure"] != "fcc" or unit["artifact_paths"] != list(triple_paths(unit["material"], unit["model_id"]))
                or [row.get("name") for row in unit["properties"]] != list(PROPERTIES)):
            raise CustodyError("PUBLIC_UNIVERSE_CONFLICT")
        _keys(unit["checkpoint"], {"declared_digest_available_in_reviewed_schema", "checkpoint_bytes_verified"})
        if any(value is not False for value in unit["checkpoint"].values()) or unit["numerical_target_completeness_checked"] is not False or unit["split_assigned"] is not False:
            raise CustodyError("PUBLIC_SCOPE_CONFLICT")
        for row in unit["properties"]:
            _keys(row, {"name", "unit", "unbound_record_count", "bound_record_count", "reference_candidates", "reference_match_status", "reference_choice_made", "facet_jurisdiction", "jurisdiction_reason"})
            for ref in row["reference_candidates"]:
                _keys(ref, {"path", "ordinal", "method", "unit_status"})
            if row["reference_choice_made"] is not False:
                raise CustodyError("PUBLIC_SCOPE_CONFLICT")
    _validate_public_leaves(report)


@memoize
def _public_rules():
    # Every public scalar belongs to a closed field-specific vocabulary. Only
    # complete-artifact seals have an open (hexadecimal) string grammar.
    strings = {
        "schema": {"lupine.discovery.projection_custody.v1"}, "repository": {REPOSITORY}, "commit": {COMMIT},
        "inventory_sha256": {INVENTORY_SHA256}, "status": FILE_STATUSES|{"METADATA_COMPLETE", "METADATA_INCOMPLETE"},
        "path": set(expected_paths()), "artifact_paths": set(expected_paths()), "kind": {"run", "evidence", "reference"},
        "material": set(MATERIALS), "structure": set(STRUCTURES), "model_id": set(MODELS), "backend": {"ase", "torchsim", "lammps"},
        "device": {"cpu", "cuda"}, "geometry_source": {"MODEL_STATICS_COMPANION"}, "conditions_status": {"UNKNOWN"},
        "unit_status": {"PASS", "UNKNOWN", "CONFLICT"}, "record_status": {"MISSING", "SINGLE", "DUPLICATE"}, "family": {"surface_energies", "vacancy_formation"},
        "property": set(PROPERTIES), "name": set(PROPERTIES), "method": set(METHODS), "unit": {"eV", "J/m^2"},
        "primary_source_identity_status": {"UNKNOWN"}, "reference_uncertainty_status": {"UNKNOWN"},
        "reference_match_status": {"PASS", "UNKNOWN", "REVIEW_REQUIRED"}, "facet_jurisdiction": {"UNKNOWN", "REVIEW_REQUIRED"},
        "jurisdiction_reason": {"README_RECONSTRUCTED_TERMINATION", "CONDITIONS_NOT_ESTABLISHED"},
        "eligibility_decision": {"NOT_MADE"}, "hard_discrepancy_bounds": {"NOT_SUPPLIED"},
        "primary_source_rights": {"UNKNOWN", "UNRESOLVED"}, "checkpoint_verification": {"NOT_PERFORMED"},
        "historical_outcomes": {"PREVIOUSLY_STUDIED"}, "record_presence": {"STRUCTURAL_ONLY_NOT_NUMERICAL_COMPLETENESS"},
        "interpretation": {"CUSTODY_AND_METADATA_ONLY_NOT_PHYSICAL_VALIDATION"}}
    gate_keys = {"archive_integrity_and_schema", "symbolic_triple_identity", "declared_input_hash_agreement", "checkpoint_identity",
                 "reference_conditions_and_uncertainty", "fixed_fcc_map_source", "physical_discrepancy_bounds",
                 "scientific_common_field_support", "multiple_same_block_heldout_candidates"}
    bool_keys = {"target_bearing_source_bytes_acquired", "mixed_source_json_decoded", "targets_withheld_from_researcher_output",
                 "fully_blinded_research_claim", "upstream_loaders_executed", "fitting_or_simulation_performed", "new_protocol_registered",
                 "scientific_eligibility_decisions_made", "target_numeric_validity_checked", "calculator_version_field_present",
                 "input_hash_field_present", "input_hash_format_valid", "lattice_record_present", "vacancy_record_present",
                 "numeric_geometry_exported", "citation_field_present", "source_locator_field_present", "notes_field_present",
                 "declared_digest_available_in_reviewed_schema", "checkpoint_bytes_verified", "numerical_target_completeness_checked",
                 "split_assigned", "reference_choice_made"}
    int_keys = {"expected_artifacts", "received_artifacts", "expected_units", "units_reported", "metadata_verified_artifacts",
                "expected_bytes", "received_bytes", "record_count", "ordinal", "unbound_record_count", "bound_record_count", "100", "111", "110"}
    nullable = {"metadata", "received_sha256", "received_bytes", "material", "structure", "model_id", "backend", "device",
                "family", "property", "method", "unbound_record_count", "bound_record_count"}
    return strings, gate_keys, bool_keys, int_keys, nullable


def _validate_public_leaves(value, key=None):
    strings, gate_keys, bool_keys, int_keys, nullable = _public_rules()
    if key == "artifact_paths":
        if not isinstance(value, list) or any(not isinstance(child, str) or child not in strings[key] for child in value):
            raise CustodyError("PUBLIC_SCALAR_INVALID")
        return
    scalar = key in strings or key in gate_keys or key in bool_keys or key in int_keys or key in {"expected_git_blob_sha1", "received_sha256"}
    if scalar and isinstance(value, (dict, list)):
        raise CustodyError("PUBLIC_SCALAR_INVALID")
    if isinstance(value, dict):
        for child_key, child in value.items():
            _validate_public_leaves(child, child_key)
    elif isinstance(value, list):
        for child in value:
            _validate_public_leaves(child, key)
    elif value is None:
        if key not in nullable:
            raise CustodyError("PUBLIC_SCALAR_INVALID")
    elif key in bool_keys:
        if type(value) is not bool:
            raise CustodyError("PUBLIC_SCALAR_INVALID")
    elif key in int_keys:
        if type(value) is not int or not 0 <= value <= MAX_FILE_BYTES+1:
            raise CustodyError("PUBLIC_SCALAR_INVALID")
    elif key in {"expected_git_blob_sha1", "received_sha256"}:
        if _sha(value, 40 if key == "expected_git_blob_sha1" else 64) is None:
            raise CustodyError("PUBLIC_SCALAR_INVALID")
    elif key in gate_keys:
        if _member(value, GATE_STATUSES) is None:
            raise CustodyError("PUBLIC_SCALAR_INVALID")
    elif key not in strings or _member(value, strings[key]) is None:
        raise CustodyError("PUBLIC_SCALAR_INVALID")


def cache_root(path=None):
    root = ROOT.resolve()
    cache_parent = root/".cache"
    literal_base = cache_parent/"projection-custody"
    if cache_parent.resolve() != cache_parent or literal_base.resolve() != literal_base:
        raise CustodyError("CACHE_PATH_INVALID")
    base = literal_base
    requested = Path(path) if path is not None else base/COMMIT
    if requested.is_symlink():
        raise CustodyError("CACHE_PATH_INVALID")
    resolved = requested.resolve()
    if resolved == base or base not in resolved.parents:
        raise CustodyError("CACHE_PATH_INVALID")
    return resolved


def _object_path(cache, spec):
    path = cache/"objects"/(spec.git_blob_sha1+".json")
    if path.is_symlink() or cache not in path.resolve().parents:
        raise CustodyError("CACHE_PATH_INVALID")
    return path


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise CustodyError("NETWORK_REDIRECT_REJECTED")


def _fetch(spec):
    url = f"https://raw.githubusercontent.com/{REPOSITORY}/{COMMIT}/{spec.path}"
    request = Request(url, headers={"User-Agent": "Lupine-Projection-Custody/1"})
    with build_opener(_NoRedirect).open(request, timeout=30) as response:
        return response.read(spec.size+1)


def acquire_to_cache(specs, path=None, *, fetch=None):
    """Only called explicitly. Network fetcher has one fixed ArtifactSpec argument."""
    indexed = validate_specs(specs)
    cache = cache_root(path)
    statuses = {}
    received = 0
    for name in expected_paths():
        spec = indexed[name]
        destination = _object_path(cache, spec)
        try:
            if destination.exists():
                with destination.open("rb") as handle:
                    raw = handle.read(spec.size+1)
            else:
                raw = (fetch or _fetch)(spec)
            received += isinstance(raw, bytes)
            if not isinstance(raw, bytes) or len(raw) != spec.size:
                statuses[name] = "SIZE_MISMATCH"
                continue
            if git_blob_sha1(raw) != spec.git_blob_sha1:
                statuses[name] = "BLOB_MISMATCH"
                continue
            if not destination.exists():
                destination.parent.mkdir(parents=True, exist_ok=True)
                with destination.open("xb") as handle:
                    handle.write(raw)
            statuses[name] = "VERIFIED"
        except CustodyError:
            statuses[name] = "ACQUISITION_FAILED"
        except Exception:
            # Network/OS errors can include URLs, body excerpts and local data.
            statuses[name] = "ACQUISITION_FAILED"
    return {"schema": "lupine.discovery.projection_acquisition.v1", "commit": COMMIT,
            "target_bearing_source_bytes_requested": True, "target_bearing_source_bytes_received": bool(received),
            "captured_artifact_count": received, "mixed_source_json_decoded": False, "file_statuses": statuses}


def extract_cache(specs, path=None):
    cache = cache_root(path)
    captured = {}
    for spec in validate_specs(specs).values():
        try:
            object_path = _object_path(cache, spec)
            if object_path.exists():
                with object_path.open("rb") as handle:
                    captured[spec.path] = handle.read(spec.size+1)
        except (OSError, CustodyError):
            captured[spec.path] = False
    return extract_files(specs, captured)


def write_public(report, path):
    if report.get("schema") == "lupine.discovery.projection_custody.v1":
        validate_public_report(report)
    elif report.get("schema") == "lupine.discovery.projection_acquisition.v1":
        _keys(report, {"schema", "commit", "target_bearing_source_bytes_requested", "target_bearing_source_bytes_received",
                       "captured_artifact_count", "mixed_source_json_decoded", "file_statuses"})
        if (report["commit"] != COMMIT or report["target_bearing_source_bytes_requested"] is not True
                or type(report["target_bearing_source_bytes_received"]) is not bool
                or report["mixed_source_json_decoded"] is not False
                or type(report["captured_artifact_count"]) is not int or not 0 <= report["captured_artifact_count"] <= 110
                or set(report["file_statuses"]) != set(expected_paths())
                or any(status not in {"VERIFIED", "SIZE_MISMATCH", "BLOB_MISMATCH", "ACQUISITION_FAILED"} for status in report["file_statuses"].values())):
            raise CustodyError("PUBLIC_SCHEMA_CONFLICT")
    else:
        raise CustodyError("PUBLIC_SCHEMA_CONFLICT")
    path = Path(path)
    payload = canonical_bytes(report)
    if path.exists() and path.read_bytes() != payload:
        raise CustodyError("PUBLIC_OUTPUT_EXISTS_WITH_DIFFERENT_BYTES")
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        with path.open("xb") as handle:
            handle.write(payload)


class _Parser(argparse.ArgumentParser):
    def error(self, message):
        raise CustodyError("CLI_ARGUMENT_INVALID")


def main(argv=None):
    parser = _Parser(description=__doc__)
    parser.add_argument("action", choices=("acquire", "extract"))
    parser.add_argument("--cache", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    try:
        args = parser.parse_args(argv)
        specs = load_inventory()
        result = acquire_to_cache(specs, args.cache) if args.action == "acquire" else extract_cache(specs, args.cache)
        write_public(result, args.output)
        print(json.dumps({"status": result.get("status", "ACQUISITION_RECORDED"), "receipt_sha256": sha256(canonical_bytes(result))}, sort_keys=True))
        return 0 if (result.get("status") == "METADATA_COMPLETE" or (args.action == "acquire" and all(x == "VERIFIED" for x in result["file_statuses"].values()))) else 2
    except CustodyError as exc:
        reason = str(exc) if str(exc) in PUBLIC_ERRORS else "CUSTODY_FAILURE"
        print(json.dumps({"status": "BLOCKED", "reason": reason}, sort_keys=True))
        return 2
    except Exception:
        print('{"reason":"CUSTODY_INTERNAL_FAILURE","status":"BLOCKED"}')
        return 2


if __name__ == "__main__":
    sys.exit(main())
