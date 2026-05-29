#!/usr/bin/env python3
"""Validate and publish the MLIP long-horizon demo registry.

The registry is intentionally a no-mock bridge between two lanes:

* scientific Distill artifacts, owned by the runner / atlas-distill stack
* viewer artifacts, owned by the Live Lab / viewer stack

Planned demos are allowed, but they must remain explicit non-claims until real
measured artifacts exist for the same protocol.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import pathlib
import sys
from datetime import datetime, timezone
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_REGISTRY = ROOT / "data" / "mlip_benchmarks" / "mlip_long_demo_registry.json"
DEFAULT_VIEWER_OUTPUT = (
    ROOT
    / "library-site"
    / "src"
    / "reports"
    / "assets"
    / "mlip"
    / "mlip-long-demo-registry.json"
)
SCHEMA = "lupine.mlip.long_demo_registry.v1"
VALIDATION_SCHEMA = "lupine.mlip.long_demo_registry.validation.v1"
REQUIRED_WORKSTREAMS = ("scientific_distill", "viewer")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def write_text_lf(path: pathlib.Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


def load_json(path: pathlib.Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"expected JSON object in {path}")
    return payload


def stable_hash(payload: dict[str, Any]) -> str:
    data = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return "sha256:" + hashlib.sha256(data).hexdigest()


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def is_nonempty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def measured_artifacts(stream: dict[str, Any]) -> list[dict[str, Any]]:
    return [item for item in as_list(stream.get("measured_artifacts")) if isinstance(item, dict)]


def validate_registry(registry: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []

    if registry.get("schema") != SCHEMA:
        errors.append(f"schema must be {SCHEMA}")

    claim_policy = registry.get("claim_policy")
    if not isinstance(claim_policy, dict):
        errors.append("claim_policy is required")
        claim_policy = {}
    if claim_policy.get("mock_or_placeholder_allowed") is not False:
        errors.append("mock_or_placeholder_allowed must be false")
    if claim_policy.get("scientific_claim_allowed_without_measured_artifacts") is not False:
        errors.append("scientific claims without measured artifacts must be disabled")
    if claim_policy.get("viewer_claim_allowed_without_measured_artifacts") is not False:
        errors.append("viewer claims without measured artifacts must be disabled")

    shared_variants = set(as_list(registry.get("shared_variants")))
    for required in ("baseline", "distill_accuracy"):
        if required not in shared_variants:
            errors.append(f"shared_variants must include {required}")

    viewer_contracts = set(as_list(registry.get("viewer_artifact_contracts")))
    if "lupine.mlip.equilibrium_viewer.v1" not in viewer_contracts:
        errors.append("viewer_artifact_contracts must include lupine.mlip.equilibrium_viewer.v1")

    workstream_contract = registry.get("workstream_contract")
    if not isinstance(workstream_contract, dict):
        errors.append("workstream_contract is required")
        workstream_contract = {}
    for stream_id in REQUIRED_WORKSTREAMS:
        stream = workstream_contract.get(stream_id)
        if not isinstance(stream, dict):
            errors.append(f"workstream_contract.{stream_id} is required")
            continue
        if not is_nonempty_string(stream.get("responsibility")):
            errors.append(f"workstream_contract.{stream_id}.responsibility is required")
        if not as_list(stream.get("must_emit")):
            errors.append(f"workstream_contract.{stream_id}.must_emit must be non-empty")

    demos = as_list(registry.get("demos"))
    if len(demos) < 3:
        errors.append("at least three long-horizon demos are required")

    seen_ids: set[str] = set()
    measured_demo_count = 0
    for index, demo in enumerate(demos):
        if not isinstance(demo, dict):
            errors.append(f"demos[{index}] must be an object")
            continue
        demo_id = demo.get("id")
        if not is_nonempty_string(demo_id):
            errors.append(f"demos[{index}].id is required")
            demo_id = f"demos[{index}]"
        elif demo_id in seen_ids:
            errors.append(f"duplicate demo id: {demo_id}")
        seen_ids.add(str(demo_id))

        for key in ("title", "demo_class", "primary_material_id", "why_we_care"):
            if not is_nonempty_string(demo.get(key)):
                errors.append(f"{demo_id}.{key} is required")

        reference_plan = demo.get("reference_plan")
        if not isinstance(reference_plan, dict):
            errors.append(f"{demo_id}.reference_plan is required")
            reference_plan = {}
        if not as_list(reference_plan.get("preferred_sources")):
            errors.append(f"{demo_id}.reference_plan.preferred_sources must be non-empty")

        claim_gate = demo.get("claim_gate")
        if not isinstance(claim_gate, dict):
            errors.append(f"{demo_id}.claim_gate is required")
            claim_gate = {}

        stream_artifacts: dict[str, list[dict[str, Any]]] = {}
        for stream_id in REQUIRED_WORKSTREAMS:
            stream = demo.get(stream_id)
            if not isinstance(stream, dict):
                errors.append(f"{demo_id}.{stream_id} is required")
                stream = {}
            if not is_nonempty_string(stream.get("status")):
                errors.append(f"{demo_id}.{stream_id}.status is required")
            if not as_list(stream.get("required_artifact_schemas")):
                errors.append(f"{demo_id}.{stream_id}.required_artifact_schemas must be non-empty")
            if stream_id == "viewer":
                for schema in as_list(stream.get("required_artifact_schemas")):
                    if schema not in viewer_contracts:
                        warnings.append(f"{demo_id}.viewer requires non-viewer registry contract {schema}")
                if not as_list(stream.get("visual_requirements")):
                    errors.append(f"{demo_id}.viewer.visual_requirements must be non-empty")
            if stream_id == "scientific_distill":
                if not as_list(stream.get("primary_metrics")):
                    errors.append(f"{demo_id}.scientific_distill.primary_metrics must be non-empty")
                if not as_list(stream.get("hyperribbon_questions")):
                    errors.append(f"{demo_id}.scientific_distill.hyperribbon_questions must be non-empty")
            artifacts = measured_artifacts(stream)
            stream_artifacts[stream_id] = artifacts
            for artifact in artifacts:
                if not is_nonempty_string(artifact.get("uri")):
                    errors.append(f"{demo_id}.{stream_id}.measured_artifacts entry missing uri")
                if artifact.get("placeholder") is True or artifact.get("mock") is True:
                    errors.append(f"{demo_id}.{stream_id}.measured_artifacts cannot contain mock/placeholder artifacts")
                if not is_nonempty_string(artifact.get("schema")):
                    errors.append(f"{demo_id}.{stream_id}.measured_artifacts entry missing schema")

        has_science = bool(stream_artifacts["scientific_distill"])
        has_viewer = bool(stream_artifacts["viewer"])
        if has_science or has_viewer:
            measured_demo_count += 1

        scientific_claim = claim_gate.get("scientific_claim_allowed") is True
        viewer_claim = claim_gate.get("viewer_claim_allowed") is True
        reference_locked = reference_plan.get("reference_values_locked") is True
        if scientific_claim and (not has_science or not reference_locked):
            errors.append(f"{demo_id} scientific claim requires measured science artifacts and locked references")
        if viewer_claim and not has_viewer:
            errors.append(f"{demo_id} viewer claim requires measured viewer artifacts")
        if not has_science and scientific_claim:
            errors.append(f"{demo_id} cannot claim science without measured_artifacts")
        if not has_viewer and viewer_claim:
            errors.append(f"{demo_id} cannot claim viewer readiness without measured_artifacts")
        if not has_science and claim_gate.get("scientific_claim_allowed") is not False:
            errors.append(f"{demo_id}.claim_gate.scientific_claim_allowed must be false until measured")
        if not has_viewer and claim_gate.get("viewer_claim_allowed") is not False:
            errors.append(f"{demo_id}.claim_gate.viewer_claim_allowed must be false until measured")

    status = "passed" if not errors else "failed"
    return {
        "schema": VALIDATION_SCHEMA,
        "validated_at": utc_now(),
        "status": status,
        "registry_id": registry.get("registry_id"),
        "registry_hash": stable_hash(registry),
        "demos_total": len(demos),
        "measured_demo_count": measured_demo_count,
        "claim_policy": {
            "mock_or_placeholder_allowed": claim_policy.get("mock_or_placeholder_allowed"),
            "universal_manifold_claim_allowed": claim_policy.get("universal_manifold_claim_allowed"),
        },
        "errors": errors,
        "warnings": warnings,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate the Lupine MLIP long-demo registry")
    parser.add_argument("--registry", type=pathlib.Path, default=DEFAULT_REGISTRY)
    parser.add_argument("--viewer-output", type=pathlib.Path, default=None)
    parser.add_argument("--emit-viewer-manifest", action="store_true")
    parser.add_argument("--fail-on-validation-error", action="store_true")
    parser.add_argument("--stdout", action="store_true", help="Print the canonical registry JSON after validation")
    args = parser.parse_args(argv)

    registry = load_json(args.registry)
    validation = validate_registry(registry)
    if args.emit_viewer_manifest:
        output = args.viewer_output or DEFAULT_VIEWER_OUTPUT
        write_text_lf(output, json.dumps(registry, indent=2, sort_keys=False) + "\n")
    if args.stdout:
        print(json.dumps(registry, indent=2, sort_keys=False))
    else:
        print(json.dumps(validation, indent=2, sort_keys=True))
    if args.fail_on_validation_error and validation["status"] != "passed":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
