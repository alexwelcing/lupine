#!/usr/bin/env python3
"""Emit Distill flywheel iterations to Phoenix as OTLP traces.

The flywheel (``mlip_local_promotion.py`` and ``mlip_distill_growth_loop.py``)
already writes rich JSON locally. This module turns one iteration into an
OpenTelemetry trace — a root span for the iteration, child spans per 5x5x3
triplet / objective carrying the metrics as span attributes — and ships it
through the existing GCP OTLP relay (``glim-otlp-relay``) into Phoenix.

Design rules:
  * Metrics only. We attach accuracy deltas, speedups, loss, and the
    recorded verdict. We do NOT re-evaluate the promotion gate here; the
    gate lives in the flywheel and (formally) in the Lean AccuracyCommitment.
  * Never break the flywheel. Missing deps, missing config, or a dead relay
    degrade to a logged no-op; emission is wrapped by callers in try/except.
  * Testable without a network. ``*_to_spans`` are pure functions, and
    ``--dry-run`` exports to the console instead of the relay.

Config (CLI flags override env):
  PHOENIX_OTLP_RELAY_URL   relay base or full .../v1/traces endpoint
  PHOENIX_RELAY_TOKEN      shared secret sent as the x-relay-token header
  PHOENIX_PROJECT_NAME     Phoenix project (default: mlip-flywheel)
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

DEFAULT_PROJECT = "mlip-flywheel"
DEFAULT_SERVICE = "mlip-distill-flywheel"
PromotionRoot = "mlip.flywheel.promotion"
GrowthRoot = "mlip.flywheel.growth_loop"
SmokeRoot = "mlip.flywheel.smoke_test"

AttrValue = str | bool | int | float
Attributes = dict[str, AttrValue]


# ── Attribute sanitising ────────────────────────────────────────────────────
# OTel span attributes must be str/bool/int/float (or homogeneous sequences).
# Drop None and non-finite floats; stringify anything exotic.

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


# ── Span builders (pure, unit-testable) ─────────────────────────────────────

def _variant_scores(cells: Any, variant: str) -> dict[str, Any]:
    cell = cells.get(variant) if isinstance(cells, dict) else None
    if not isinstance(cell, dict):
        return {}
    return {
        f"mlip.triplet.{variant}.accuracy_score": cell.get("accuracy_score"),
        f"mlip.triplet.{variant}.speed_score": cell.get("speed_score"),
    }


def promotion_packet_to_spans(packet: dict[str, Any]) -> tuple[Attributes, list[Attributes]]:
    """Return (root attributes, per-triplet child attributes) for a
    ``lupine.mlip.local_to_cloud_promotion.v1`` packet."""
    gate = packet.get("gate") if isinstance(packet.get("gate"), dict) else {}
    summary = packet.get("summary") if isinstance(packet.get("summary"), dict) else {}
    thresholds = packet.get("thresholds") if isinstance(packet.get("thresholds"), dict) else {}
    blockers = gate.get("blockers") if isinstance(gate.get("blockers"), list) else []

    root = sanitize({
        "mlip.schema": packet.get("schema"),
        "mlip.cloud_run_id": packet.get("cloud_run_id"),
        "mlip.created_at": packet.get("created_at"),
        "mlip.gate.status": gate.get("status"),
        "mlip.gate.complete_triplets": gate.get("complete_triplets"),
        "mlip.gate.blocker_count": len(blockers),
        "mlip.gate.mean_distill_accuracy_delta": gate.get("mean_distill_accuracy_delta"),
        "mlip.gate.mean_accelerate_accuracy_delta": gate.get("mean_accelerate_accuracy_delta"),
        "mlip.gate.mean_accelerate_loss_vs_distill": gate.get("mean_accelerate_loss_vs_distill"),
        "mlip.gate.mean_speedup_accelerate_vs_distill": gate.get("mean_speedup_accelerate_vs_distill"),
        "mlip.summary.cells": summary.get("cells"),
        "mlip.summary.triplets": summary.get("triplets"),
        # thresholds carried for context only — not evaluated here.
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
            "mlip.triplet.mlip_id": triplet.get("mlip_id"),
            "mlip.triplet.complete": triplet.get("complete"),
            "mlip.triplet.accuracy_delta_distill": triplet.get("accuracy_delta_distill"),
            "mlip.triplet.accuracy_delta_accelerate": triplet.get("accuracy_delta_accelerate"),
            "mlip.triplet.accelerate_loss_vs_distill": triplet.get("accelerate_loss_vs_distill"),
            "mlip.triplet.speedup_accelerate_vs_baseline": triplet.get("speedup_accelerate_vs_baseline"),
            "mlip.triplet.speedup_accelerate_vs_distill": triplet.get("speedup_accelerate_vs_distill"),
        }
        for variant in ("baseline", "distill_accuracy", "distill_accuracy_accelerate"):
            attrs.update(_variant_scores(triplet.get("cells"), variant))
        children.append(sanitize(attrs))
    return root, children


def growth_report_to_spans(report: dict[str, Any]) -> tuple[Attributes, list[Attributes]]:
    """Return (root attributes, per-objective child attributes) for a
    ``lupine.distill.growth_loop_report.v1`` report."""
    search = report.get("search") if isinstance(report.get("search"), dict) else {}
    root = sanitize({
        "mlip.schema": report.get("schema"),
        "mlip.created_at": report.get("created_at"),
        "mlip.search.rounds": search.get("rounds"),
        "mlip.search.beam_width": search.get("beam_width"),
        "mlip.search.report_top_k": search.get("report_top_k"),
    })

    children: list[Attributes] = []
    results = report.get("results") if isinstance(report.get("results"), list) else []
    for result in results:
        if not isinstance(result, dict):
            continue
        best = result.get("best_candidate") if isinstance(result.get("best_candidate"), dict) else {}
        children.append(sanitize({
            "mlip.objective": result.get("objective"),
            "mlip.promotion_label": result.get("promotion_label"),
            "mlip.best.accuracy_delta_mean": best.get("accuracy_delta_mean"),
            "mlip.best.refusal_rate": best.get("refusal_rate"),
            "mlip.best.blocked_correction_rate": best.get("blocked_correction_rate"),
        }))
    return root, children


# ── OTLP emission ───────────────────────────────────────────────────────────

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
    """Emit one trace (root + children) to the relay, or to the console when
    ``dry_run``. Returns True if exported, False on a graceful no-op."""
    endpoint = endpoint or os.environ.get("PHOENIX_OTLP_RELAY_URL")
    token = token or os.environ.get("PHOENIX_RELAY_TOKEN")
    project = project or os.environ.get("PHOENIX_PROJECT_NAME") or DEFAULT_PROJECT

    if not dry_run and (not endpoint or not token):
        print("[phoenix-trace] no PHOENIX_OTLP_RELAY_URL/PHOENIX_RELAY_TOKEN; "
              "skipping emission (set them or use --dry-run).", file=log)
        return False

    try:
        from opentelemetry import trace as ot_trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor
    except ImportError:
        print("[phoenix-trace] opentelemetry SDK not installed "
              "(pip install -r tools/requirements-telemetry.txt); skipping.", file=log)
        return False

    resource = Resource.create({
        "service.name": service,
        # Phoenix routes spans to a project via this resource attribute.
        "openinference.project.name": project,
    })
    provider = TracerProvider(resource=resource)

    if dry_run:
        provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
    else:
        try:
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        except ImportError:
            print("[phoenix-trace] OTLP http exporter not installed; skipping.", file=log)
            return False
        exporter = OTLPSpanExporter(
            endpoint=_traces_endpoint(endpoint),  # type: ignore[arg-type]
            headers={"x-relay-token": token or ""},
        )
        provider.add_span_processor(SimpleSpanProcessor(exporter))

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
        root_name=PromotionRoot,
        root_attributes=root,
        child_name="mlip.triplet",
        children=children,
        **kwargs,
    )


def emit_growth_trace(report: dict[str, Any], **kwargs: Any) -> bool:
    root, children = growth_report_to_spans(report)
    return emit_trace(
        root_name=GrowthRoot,
        root_attributes=root,
        child_name="mlip.objective",
        children=children,
        **kwargs,
    )


def emit_smoke_test(*, marker: str | None = None, **kwargs: Any) -> tuple[bool, str]:
    """Emit a canary trace to validate the relay → Phoenix path end to end.

    Returns (exported, marker). Search Phoenix for the marker to confirm the
    span arrived. Agents/cycles run this before trusting flywheel telemetry."""
    marker = marker or uuid.uuid4().hex
    now = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
    root = sanitize({
        "mlip.smoke_test": True,
        "mlip.marker": marker,
        "mlip.created_at": now,
    })
    child = sanitize({
        "mlip.triplet.id": f"smoke:{marker[:8]}",
        "mlip.triplet.accuracy_delta_distill": 0.0,
        "mlip.triplet.speedup_accelerate_vs_baseline": 1.0,
    })
    exported = emit_trace(
        root_name=SmokeRoot,
        root_attributes=root,
        child_name="mlip.triplet",
        children=[child],
        **kwargs,
    )
    return exported, marker


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Emit a flywheel JSON report to Phoenix as OTLP traces")
    parser.add_argument("--packet", type=pathlib.Path, help="promotion_packet.json to emit")
    parser.add_argument("--growth-report", type=pathlib.Path, help="growth_report.json to emit")
    parser.add_argument("--smoke-test", action="store_true",
                        help="emit a canary trace to validate the relay → Phoenix path")
    parser.add_argument("--endpoint", default=None, help="relay base or .../v1/traces URL")
    parser.add_argument("--token", default=None, help="x-relay-token shared secret")
    parser.add_argument("--project", default=None, help="Phoenix project name")
    parser.add_argument("--dry-run", action="store_true", help="print spans to the console instead of the relay")
    args = parser.parse_args(list(argv) if argv is not None else None)

    if not (args.packet or args.growth_report or args.smoke_test):
        parser.error("provide --packet, --growth-report, and/or --smoke-test")

    ok = True
    common = {"endpoint": args.endpoint, "token": args.token, "project": args.project, "dry_run": args.dry_run}
    if args.smoke_test:
        exported, marker = emit_smoke_test(**common)
        if exported:
            print(f"[phoenix-trace] smoke test emitted. Find it in Phoenix by marker: {marker}")
        else:
            print("[phoenix-trace] smoke test did NOT export (see message above).", file=sys.stderr)
        ok = exported and ok
    if args.packet:
        packet = json.loads(args.packet.read_text(encoding="utf-8"))
        ok = emit_promotion_trace(packet, **common) and ok
    if args.growth_report:
        report = json.loads(args.growth_report.read_text(encoding="utf-8"))
        ok = emit_growth_trace(report, **common) and ok
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
