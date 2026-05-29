#!/usr/bin/env python3
"""Validate and publish demo-specific ribbon prep for long MLIP runs."""

from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import sys
from datetime import datetime, timezone
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
TOOLS_DIR = ROOT / "tools"
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

import mlip_long_demo_registry as demo_registry  # noqa: E402

DEFAULT_PREP = ROOT / "data" / "mlip_benchmarks" / "mlip_long_demo_ribbon_prep.json"
DEFAULT_VIEWER_OUTPUT = (
    ROOT
    / "library-site"
    / "src"
    / "reports"
    / "assets"
    / "mlip"
    / "mlip-long-demo-ribbon-prep.json"
)
SCHEMA = "lupine.distill.long_demo_ribbon_prep.v1"
VALIDATION_SCHEMA = "lupine.distill.long_demo_ribbon_prep.validation.v1"
REQUIRED_RIBBON_FIELDS = (
    "demo_id",
    "ribbon_id",
    "status",
    "material_id",
    "science_contract",
    "ribbon_policy",
    "run_plan",
    "viewer_contract",
)
REQUIRED_SCIENCE_FIELDS = (
    "primary_question",
    "reference_lock",
    "support_plan",
    "allowed_correction_coordinates",
    "stiff_axes_to_preserve",
    "primary_metrics",
    "acceptance_gate",
    "refusal_triggers",
    "theorem_hooks",
)
REQUIRED_VIEWER_FIELDS = (
    "status",
    "scene_rule",
    "required_layers",
    "blocked_layers_until_reference_lock",
    "artifact_schemas",
)
REQUIRED_THEOREM_HOOKS = {
    "stiff_axis_preservation",
    "orthogonal_complement_lift",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def load_json(path: pathlib.Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"expected object JSON in {path}")
    return payload


def write_text_lf(path: pathlib.Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


def stable_hash(payload: dict[str, Any]) -> str:
    data = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return "sha256:" + hashlib.sha256(data).hexdigest()


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def is_nonempty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and value == value and value not in (float("inf"), float("-inf"))


def validate_ribbon_prep(prep: dict[str, Any], registry: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []

    if prep.get("schema") != SCHEMA:
        errors.append(f"schema must be {SCHEMA}")

    registry_validation = demo_registry.validate_registry(registry)
    if registry_validation["status"] != "passed":
        errors.append("linked long-demo registry must pass validation")

    registry_id = registry.get("registry_id")
    if prep.get("registry_id") != registry_id:
        errors.append("prep.registry_id must match linked registry")

    claim_policy = prep.get("claim_policy")
    if not isinstance(claim_policy, dict):
        errors.append("claim_policy is required")
        claim_policy = {}
    for key in (
        "active_correction_requires_reference_lock",
        "shadow_mode_before_reference_lock",
        "mock_or_placeholder_allowed",
        "viewer_may_render_planned_scene",
        "universal_claim_allowed",
    ):
        if key not in claim_policy:
            errors.append(f"claim_policy.{key} is required")
    if claim_policy.get("mock_or_placeholder_allowed") is not False:
        errors.append("claim_policy.mock_or_placeholder_allowed must be false")
    if claim_policy.get("viewer_may_render_planned_scene") is not False:
        errors.append("viewer_may_render_planned_scene must be false")
    if claim_policy.get("universal_claim_allowed") is not False:
        errors.append("universal_claim_allowed must be false")

    registry_demos = {
        str(demo["id"]): demo
        for demo in as_list(registry.get("demos"))
        if isinstance(demo, dict) and is_nonempty_string(demo.get("id"))
    }
    ribbons = as_list(prep.get("ribbons"))
    prep_ids: set[str] = set()
    shadow_ready = 0
    reference_blocked = 0

    if len(ribbons) != len(registry_demos):
        errors.append("prep must define exactly one ribbon for every long-demo registry item")

    for index, ribbon in enumerate(ribbons):
        if not isinstance(ribbon, dict):
            errors.append(f"ribbons[{index}] must be an object")
            continue
        for field in REQUIRED_RIBBON_FIELDS:
            if field not in ribbon:
                errors.append(f"ribbons[{index}].{field} is required")

        demo_id = str(ribbon.get("demo_id") or f"ribbons[{index}]")
        if demo_id not in registry_demos:
            errors.append(f"{demo_id} does not exist in linked demo registry")
        if demo_id in prep_ids:
            errors.append(f"duplicate ribbon prep demo_id: {demo_id}")
        prep_ids.add(demo_id)

        if not is_nonempty_string(ribbon.get("ribbon_id")):
            errors.append(f"{demo_id}.ribbon_id is required")
        if not str(ribbon.get("ribbon_id", "")).startswith("hyperribbon-long-"):
            errors.append(f"{demo_id}.ribbon_id must use the hyperribbon-long- prefix")

        status = str(ribbon.get("status") or "")
        if "ready_for_local_shadow_run" in status:
            shadow_ready += 1
        if "reference_required" in status:
            reference_blocked += 1

        science = ribbon.get("science_contract")
        if not isinstance(science, dict):
            errors.append(f"{demo_id}.science_contract must be an object")
            science = {}
        for field in REQUIRED_SCIENCE_FIELDS:
            if field not in science:
                errors.append(f"{demo_id}.science_contract.{field} is required")

        reference_lock = science.get("reference_lock")
        if not isinstance(reference_lock, dict):
            errors.append(f"{demo_id}.science_contract.reference_lock must be an object")
            reference_lock = {}
        if reference_lock.get("required_before_active_correction") is not True:
            errors.append(f"{demo_id} must require reference lock before active correction")
        if not as_list(reference_lock.get("required_sources")):
            errors.append(f"{demo_id} must list required reference sources")
        if not as_list(reference_lock.get("blocked_until_locked")):
            errors.append(f"{demo_id} must list blocked actions until reference lock")

        support = science.get("support_plan")
        if not isinstance(support, dict):
            errors.append(f"{demo_id}.science_contract.support_plan must be an object")
            support = {}
        if not is_nonempty_string(support.get("leakage_guard")):
            errors.append(f"{demo_id}.support_plan.leakage_guard is required")
        if not isinstance(support.get("minimum_support_cases"), int) or support.get("minimum_support_cases") < 8:
            errors.append(f"{demo_id}.support_plan.minimum_support_cases must be at least 8")

        for list_field in (
            "allowed_correction_coordinates",
            "stiff_axes_to_preserve",
            "primary_metrics",
            "refusal_triggers",
            "theorem_hooks",
        ):
            if not as_list(science.get(list_field)):
                errors.append(f"{demo_id}.science_contract.{list_field} must be non-empty")

        theorem_hooks = set(as_list(science.get("theorem_hooks")))
        missing_hooks = sorted(REQUIRED_THEOREM_HOOKS - theorem_hooks)
        if missing_hooks:
            errors.append(f"{demo_id}.theorem_hooks missing {', '.join(missing_hooks)}")

        acceptance = science.get("acceptance_gate")
        if not isinstance(acceptance, dict):
            errors.append(f"{demo_id}.science_contract.acceptance_gate must be an object")
            acceptance = {}
        for numeric_key in (
            "min_paired_accuracy_lift_fraction",
            "max_stiff_axis_drift_fraction",
            "max_intervention_rate",
        ):
            if not is_number(acceptance.get(numeric_key)):
                errors.append(f"{demo_id}.acceptance_gate.{numeric_key} must be finite numeric")

        policy = ribbon.get("ribbon_policy")
        if not isinstance(policy, dict):
            errors.append(f"{demo_id}.ribbon_policy must be an object")
            policy = {}
        if policy.get("ribbon_version") != ribbon.get("ribbon_id"):
            errors.append(f"{demo_id}.ribbon_policy.ribbon_version must match ribbon_id")
        if policy.get("projected_ribbon_enabled") is not True:
            errors.append(f"{demo_id}.ribbon_policy.projected_ribbon_enabled must be true for these long-demo ribbons")
        for numeric_key in (
            "max_energy_bias_ev_per_atom",
            "energy_correction_scale",
            "min_support_lift_fraction",
            "max_support_eval_distance_proxy",
            "max_stiff_axis_drift_fraction",
            "min_complement_residual_fraction",
            "max_projection_distance_proxy",
            "min_projected_support_lift_fraction",
        ):
            if not is_number(policy.get(numeric_key)):
                errors.append(f"{demo_id}.ribbon_policy.{numeric_key} must be finite numeric")

        run_plan = ribbon.get("run_plan")
        if not isinstance(run_plan, dict):
            errors.append(f"{demo_id}.run_plan must be an object")
            run_plan = {}
        for phase in ("phase_0_preflight", "phase_1_local_pair", "phase_2_cloud"):
            if not as_list(run_plan.get(phase)):
                errors.append(f"{demo_id}.run_plan.{phase} must be non-empty")

        viewer = ribbon.get("viewer_contract")
        if not isinstance(viewer, dict):
            errors.append(f"{demo_id}.viewer_contract must be an object")
            viewer = {}
        for field in REQUIRED_VIEWER_FIELDS:
            if field not in viewer:
                errors.append(f"{demo_id}.viewer_contract.{field} is required")
        if not as_list(viewer.get("required_layers")):
            errors.append(f"{demo_id}.viewer_contract.required_layers must be non-empty")
        if not as_list(viewer.get("artifact_schemas")):
            errors.append(f"{demo_id}.viewer_contract.artifact_schemas must be non-empty")
        if "measured" not in str(viewer.get("scene_rule", "")).lower():
            errors.append(f"{demo_id}.viewer_contract.scene_rule must state measured rendering")

        registry_viewer_schemas = set(as_list(registry_demos.get(demo_id, {}).get("viewer", {}).get("required_artifact_schemas")))
        prep_viewer_schemas = set(as_list(viewer.get("artifact_schemas")))
        if registry_viewer_schemas and not prep_viewer_schemas.intersection(registry_viewer_schemas):
            warnings.append(f"{demo_id}.viewer_contract has no schema overlap with registry viewer stream")

    missing_prep = sorted(set(registry_demos) - prep_ids)
    if missing_prep:
        errors.append("missing ribbon prep for demos: " + ", ".join(missing_prep))

    status = "passed" if not errors else "failed"
    return {
        "schema": VALIDATION_SCHEMA,
        "validated_at": utc_now(),
        "status": status,
        "prep_id": prep.get("prep_id"),
        "prep_hash": stable_hash(prep),
        "registry_id": registry_id,
        "registry_hash": stable_hash(registry),
        "ribbons_total": len(ribbons),
        "shadow_ready_ribbons": shadow_ready,
        "reference_blocked_ribbons": reference_blocked,
        "errors": errors,
        "warnings": warnings,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate and publish long-demo ribbon prep")
    parser.add_argument("--prep", type=pathlib.Path, default=DEFAULT_PREP)
    parser.add_argument("--registry", type=pathlib.Path, default=demo_registry.DEFAULT_REGISTRY)
    parser.add_argument("--viewer-output", type=pathlib.Path, default=None)
    parser.add_argument("--emit-viewer-manifest", action="store_true")
    parser.add_argument("--fail-on-validation-error", action="store_true")
    parser.add_argument("--stdout", action="store_true", help="Print the prep JSON instead of the validation result")
    args = parser.parse_args(argv)

    prep = load_json(args.prep)
    registry = load_json(args.registry)
    validation = validate_ribbon_prep(prep, registry)
    if args.emit_viewer_manifest:
        output = args.viewer_output or DEFAULT_VIEWER_OUTPUT
        write_text_lf(output, json.dumps(prep, indent=2, sort_keys=False) + "\n")
    if args.stdout:
        print(json.dumps(prep, indent=2, sort_keys=False))
    else:
        print(json.dumps(validation, indent=2, sort_keys=True))
    if args.fail_on_validation_error and validation["status"] != "passed":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
