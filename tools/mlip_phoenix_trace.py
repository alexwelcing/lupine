#!/usr/bin/env python3
"""Emit Distill flywheel iterations to Phoenix as OTLP traces.

The flywheel writes local JSON packets first. This module turns those packets
into metrics-only OpenTelemetry spans for Phoenix. It does not re-evaluate the
promotion gate; it preserves the gate verdict and the corrected metric contract:

* promotion deltas are positive when the candidate is better.
* physical error reductions are first-class when available.
* energy_volume is the state hypothesis anchor.
* downstream rows are evidence that supports or refutes that energy-state lift.

Config:
  PHOENIX_OTLP_RELAY_URL   relay base or full .../v1/traces endpoint
  PHOENIX_RELAY_TOKEN      shared secret sent as x-relay-token
  PHOENIX_PROJECT_NAME     Phoenix project, default glim-think
"""

from __future__ import annotations

import argparse
import datetime
import json
import math
import os
import pathlib
import sys
import uuid
from collections.abc import Iterable
from typing import Any

DEFAULT_PROJECT = "glim-think"
DEFAULT_SERVICE = "mlip-distill-flywheel"
PROMOTION_ROOT = "mlip.flywheel.promotion"
GROWTH_ROOT = "mlip.flywheel.growth_loop"
SMOKE_ROOT = "mlip.flywheel.smoke_test"

AttrValue = str | bool | int | float
Attributes = dict[str, AttrValue]


def _coerce(value: Any) -> AttrValue | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, str):
        return value
    return json.dumps(value, sort_keys=True)


def sanitize(attrs: dict[str, Any]) -> Attributes:
    out: Attributes = {}
    for key, value in attrs.items():
        coerced = _coerce(value)
        if coerced is not None:
            out[key] = coerced
    return out


def _dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _variant_metrics(cells: Any, variant: str) -> dict[str, Any]:
    cell = _dict(cells.get(variant) if isinstance(cells, dict) else None)
    if not cell:
        return {}
    prefix = f"mlip.triplet.{variant}"
    return {
        f"{prefix}.accuracy_score": cell.get("accuracy_score"),
        f"{prefix}.accuracy_error": cell.get("accuracy_error"),
        f"{prefix}.accuracy_metric": cell.get("accuracy_metric"),
        f"{prefix}.accuracy_unit": cell.get("accuracy_unit"),
        f"{prefix}.accuracy_error_unit": cell.get("accuracy_error_unit"),
        f"{prefix}.metric_direction": cell.get("metric_direction"),
        f"{prefix}.speed_score": cell.get("speed_score"),
        f"{prefix}.distill_policy_hash": cell.get("distill_policy_hash"),
        f"{prefix}.support_manifest_hash": cell.get("support_manifest_hash"),
    }


