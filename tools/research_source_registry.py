#!/usr/bin/env python3
"""Validate and inspect Lupine's reusable materials research source registry."""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
import urllib.error
import urllib.request
from collections import Counter
from collections.abc import Iterable
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_REGISTRY = ROOT / "data" / "research_sources" / "materials_research_sources_v1.json"
SCHEMA = "lupine.research.source_registry.v1"
REQUIRED_SOURCE_FIELDS = (
    "source_id",
    "title",
    "source_kind",
    "domains",
    "urls",
    "citation",
    "license",
    "stewardship",
    "capabilities",
    "claim_support",
    "verification",
    "ingestion",
)
REQUIRED_CAPABILITY_FIELDS = (
    "structures",
    "energy",
    "forces",
    "stress",
    "trajectory",
    "temperature",
    "pressure",
    "phase_label",
    "models",
    "benchmark_context",
)
REQUIRED_CLAIM_FIELDS = ("claim_id", "level", "evidence_fields", "guardrail")
REQUIRED_VERIFICATION_FIELDS = ("status", "checked_at", "methods", "evidence")
REQUIRED_INGESTION_FIELDS = ("priority", "status", "adapters", "target_artifacts", "next_action")
LIVE_VERIFIED_STATUSES = {"verified_live", "verified_local", "verified_mixed"}
TEAM_ROLES = {
    "source_inspector": "Resolves source access, license, schema, and row-level provenance before any sampler runs.",
    "sampler_builder": "Builds tiny, provenance-preserving samples without downloading full corpora by default.",
    "claim_guardian": "Checks that evidence fields support only the claims allowed by the registry guardrails.",
    "fixture_builder": "Combines approved source slices into campaign fixtures with separate state and phase fields.",
    "phoenix_reporter": "Surfaces source status, guardrails, and evidence lineage in Phoenix and Lupine.Science.",
}


