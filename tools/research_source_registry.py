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
