"""Node 2 — Worker -> Phoenix OpenInference relay.

Monitors Node 1's curvature payloads. When a model's shear-curvature prediction
breaches the T3 reject threshold, the relay captures the topological boundary
condition, serializes it into a strict OpenInference span, and streams it to the
Phoenix OTLP relay. This is the Python flywheel pattern (per
``tools/mlip_phoenix_trace.py``) — it runs entirely off the glim-think TypeScript
path, so it is structurally immune to the ``tsc`` OOM on the Worker.

Live delivery is env-gated (production-ready for the endpoint):

    PHOENIX_OTLP_RELAY_URL   OTLP/HTTP traces endpoint (the GCP relay)
    PHOENIX_RELAY_TOKEN      bearer/relay token

With those set and opentelemetry installed, spans export over OTLP. Without them
the relay degrades to a durable, replayable local artifact under
``tmp/neural_symbolic/relay_out/`` so no signal is lost offline.

Run:
    python python/scripts/neural_symbolic/node2_relay.py
"""

from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path

_HERE = Path(__file__).resolve()
sys.path.insert(0, str(_HERE.parents[1]))
from neural_symbolic.payload import CurvatureBoundaryPayload  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stdout)
log = logging.getLogger("node2")

_REPO = _HERE.parents[3]  # repo root (python/scripts/neural_symbolic/)
PAYLOAD_DIR = _REPO / "tmp" / "neural_symbolic"
RELAY_OUT = PAYLOAD_DIR / "relay_out"
PROJECT = "mlip-neural-symbolic"


def span_attributes(p: CurvatureBoundaryPayload) -> dict[str, object]:
    """OpenInference EVALUATOR span attributes for a curvature-boundary breach."""
    return {
        "openinference.span.kind": "EVALUATOR",
        "openinference.project.name": PROJECT,
        "lupine.proof.status": p.verdict,
        "lupine.theorem.name": p.lean_theorem_name(),
        "lupine.atlas.module": "OpenDistillationFactory.Materials.NeuralSymbolic",
        "lupine.build.atlas_revision": p.atlas_revision,
        "lupine.build.mathlib_revision": p.mathlib_revision,
        "lupine.curvature.observable": p.observable,
        "lupine.curvature.reference_gpa": p.reference_gpa,
        "lupine.curvature.elastic_prediction_gpa": p.elastic_prediction_gpa,
        "lupine.curvature.deviation_pct": p.elastic_deviation_pct,
        "lupine.curvature.validated_strain_max": p.validated_strain_max,
        "lupine.curvature.divergence_strain": (p.divergence_strain if p.divergence_strain is not None else -1.0),
        "lupine.model.id": p.model_id,
        "lupine.structure.id": p.structure_id,
    }


def _try_otlp(url: str, token: str | None):
    """Build an OTel tracer provider for the Phoenix relay, or None if unavailable."""
    try:
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry import trace
    except ImportError:
        return None, None
    resource = Resource.create({"openinference.project.name": PROJECT, "service.name": "lupine-neural-symbolic"})
    provider = TracerProvider(resource=resource)
    headers = {"x-relay-token": token} if token else {}
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=url, headers=headers)))
    return provider, trace


def main() -> int:
    payload_files = sorted(PAYLOAD_DIR.glob("node1_*.json"))
    if not payload_files:
        log.error("no Node 1 payloads in %s — run node1_curvature.py first.", PAYLOAD_DIR)
        return 2
    payloads = [CurvatureBoundaryPayload.model_validate_json(pf.read_text(encoding="utf-8")) for pf in payload_files]
    breaches = [p for p in payloads if p.verdict == "reject"]

    url = os.environ.get("PHOENIX_OTLP_RELAY_URL")
    token = os.environ.get("PHOENIX_RELAY_TOKEN")
    provider, trace = (_try_otlp(url, token) if url else (None, None))
    mode = "OTLP->Phoenix relay" if provider else "durable local artifact (no PHOENIX_OTLP_RELAY_URL / otel)"

    log.info("=" * 80)
    log.info("NODE 2 — relay | %d payload(s), %d T3-REJECT breach(es) | mode: %s", len(payloads), len(breaches), mode)
    log.info("=" * 80)

    RELAY_OUT.mkdir(parents=True, exist_ok=True)
    relayed: list[dict[str, object]] = []
    tracer = provider.get_tracer("lupine.neural_symbolic.relay") if provider else None

    for p in breaches:
        attrs = span_attributes(p)
        if tracer is not None:
            with tracer.start_as_current_span("curvature_boundary_breach") as span:
                for k, v in attrs.items():
                    span.set_attribute(k, v)
                span.set_attribute("output.value", json.dumps(p.model_dump(mode="json")))
            log.info("  -> streamed span for %s (theorem %s) to relay", p.model_id, p.lean_theorem_name())
        else:
            artifact = RELAY_OUT / f"span_{p.model_id}.json"
            artifact.write_text(
                json.dumps({"name": "curvature_boundary_breach", "attributes": attrs, "payload": p.model_dump(mode="json")}, indent=2),
                encoding="utf-8",
            )
            log.info("  -> persisted span for %s -> %s", p.model_id, artifact.relative_to(_REPO))
        relayed.append({"model_id": p.model_id, "theorem": p.lean_theorem_name(), "verdict": p.verdict})

    if provider is not None:
        provider.force_flush()
        provider.shutdown()

    (RELAY_OUT / "relay_manifest.json").write_text(
        json.dumps({"mode": mode, "total": len(payloads), "breaches": len(breaches), "relayed": relayed}, indent=2),
        encoding="utf-8",
    )
    log.info("-" * 80)
    log.info("relay manifest -> %s", (RELAY_OUT / "relay_manifest.json").relative_to(_REPO))
    log.info("Node 3 consumes these breaches to synthesize machine-checked negative constraints.")
    log.info("=" * 80)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