def load_registry(path: pathlib.Path = DEFAULT_REGISTRY) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError("research source registry must be a JSON object")
    return payload


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _has_text(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _truthy_capability(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return bool(value.strip()) and value.lower() not in {"false", "no", "none"}
    return value is not None


def source_map(registry: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        str(source["source_id"]): source
        for source in _as_list(registry.get("sources"))
        if isinstance(source, dict) and _has_text(source.get("source_id"))
    }


def validate_registry(registry: dict[str, Any]) -> list[str]:
    """Return human-readable validation issues. Empty means the registry passes."""

    issues: list[str] = []
    if registry.get("schema") != SCHEMA:
        issues.append(f"schema must be {SCHEMA}")
    if not _has_text(registry.get("registry_id")):
        issues.append("registry_id is required")
    if not _as_list(registry.get("domains")):
        issues.append("domains must contain at least one domain")
    if not _as_list(registry.get("sources")):
        issues.append("sources must contain at least one source")

    claim_levels = _as_dict(registry.get("claim_levels"))
    if not claim_levels:
        issues.append("claim_levels must be defined")
    adapters = {
        adapter.get("adapter_id")
        for adapter in _as_list(registry.get("ingestion_families"))
        if isinstance(adapter, dict)
    }
    if not adapters:
        issues.append("ingestion_families must define at least one adapter")

    seen_source_ids: set[str] = set()
    claim_ids: set[str] = set()
    for idx, source in enumerate(_as_list(registry.get("sources"))):
        if not isinstance(source, dict):
            issues.append(f"sources[{idx}] must be an object")
            continue
        source_id = str(source.get("source_id") or f"sources[{idx}]")
        if source_id in seen_source_ids:
            issues.append(f"duplicate source_id {source_id}")
        seen_source_ids.add(source_id)
        for field in REQUIRED_SOURCE_FIELDS:
            if field not in source:
                issues.append(f"{source_id}.{field} is required")

        if not _has_text(source.get("title")):
            issues.append(f"{source_id}.title must be text")
        if not _has_text(source.get("source_kind")):
            issues.append(f"{source_id}.source_kind must be text")
        if not _as_list(source.get("domains")) or not all(_has_text(item) for item in _as_list(source.get("domains"))):
            issues.append(f"{source_id}.domains must contain text values")

        for url_idx, url_entry in enumerate(_as_list(source.get("urls"))):
            if not isinstance(url_entry, dict):
                issues.append(f"{source_id}.urls[{url_idx}] must be an object")
                continue
            if not _has_text(url_entry.get("label")) or not _has_text(url_entry.get("url")):
                issues.append(f"{source_id}.urls[{url_idx}] needs label and url")
        if not _as_list(source.get("urls")):
            issues.append(f"{source_id}.urls must contain at least one URL")

        citation = _as_dict(source.get("citation"))
        if not _has_text(citation.get("citation_key")):
            issues.append(f"{source_id}.citation.citation_key is required")
        if not any(_has_text(citation.get(key)) for key in ("doi", "paper_arxiv", "citation_key")):
            issues.append(f"{source_id}.citation needs a DOI, arXiv id, or citation key")
        if not _has_text(source.get("license")):
            issues.append(f"{source_id}.license is required")
        if not _has_text(source.get("stewardship")):
            issues.append(f"{source_id}.stewardship is required")

        capabilities = _as_dict(source.get("capabilities"))
        for field in REQUIRED_CAPABILITY_FIELDS:
            if field not in capabilities:
                issues.append(f"{source_id}.capabilities.{field} is required")

        claims = _as_list(source.get("claim_support"))
        if not claims:
            issues.append(f"{source_id}.claim_support must contain at least one claim")
        for claim_idx, claim in enumerate(claims):
            if not isinstance(claim, dict):
                issues.append(f"{source_id}.claim_support[{claim_idx}] must be an object")
                continue
            claim_id = str(claim.get("claim_id") or f"claim[{claim_idx}]")
            claim_ids.add(claim_id)
            for field in REQUIRED_CLAIM_FIELDS:
                if field not in claim:
                    issues.append(f"{source_id}.{claim_id}.{field} is required")
            level = claim.get("level")
            if level not in claim_levels:
                issues.append(f"{source_id}.{claim_id}.level references unknown claim level {level}")
            if not _as_list(claim.get("evidence_fields")):
                issues.append(f"{source_id}.{claim_id}.evidence_fields must not be empty")
            if not _has_text(claim.get("guardrail")):
                issues.append(f"{source_id}.{claim_id}.guardrail is required")
            if level == "phase_label_reference" and not _truthy_capability(capabilities.get("phase_label")):
                issues.append(f"{source_id}.{claim_id} claims phase_label_reference without phase_label capability")

        verification = _as_dict(source.get("verification"))
        for field in REQUIRED_VERIFICATION_FIELDS:
            if field not in verification:
                issues.append(f"{source_id}.verification.{field} is required")
        if not _has_text(verification.get("status")):
            issues.append(f"{source_id}.verification.status is required")
        if not _as_list(verification.get("methods")):
            issues.append(f"{source_id}.verification.methods must not be empty")
        if not _as_dict(verification.get("evidence")):
            issues.append(f"{source_id}.verification.evidence must not be empty")

        ingestion = _as_dict(source.get("ingestion"))
        for field in REQUIRED_INGESTION_FIELDS:
            if field not in ingestion:
                issues.append(f"{source_id}.ingestion.{field} is required")
        priority = ingestion.get("priority")
        if not isinstance(priority, int) or priority < 1:
            issues.append(f"{source_id}.ingestion.priority must be a positive integer")
        for adapter in _as_list(ingestion.get("adapters")):
            if adapter not in adapters:
                issues.append(f"{source_id}.ingestion.adapters references unknown adapter {adapter}")
        if ingestion.get("status") == "ready_for_sampler" and verification.get("status") not in LIVE_VERIFIED_STATUSES:
            issues.append(f"{source_id} is ready_for_sampler without verified status")

    gates = _as_dict(registry.get("acceptance_gates"))
    for gate_id in ("registry", "state_phase_seed_v1", "general_reuse"):
        if not _as_list(gates.get(gate_id)):
            issues.append(f"acceptance_gates.{gate_id} is required")

    if "state_condition_coverage" not in claim_ids:
        issues.append("at least one source must support state_condition_coverage")
    if not any(
        isinstance(source, dict)
        and any(
            isinstance(claim, dict)
            and (claim.get("claim_id") == "phase_change_labels" or claim.get("level") == "phase_label_reference")
            for claim in _as_list(source.get("claim_support"))
        )
        for source in _as_list(registry.get("sources"))
    ):
        issues.append("at least one source must support phase labels")

    return issues


def registry_summary(registry: dict[str, Any]) -> dict[str, Any]:
    sources = [source for source in _as_list(registry.get("sources")) if isinstance(source, dict)]
    kind_counts = Counter(str(source.get("source_kind", "unknown")) for source in sources)
    domain_counts: Counter[str] = Counter()
    claim_counts: Counter[str] = Counter()
    ready_sources = []
    for source in sources:
        domain_counts.update(str(domain) for domain in _as_list(source.get("domains")))
        claim_counts.update(
            str(claim.get("claim_id"))
            for claim in _as_list(source.get("claim_support"))
            if isinstance(claim, dict)
        )
        ingestion = _as_dict(source.get("ingestion"))
        verification = _as_dict(source.get("verification"))
        if ingestion.get("status") in {"ready_for_sampler", "needs_archive_inspection"}:
            ready_sources.append({
                "source_id": source.get("source_id"),
                "priority": ingestion.get("priority"),
                "status": ingestion.get("status"),
                "verification": verification.get("status"),
                "next_action": ingestion.get("next_action"),
            })
    ready_sources.sort(key=lambda item: (int(item.get("priority") or 99), str(item.get("source_id"))))
    return {
        "schema": "lupine.research.source_registry.summary.v1",
        "registry_id": registry.get("registry_id"),
        "sources_total": len(sources),
        "verified_sources": sum(
            _as_dict(source.get("verification")).get("status") in LIVE_VERIFIED_STATUSES
            for source in sources
        ),
        "source_kinds": dict(sorted(kind_counts.items())),
        "domains": dict(sorted(domain_counts.items())),
        "claims": dict(sorted(claim_counts.items())),
        "ready_queue": ready_sources,
    }


def claim_matrix(registry: dict[str, Any], *, claims: set[str] | None = None) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for source in _as_list(registry.get("sources")):
        if not isinstance(source, dict):
            continue
        for claim in _as_list(source.get("claim_support")):
            if not isinstance(claim, dict):
                continue
            claim_id = str(claim.get("claim_id"))
            if claims and claim_id not in claims and str(claim.get("level")) not in claims:
                continue
            rows.append({
                "source_id": source.get("source_id"),
                "title": source.get("title"),
                "claim_id": claim_id,
                "level": claim.get("level"),
                "evidence_fields": claim.get("evidence_fields"),
                "guardrail": claim.get("guardrail"),
                "ingestion_status": _as_dict(source.get("ingestion")).get("status"),
                "priority": _as_dict(source.get("ingestion")).get("priority"),
                "verification": _as_dict(source.get("verification")).get("status"),
            })
    rows.sort(key=lambda item: (int(item.get("priority") or 99), str(item.get("source_id")), str(item.get("claim_id"))))
    return rows


def ingest_plan(registry: dict[str, Any], *, claims: set[str] | None = None, max_priority: int | None = None) -> list[dict[str, Any]]:
    sources = source_map(registry)
    matched_source_ids = {str(row["source_id"]) for row in claim_matrix(registry, claims=claims)}
    if not claims:
        matched_source_ids = set(sources)
    rows = []
    for source_id in matched_source_ids:
        source = sources[source_id]
        ingestion = _as_dict(source.get("ingestion"))
        priority = int(ingestion.get("priority") or 99)
        if max_priority is not None and priority > max_priority:
            continue
        rows.append({
            "source_id": source_id,
            "title": source.get("title"),
            "priority": priority,
            "status": ingestion.get("status"),
            "adapters": ingestion.get("adapters"),
            "target_artifacts": ingestion.get("target_artifacts"),
            "next_action": ingestion.get("next_action"),
            "claim_ids": [
                claim.get("claim_id")
                for claim in _as_list(source.get("claim_support"))
                if isinstance(claim, dict)
            ],
            "claim_guardrails": [
                claim.get("guardrail")
                for claim in _as_list(source.get("claim_support"))
                if isinstance(claim, dict)
            ],
        })
    rows.sort(key=lambda item: (int(item["priority"]), str(item["source_id"])))
    return rows


def _safe_path_id(value: str) -> str:
    return "".join(char.lower() if char.isalnum() else "_" for char in value).strip("_")


def _matching_claims(source: dict[str, Any], claims: set[str] | None = None) -> list[dict[str, Any]]:
    rows = []
    for claim in _as_list(source.get("claim_support")):
        if not isinstance(claim, dict):
            continue
        if claims and claim.get("claim_id") not in claims and claim.get("level") not in claims:
            continue
        rows.append(claim)
    return rows


def _claim_ids(source: dict[str, Any], claims: set[str] | None = None) -> list[str]:
    return [str(claim["claim_id"]) for claim in _matching_claims(source, claims) if _has_text(claim.get("claim_id"))]


def _claim_guardrail(source: dict[str, Any], claims: set[str] | None = None) -> str:
    guardrails = [
        str(claim["guardrail"])
        for claim in _matching_claims(source, claims)
        if _has_text(claim.get("guardrail"))
    ]
    return " ".join(guardrails) if guardrails else str(source.get("stewardship") or registry_default_guardrail())


def registry_default_guardrail() -> str:
    return (
        "Keep source role, claim level, license, citation, and provenance attached to every "
        "derived artifact."
    )


def _claim_args(claims: set[str] | None = None) -> str:
    if not claims:
        return ""
    return " ".join(f"--claim {claim}" for claim in sorted(claims))


def _source_inspection_unit(source: dict[str, Any], claims: set[str] | None = None) -> dict[str, Any]:
    source_id = str(source["source_id"])
    ingestion = _as_dict(source.get("ingestion"))
    priority = int(ingestion.get("priority") or 99)
    path_id = _safe_path_id(source_id)
    claim_args = _claim_args(claims)
    claim_matrix_command = "python tools/research_source_registry.py claim-matrix"
    if claim_args:
        claim_matrix_command = f"{claim_matrix_command} {claim_args}"
    return {
        "unit_id": f"source-intake:{source_id}:inspect",
        "role": "source_inspector",
        "status": "ready",
        "priority": priority,
        "source_ids": [source_id],
        "claim_ids": _claim_ids(source, claims),
        "summary": f"Inspect access, license, schema, and provenance for {source['title']}.",
        "guardrail": _claim_guardrail(source, claims),
        "inputs": {
            "urls": source.get("urls", []),
            "adapters": ingestion.get("adapters", []),
            "verification": _as_dict(source.get("verification")).get("status"),
        },
        "outputs": [f"data/research_sources/inspections/{path_id}_inspection_v1.json"],
        "acceptance_checks": [
            "Inspection records license, citation key, reusable fields, and source-specific provenance.",
            "Rows that cannot carry the needed evidence fields are excluded before sampling.",
            "The source keeps its registered claim level; no derived artifact widens the claim.",
        ],
        "commands": [
            claim_matrix_command,
            "python tools/research_source_registry.py verify-live --timeout-s 15",
        ],
        "depends_on": [],
    }


def _sampler_kind(source: dict[str, Any]) -> str:
    ingestion = _as_dict(source.get("ingestion"))
    adapters = set(_as_list(ingestion.get("adapters")))
    status = str(ingestion.get("status") or "")
    if "hf-dataset-viewer-parquet" in adapters and status == "ready_for_sampler":
        return "hf_parquet_sampler"
    if "archive-trajectory-import" in adapters:
        return "archive_trajectory_importer"
    if status in {"metadata_ready_data_needs_resolution", "needs_database_access_resolution"}:
        return "data_access_resolver"
    if status == "already_in_use":
        return "existing_fixture_audit"
    if status in {"backend_candidate", "metadata_adapter_needed", "discovery_index"}:
        return "metadata_adapter"
    return "manual_resolution"


def _sampler_unit(source: dict[str, Any], claims: set[str] | None = None) -> dict[str, Any]:
    source_id = str(source["source_id"])
    ingestion = _as_dict(source.get("ingestion"))
    priority = int(ingestion.get("priority") or 99)
    path_id = _safe_path_id(source_id)
    sampler_kind = _sampler_kind(source)
    role = "claim_guardian" if sampler_kind == "existing_fixture_audit" else "sampler_builder"
    status = "ready" if sampler_kind == "existing_fixture_audit" else "queued"
    claim_args = _claim_args(claims)
    ingest_plan_command = "python tools/research_source_registry.py ingest-plan"
    if claim_args:
        ingest_plan_command = f"{ingest_plan_command} {claim_args}"
    return {
        "unit_id": f"source-intake:{source_id}:{sampler_kind}",
        "role": role,
        "status": status,
        "priority": priority,
        "source_ids": [source_id],
        "claim_ids": _claim_ids(source, claims),
        "summary": f"Turn {source_id} into a small, reusable {sampler_kind.replace('_', ' ')} artifact.",
        "guardrail": _claim_guardrail(source, claims),
        "inputs": {
            "target_artifacts": ingestion.get("target_artifacts", []),
            "adapters": ingestion.get("adapters", []),
            "next_action": ingestion.get("next_action"),
        },
        "outputs": [f"data/research_sources/samples/{path_id}_{sampler_kind}_v1.json"],
        "acceptance_checks": [
            "Sample manifests include source_id, citation_key, license note, original row/file ids, and adapter version.",
            "Large datasets are sampled through metadata/parquet windows before any full-corpus download.",
            "State-condition fields, phase labels, and model predictions remain separate columns.",
        ],
        "commands": [
            ingest_plan_command,
            "python -m pytest tools/test_research_source_registry.py",
        ],
        "depends_on": [f"source-intake:{source_id}:inspect"],
    }


def _claim_review_unit(
    source: dict[str, Any],
    *,
    sampler_unit_id: str,
    claims: set[str] | None = None,
) -> dict[str, Any]:
    source_id = str(source["source_id"])
    ingestion = _as_dict(source.get("ingestion"))
    priority = int(ingestion.get("priority") or 99)
    path_id = _safe_path_id(source_id)
    claim_args = _claim_args(claims)
    command = "python tools/research_source_registry.py claim-matrix"
    if claim_args:
        command = f"{command} {claim_args}"
    return {
        "unit_id": f"source-intake:{source_id}:claim-review",
        "role": "claim_guardian",
        "status": "queued",
        "priority": priority,
        "source_ids": [source_id],
        "claim_ids": _claim_ids(source, claims),
        "summary": f"Review claim boundaries for {source_id} before it feeds a campaign.",
        "guardrail": _claim_guardrail(source, claims),
        "inputs": {"claim_support": _matching_claims(source, claims)},
        "outputs": [f"data/research_sources/claim_reviews/{path_id}_claim_review_v1.json"],
        "acceptance_checks": [
            "Every reported metric maps to a registered claim_id and claim level.",
            "Unsupported state, phase, pressure, or model-accuracy claims are rejected.",
            "Phoenix and Lupine.Science summaries display guardrails beside sourced evidence.",
        ],
        "commands": [
            command,
            "python tools/research_source_registry.py validate",
        ],
        "depends_on": [sampler_unit_id],
    }


def _aggregate_units(
    registry: dict[str, Any],
    source_units: list[dict[str, Any]],
    *,
    claims: set[str] | None = None,
) -> list[dict[str, Any]]:
    source_ids = sorted({source_id for unit in source_units for source_id in unit.get("source_ids", [])})
    available_claims = sorted({claim_id for unit in source_units for claim_id in unit.get("claim_ids", [])})
    review_units = [unit["unit_id"] for unit in source_units if unit.get("role") == "claim_guardian"]
    state_phase_claims = {"state_condition_coverage", "phase_change_labels"}
    state_phase_units = [
        unit
        for unit in source_units
        if state_phase_claims.intersection(set(unit.get("claim_ids", [])))
    ]
    state_phase_source_ids = sorted({
        source_id
        for unit in state_phase_units
        for source_id in unit.get("source_ids", [])
    })
    state_phase_review_units = [
        unit["unit_id"]
        for unit in state_phase_units
        if unit.get("role") == "claim_guardian"
    ]
    aggregates: list[dict[str, Any]] = []
    if {"state_condition_coverage", "phase_change_labels"}.issubset(set(available_claims)):
        aggregates.append({
            "unit_id": "source-intake:state-phase-seed-v1:assemble",
            "role": "fixture_builder",
            "status": "queued",
            "priority": 1,
            "source_ids": state_phase_source_ids,
            "claim_ids": ["state_condition_coverage", "phase_change_labels"],
            "summary": "Assemble the first state/phase seed while keeping OMat state context separate from GST phase labels.",
            "guardrail": (
                "State-condition labels and phase labels remain separate fields until an evaluator "
                "explicitly joins them."
            ),
            "inputs": {
                "registry_path": DEFAULT_REGISTRY.relative_to(ROOT).as_posix(),
                "campaign": "data/mlip_benchmarks/evidence_campaigns/mptrj_state_phase_ribbon_v1.json",
            },
            "outputs": [
                "data/mlip_benchmarks/fixtures/state_phase_seed_v1.json",
                "atlas/atlas-view/apps/lupine-site/public/research/source-intake-state-phase-v1.json",
            ],
            "acceptance_checks": [
                "Fixture rows preserve source_id, citation_key, license note, original id, and source-specific provenance.",
                "State-condition labels and phase labels remain separate fields in the fixture schema.",
                "Finite-temperature and pressure-state evidence is not used as a phase-change label.",
                "At least one state-condition source and one distinct phase-label source are represented.",
            ],
            "commands": [
                "python tools/research_source_registry.py ingest-plan --claim state_condition_coverage --claim phase_change_labels",
                "python tools/mlip_state_phase_local_probe.py --checkpoint-only-replay",
            ],
            "depends_on": state_phase_review_units,
        })

    reporter_depends = [unit["unit_id"] for unit in aggregates] or review_units
    aggregates.append({
        "unit_id": "source-intake:lupine-science:publish-ribbon",
        "role": "phoenix_reporter",
        "status": "queued",
        "priority": 1,
        "source_ids": source_ids,
        "claim_ids": available_claims,
        "summary": "Publish source status, team queue, and claim guardrails to Phoenix and Lupine.Science.",
        "guardrail": str(registry.get("claim_guardrail") or registry_default_guardrail()),
        "inputs": {
            "registry_id": registry.get("registry_id"),
            "source_count": len(source_ids),
            "team_roles": TEAM_ROLES,
        },
        "outputs": [
            "Phoenix project mlip-flywheel source-intake trace",
            "Lupine.Science research source ribbon",
        ],
        "acceptance_checks": [
            "Report shows source status, claim level, guardrail, and next action for each active source.",
            "Report distinguishes truth data, benchmark context, model comparison, and metadata-only sources.",
            "Phoenix/Lupine surfacing links back to the registry path instead of duplicating untracked claims.",
        ],
        "commands": [
            "python tools/research_source_registry.py summary",
            "python tools/research_source_registry.py team-queue --max-priority 2",
        ],
        "depends_on": reporter_depends,
    })
    return aggregates


def team_queue(
    registry: dict[str, Any],
    *,
    claims: set[str] | None = None,
    max_priority: int | None = None,
) -> dict[str, Any]:
    """Expand the source registry into concrete work units for research agents."""

    plan_rows = ingest_plan(registry, claims=claims, max_priority=max_priority)
    sources = source_map(registry)
    units: list[dict[str, Any]] = []
    for row in plan_rows:
        source = sources[str(row["source_id"])]
        inspect_unit = _source_inspection_unit(source, claims)
        sampler_unit = _sampler_unit(source, claims)
        review_unit = _claim_review_unit(source, sampler_unit_id=sampler_unit["unit_id"], claims=claims)
        units.extend([inspect_unit, sampler_unit, review_unit])
    units.extend(_aggregate_units(registry, units, claims=claims))
    role_counts = Counter(str(unit["role"]) for unit in units)
    status_counts = Counter(str(unit["status"]) for unit in units)
    return {
        "schema": "lupine.research.source_intake_queue.v1",
        "registry_id": registry.get("registry_id"),
        "filters": {
            "claims": sorted(claims) if claims else [],
            "max_priority": max_priority,
        },
        "team_roles": TEAM_ROLES,
        "work_units": units,
        "counters": {
            "sources": len(plan_rows),
            "work_units": len(units),
            "roles": dict(sorted(role_counts.items())),
            "statuses": dict(sorted(status_counts.items())),
        },
    }


def surface_payload(
    registry: dict[str, Any],
    *,
    claims: set[str] | None = None,
    max_priority: int | None = None,
) -> dict[str, Any]:
    """Build the compact public payload used by Lupine.Science."""

    summary = registry_summary(registry)
    queue = team_queue(registry, claims=claims, max_priority=max_priority)
    sources = source_map(registry)
    plan_rows = ingest_plan(registry, claims=claims, max_priority=max_priority)
    active_sources = []
    for row in plan_rows:
        source = sources[str(row["source_id"])]
        active_sources.append({
            "source_id": row["source_id"],
            "title": row["title"],
            "source_kind": source.get("source_kind"),
            "priority": row["priority"],
            "ingestion_status": row["status"],
            "verification": _as_dict(source.get("verification")).get("status"),
            "domains": source.get("domains", []),
            "claim_ids": row["claim_ids"],
            "claim_guardrails": row["claim_guardrails"],
            "target_artifacts": row["target_artifacts"],
            "next_action": row["next_action"],
        })
    role_rank = {
        "source_inspector": 0,
        "sampler_builder": 1,
        "claim_guardian": 2,
        "fixture_builder": 3,
        "phoenix_reporter": 4,
    }
    status_rank = {"ready": 0, "queued": 1}
    priority_units = sorted(
        queue["work_units"],
        key=lambda unit: (
            int(unit.get("priority") or 99),
            status_rank.get(str(unit.get("status")), 9),
            role_rank.get(str(unit.get("role")), 9),
            str(unit.get("unit_id")),
        ),
    )[:12]
    return {
        "schema": "lupine.research.source_ribbon_surface.v1",
        "registry_id": registry.get("registry_id"),
        "registry_path": DEFAULT_REGISTRY.relative_to(ROOT).as_posix(),
        "summary": {
            "sources_total": summary["sources_total"],
            "verified_sources": summary["verified_sources"],
            "domains": summary["domains"],
            "claims": summary["claims"],
        },
        "queue": {
            "counters": queue["counters"],
            "team_roles": queue["team_roles"],
            "priority_units": priority_units,
        },
        "active_sources": active_sources,
        "claim_guardrail": registry.get("claim_guardrail"),
        "acceptance_gates": registry.get("acceptance_gates"),
        "commands": [
            "python tools/research_source_registry.py validate",
            "python tools/research_source_registry.py team-queue --max-priority 2",
            (
                "python tools/research_source_registry.py team-queue "
                "--claim state_condition_coverage --claim phase_change_labels --max-priority 2"
            ),
        ],
    }


def verify_live(registry: dict[str, Any], *, timeout_s: int = 20) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for source in _as_list(registry.get("sources")):
        if not isinstance(source, dict):
            continue
        source_id = str(source.get("source_id"))
        for url_entry in _as_list(source.get("urls")):
            if not isinstance(url_entry, dict) or not _has_text(url_entry.get("url")):
                continue
            url = str(url_entry["url"])
            status: dict[str, Any] = {"source_id": source_id, "label": url_entry.get("label"), "url": url}
            try:
                req = urllib.request.Request(url, method="GET", headers={"User-Agent": "lupine-research-source-registry/1"})
                with urllib.request.urlopen(req, timeout=timeout_s) as response:
                    status["http_status"] = int(response.status)
                    status["content_type"] = response.headers.get("Content-Type")
                    status["ok"] = 200 <= int(response.status) < 400
            except urllib.error.HTTPError as exc:
                status["http_status"] = exc.code
                status["ok"] = False
                status["error"] = str(exc)
            except Exception as exc:  # pragma: no cover - live network diagnostics
                status["ok"] = False
                status["error"] = f"{exc.__class__.__name__}: {exc}"
            results.append(status)
    return results


def _print_table(rows: list[dict[str, Any]], headers: list[str]) -> None:
    if not rows:
        print("(none)")
        return
    widths = {
        header: max(len(header), *(len(_format_cell(row.get(header))) for row in rows))
        for header in headers
    }
    print("  ".join(header.ljust(widths[header]) for header in headers))
    print("  ".join("-" * widths[header] for header in headers))
    for row in rows:
        print("  ".join(_format_cell(row.get(header)).ljust(widths[header]) for header in headers))


def _format_cell(value: Any) -> str:
    if isinstance(value, list):
        return ", ".join(str(item) for item in value)
    if isinstance(value, dict):
        return json.dumps(value, sort_keys=True)
    if value is None:
        return ""
    return str(value)


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--registry", type=pathlib.Path, default=DEFAULT_REGISTRY)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("validate", help="Validate source registry")
    summary_parser = sub.add_parser("summary", help="Summarize source registry")
    summary_parser.add_argument("--json", action="store_true", dest="as_json")
    matrix_parser = sub.add_parser("claim-matrix", help="List claim support by source")
    matrix_parser.add_argument("--claim", action="append", default=[])
    matrix_parser.add_argument("--json", action="store_true", dest="as_json")
    plan_parser = sub.add_parser("ingest-plan", help="List source ingestion plan")
    plan_parser.add_argument("--claim", action="append", default=[])
    plan_parser.add_argument("--max-priority", type=int, default=None)
    plan_parser.add_argument("--json", action="store_true", dest="as_json")
    queue_parser = sub.add_parser("team-queue", help="Expand registry entries into agent-ready source intake work")
    queue_parser.add_argument("--claim", action="append", default=[])
    queue_parser.add_argument("--max-priority", type=int, default=None)
    queue_parser.add_argument("--json", action="store_true", dest="as_json")
    surface_parser = sub.add_parser("surface-payload", help="Build the compact Lupine.Science source ribbon payload")
    surface_parser.add_argument("--claim", action="append", default=[])
    surface_parser.add_argument("--max-priority", type=int, default=None)
    surface_parser.add_argument("--output", type=pathlib.Path, default=None)
    verify_parser = sub.add_parser("verify-live", help="Fetch source URLs and report live status")
    verify_parser.add_argument("--timeout-s", type=int, default=20)
    verify_parser.add_argument("--json", action="store_true", dest="as_json")
    args = parser.parse_args(list(argv) if argv is not None else None)

    registry = load_registry(args.registry)
    if args.command == "validate":
        issues = validate_registry(registry)
        if issues:
            print(json.dumps({"status": "failed", "issues": issues}, indent=2, sort_keys=True), file=sys.stderr)
            return 1
        print(json.dumps({"status": "ready", "summary": registry_summary(registry)}, indent=2, sort_keys=True))
        return 0
    if args.command == "summary":
        summary = registry_summary(registry)
        if args.as_json:
            print(json.dumps(summary, indent=2, sort_keys=True))
        else:
            print(f"{summary['registry_id']}: {summary['sources_total']} sources, {summary['verified_sources']} verified")
            _print_table(summary["ready_queue"], ["source_id", "priority", "status", "verification", "next_action"])
        return 0
    if args.command == "claim-matrix":
        rows = claim_matrix(registry, claims=set(args.claim) if args.claim else None)
        if args.as_json:
            print(json.dumps(rows, indent=2, sort_keys=True))
        else:
            _print_table(rows, ["source_id", "claim_id", "level", "ingestion_status", "priority", "verification"])
        return 0
    if args.command == "ingest-plan":
        rows = ingest_plan(
            registry,
            claims=set(args.claim) if args.claim else None,
            max_priority=args.max_priority,
        )
        if args.as_json:
            print(json.dumps(rows, indent=2, sort_keys=True))
        else:
            _print_table(rows, ["source_id", "priority", "status", "target_artifacts", "next_action"])
        return 0
    if args.command == "team-queue":
        queue = team_queue(
            registry,
            claims=set(args.claim) if args.claim else None,
            max_priority=args.max_priority,
        )
        if args.as_json:
            print(json.dumps(queue, indent=2, sort_keys=True))
        else:
            print(
                f"{queue['registry_id']}: {queue['counters']['work_units']} work units "
                f"for {queue['counters']['sources']} sources"
            )
            _print_table(
                queue["work_units"],
                ["unit_id", "role", "priority", "status", "source_ids", "summary"],
            )
        return 0
    if args.command == "surface-payload":
        payload = surface_payload(
            registry,
            claims=set(args.claim) if args.claim else None,
            max_priority=args.max_priority,
        )
        if args.output:
            output_path = args.output if args.output.is_absolute() else ROOT / args.output
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            print(json.dumps({"status": "written", "path": str(output_path)}, indent=2, sort_keys=True))
        else:
            print(json.dumps(payload, indent=2, sort_keys=True))
        return 0
    if args.command == "verify-live":
        rows = verify_live(registry, timeout_s=args.timeout_s)
        if args.as_json:
            print(json.dumps(rows, indent=2, sort_keys=True))
        else:
            _print_table(rows, ["source_id", "label", "http_status", "ok", "content_type"])
        return 0 if all(row.get("ok") for row in rows) else 1
    raise ValueError(f"unsupported command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