def promotion_packet_to_spans(packet: dict[str, Any]) -> tuple[Attributes, list[Attributes]]:
    """Return root and per-triplet attributes for a promotion packet."""
    gate = _dict(packet.get("gate"))
    summary = _dict(packet.get("summary"))
    thresholds = _dict(packet.get("thresholds"))
    state = _dict(gate.get("state_hypothesis") or packet.get("hypothesis_motivation"))
    blockers = gate.get("blockers") if isinstance(gate.get("blockers"), list) else []

    root = sanitize({
        "mlip.schema": packet.get("schema"),
        "mlip.cloud_run_id": packet.get("cloud_run_id"),
        "mlip.created_at": packet.get("created_at"),
        "mlip.local_run_dir": packet.get("local_run_dir"),
        "mlip.metric_contract.promotion_delta_positive_is_better": True,
        "mlip.metric_contract.physical_error_reduction_preferred": True,
        "mlip.metric_contract.energy_anchor_required": thresholds.get("require_energy_anchor"),
        "mlip.metric_contract.block_downstream_regressions": thresholds.get("block_downstream_regressions"),
        "mlip.hypothesis.id": state.get("hypothesis_id"),
        "mlip.hypothesis.motivation": state.get("motivation"),
        "mlip.hypothesis.verdict": state.get("verdict"),
        "mlip.hypothesis.anchor_row_id": state.get("anchor_row_id"),
        "mlip.hypothesis.energy_anchor_complete": state.get("energy_anchor_complete"),
        "mlip.hypothesis.energy_anchor_mean_delta": state.get("energy_anchor_mean_delta"),
        "mlip.hypothesis.downstream_complete": state.get("downstream_complete"),
        "mlip.hypothesis.downstream_regression_count": state.get("downstream_regression_count"),
        "mlip.gate.status": gate.get("status"),
        "mlip.gate.objective": gate.get("objective"),
        "mlip.gate.complete_triplets": gate.get("complete_triplets"),
        "mlip.gate.blocker_count": len(blockers),
        "mlip.gate.mean_distill_promotion_delta": gate.get("mean_distill_accuracy_delta"),
        "mlip.gate.mean_accelerate_promotion_delta": gate.get("mean_accelerate_accuracy_delta"),
        "mlip.gate.mean_accelerate_loss_vs_distill": gate.get("mean_accelerate_loss_vs_distill"),
        "mlip.gate.mean_speedup_accelerate_vs_distill": gate.get("mean_speedup_accelerate_vs_distill"),
        "mlip.summary.cells": summary.get("cells"),
        "mlip.summary.triplets": summary.get("triplets"),
        "mlip.summary.energy_anchor_triplets": summary.get("energy_anchor_triplets"),
        "mlip.summary.downstream_regressions": summary.get("downstream_regressions"),
        "mlip.thresholds.objective": thresholds.get("objective"),
        "mlip.thresholds.min_accuracy_delta": thresholds.get("min_accuracy_delta"),
        "mlip.thresholds.min_speedup": thresholds.get("min_speedup"),
        "mlip.thresholds.max_accelerate_loss": thresholds.get("max_accelerate_loss"),
    })

    children: list[Attributes] = []
    triplets = packet.get("triplets") if isinstance(packet.get("triplets"), list) else []
    for triplet in triplets:
        if not isinstance(triplet, dict):
            continue
        attrs: dict[str, Any] = {
            "mlip.triplet.id": triplet.get("triplet_id"),
            "mlip.triplet.row_id": triplet.get("row_id"),
            "mlip.triplet.row_role": triplet.get("row_role"),
            "mlip.triplet.energy_anchor": triplet.get("energy_anchor"),
            "mlip.triplet.mlip_id": triplet.get("mlip_id"),
            "mlip.triplet.complete": triplet.get("complete"),
            "mlip.triplet.metric_direction": triplet.get("metric_direction"),
            "mlip.triplet.promotion_delta_metric": triplet.get("promotion_delta_metric"),
            "mlip.triplet.accelerate_promotion_delta_metric": triplet.get("accelerate_promotion_delta_metric"),
            "mlip.triplet.promotion_delta_distill": triplet.get("promotion_delta_distill"),
            "mlip.triplet.promotion_delta_accelerate": triplet.get("promotion_delta_accelerate"),
            "mlip.triplet.primary_error_delta_distill": triplet.get("primary_error_delta_distill"),
            "mlip.triplet.primary_error_delta_accelerate": triplet.get("primary_error_delta_accelerate"),
            "mlip.triplet.accuracy_score_delta_distill": triplet.get("accuracy_score_delta_distill"),
            "mlip.triplet.accuracy_score_delta_accelerate": triplet.get("accuracy_score_delta_accelerate"),
            "mlip.triplet.accelerate_loss_vs_distill": triplet.get("accelerate_loss_vs_distill"),
            "mlip.triplet.speedup_accelerate_vs_baseline": triplet.get("speedup_accelerate_vs_baseline"),
            "mlip.triplet.speedup_accelerate_vs_distill": triplet.get("speedup_accelerate_vs_distill"),
            # Compatibility aliases for older Phoenix charts.
            "mlip.triplet.accuracy_delta_distill": triplet.get("accuracy_delta_distill"),
            "mlip.triplet.accuracy_delta_accelerate": triplet.get("accuracy_delta_accelerate"),
        }
        for variant in ("baseline", "distill_accuracy", "distill_accuracy_accelerate"):
            attrs.update(_variant_metrics(triplet.get("cells"), variant))
        children.append(sanitize(attrs))
    return root, children


def growth_report_to_spans(report: dict[str, Any]) -> tuple[Attributes, list[Attributes]]:
    """Return root and per-objective attributes for a growth-loop report."""
    search = _dict(report.get("search"))
    case_summary = _dict(report.get("case_summary"))
    root = sanitize({
        "mlip.schema": report.get("schema"),
        "mlip.created_at": report.get("created_at"),
        "mlip.metric_contract.promotion_delta_positive_is_better": True,
        "mlip.hypothesis.anchor_row_id": "energy_volume",
        "mlip.search.rounds": search.get("rounds"),
        "mlip.search.beam_width": search.get("beam_width"),
        "mlip.search.report_top_k": search.get("report_top_k"),
        "mlip.case_summary.count": case_summary.get("count"),
        "mlip.case_summary.row_counts": case_summary.get("row_counts"),
        "mlip.case_summary.mlip_counts": case_summary.get("mlip_counts"),
    })

    children: list[Attributes] = []
    results = report.get("results") if isinstance(report.get("results"), list) else []
    for result in results:
        if not isinstance(result, dict):
            continue
        best = _dict(result.get("best_candidate"))
        children.append(sanitize({
            "mlip.objective": result.get("objective"),
            "mlip.promotion_label": result.get("promotion_label"),
            "mlip.best.accuracy_delta_mean": best.get("accuracy_delta_mean"),
            "mlip.best.refusal_rate": best.get("refusal_rate"),
            "mlip.best.blocked_correction_rate": best.get("blocked_correction_rate"),
            "mlip.best.policy_limits_id": best.get("policy_limits_id"),
            "mlip.best.ribbon_version": best.get("ribbon_version"),
        }))
    return root, children


def _traces_endpoint(base: str) -> str:
    base = base.rstrip("/")
    return base if base.endswith("/v1/traces") else f"{base}/v1/traces"


def emit_trace(
    *,
    root_name: str,
    root_attributes: Attributes,
    child_name: str,
    children: list[Attributes],
    endpoint: str | None = None,
    token: str | None = None,
    project: str | None = None,
    service: str = DEFAULT_SERVICE,
    dry_run: bool = False,
    log: Any = sys.stderr,
) -> bool:
    endpoint = endpoint or os.environ.get("PHOENIX_OTLP_RELAY_URL")
    token = token or os.environ.get("PHOENIX_RELAY_TOKEN")
    project = project or os.environ.get("PHOENIX_PROJECT_NAME") or DEFAULT_PROJECT

    if not dry_run and (not endpoint or not token):
        print("[phoenix-trace] no PHOENIX_OTLP_RELAY_URL/PHOENIX_RELAY_TOKEN; skipping.", file=log)
        return False

    try:
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor
    except ImportError:
        print("[phoenix-trace] opentelemetry SDK not installed; skipping.", file=log)
        return False

    provider = TracerProvider(resource=Resource.create({
        "service.name": service,
        "openinference.project.name": project,
    }))
    if dry_run:
        provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
    else:
        try:
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        except ImportError:
            print("[phoenix-trace] OTLP http exporter not installed; skipping.", file=log)
            return False
        provider.add_span_processor(SimpleSpanProcessor(OTLPSpanExporter(
            endpoint=_traces_endpoint(endpoint),
            headers={"x-relay-token": token or ""},
        )))

    tracer = provider.get_tracer("mlip.flywheel")
    try:
        with tracer.start_as_current_span(root_name) as root_span:
            root_span.set_attributes(root_attributes)
            root_span.set_attribute("mlip.child_count", len(children))
            for child in children:
                with tracer.start_as_current_span(child_name) as child_span:
                    child_span.set_attributes(child)
        provider.force_flush()
    finally:
        provider.shutdown()
    return True


def emit_promotion_trace(packet: dict[str, Any], **kwargs: Any) -> bool:
    root, children = promotion_packet_to_spans(packet)
    return emit_trace(
        root_name=PROMOTION_ROOT,
        root_attributes=root,
        child_name="mlip.triplet",
        children=children,
        **kwargs,
    )


def emit_growth_trace(report: dict[str, Any], **kwargs: Any) -> bool:
    root, children = growth_report_to_spans(report)
    return emit_trace(
        root_name=GROWTH_ROOT,
        root_attributes=root,
        child_name="mlip.objective",
        children=children,
        **kwargs,
    )


def emit_smoke_test(*, marker: str | None = None, **kwargs: Any) -> tuple[bool, str]:
    marker = marker or uuid.uuid4().hex
    now = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
    exported = emit_trace(
        root_name=SMOKE_ROOT,
        root_attributes=sanitize({
            "mlip.smoke_test": True,
            "mlip.marker": marker,
            "mlip.created_at": now,
            "mlip.metric_contract.energy_anchor_required": True,
            "mlip.hypothesis.anchor_row_id": "energy_volume",
        }),
        child_name="mlip.triplet",
        children=[sanitize({
            "mlip.triplet.id": f"smoke:{marker[:8]}",
            "mlip.triplet.row_id": "energy_volume",
            "mlip.triplet.energy_anchor": True,
            "mlip.triplet.promotion_delta_distill": 0.0,
        })],
        **kwargs,
    )
    return exported, marker


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Emit MLIP flywheel JSON as Phoenix OTLP traces")
    parser.add_argument("--packet", type=pathlib.Path, help="promotion_packet.json")
    parser.add_argument("--growth-report", type=pathlib.Path, help="growth_report.json")
    parser.add_argument("--smoke-test", action="store_true")
    parser.add_argument("--endpoint", default=None, help="relay base or .../v1/traces URL")
    parser.add_argument("--token", default=None, help="x-relay-token shared secret")
    parser.add_argument("--project", default=None, help="Phoenix project name")
    parser.add_argument("--dry-run", action="store_true", help="print spans instead of exporting")
    args = parser.parse_args(list(argv) if argv is not None else None)

    if not (args.packet or args.growth_report or args.smoke_test):
        parser.error("provide --packet, --growth-report, and/or --smoke-test")

    common = {"endpoint": args.endpoint, "token": args.token, "project": args.project, "dry_run": args.dry_run}
    ok = True
    if args.smoke_test:
        exported, marker = emit_smoke_test(**common)
        if exported:
            print(f"[phoenix-trace] smoke test emitted. Phoenix marker: {marker}")
        ok = exported and ok
    if args.packet:
        ok = emit_promotion_trace(json.loads(args.packet.read_text(encoding="utf-8")), **common) and ok
    if args.growth_report:
        ok = emit_growth_trace(json.loads(args.growth_report.read_text(encoding="utf-8")), **common) and ok
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
