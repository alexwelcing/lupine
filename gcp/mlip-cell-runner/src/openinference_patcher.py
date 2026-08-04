"""OpenInference span emission for managed MLIP benchmark runs.

This is the GCP-runner-side analogue of glim-think's
``src/telemetry/openinference.ts``: it projects a finished benchmark cell into a
single OpenInference ``TOOL`` span so Phoenix Cloud classifies and scores the
run alongside the agent/LLM spans the Workers pipeline already emits.

Design constraints (telemetry is strictly opt-in and must NEVER block a run):

* ``opentelemetry`` is imported **lazily inside methods**, so this module
  imports cleanly on a baseline image that has no otel installed.
* If otel is absent, or no exporter endpoint is configured, every method
  degrades to a logged no-op. A benchmark run is never failed because telemetry
  could not be emitted.
* All projection is wrapped defensively — a malformed value must not raise out
  of ``emit_benchmark_span``.

Configuration (all optional, read from the environment):

* ``LUPINE_OTEL_ENABLED``      "1"/"true" to arm telemetry (default off).
* ``OTEL_EXPORTER_OTLP_ENDPOINT`` OTLP/HTTP collector base, e.g. the Phoenix
  Cloud ingest URL. Required for spans to actually export.
* ``PHOENIX_OTLP_RELAY_URL``   glim-think OTLP relay base URL. When set together
  with ``PHOENIX_RELAY_TOKEN`` this takes precedence over the direct endpoint
  and forwards through the GCP relay so cloud cells avoid the Cloudflare WAF
  black-hole path.
* ``PHOENIX_RELAY_TOKEN``      Shared secret for the relay (sent as
  ``x-relay-token``).
* ``LUPINE_OTEL_PROJECT``      Phoenix project name (resource attribute
  ``openinference.project.name``; Phoenix routes by THIS, not service.name).
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Any, Mapping

logger = logging.getLogger("lupine.mlip.openinference")

# OpenInference / Lupine semantic-convention attribute keys. Kept as module
# constants so the connector and any tests share one spelling.
SPAN_KIND = "openinference.span.kind"
TOOL_NAME = "lupine.tool.name"
GCP_RUNNER = "lupine.gcp.runner"
BENCH_BACKEND = "lupine.benchmark.backend"
BENCH_SYSTEM = "lupine.benchmark.system"
BENCH_SUITE = "lupine.benchmark.suite"
RES_MAE_ENERGY = "lupine.results.mae_energy"
RES_MAE_FORCES = "lupine.results.mae_forces"
RES_WALL_TIME = "lupine.results.wall_time_s"
RES_GPU_UTIL = "lupine.results.gpu_utilization"
THEOREM_PREDICTIONS = "lupine.theorem_predictions"
PREDICTION_MATCH = "lupine.prediction.match"

# Phoenix routes OTLP spans to a project by this resource attribute, mirroring
# glim-think's openinference.ts (proven there, reused here).
OI_PROJECT_NAME = "openinference.project.name"

_DEFAULT_TRACER_NAME = "lupine.mlip.runner"
_DEFAULT_TOOL_NAME = "torchsim_benchmark"


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class PatcherConfig:
    """Immutable telemetry configuration resolved once from the environment."""

    enabled: bool = False
    endpoint: str | None = None
    relay_url: str | None = None
    relay_token: str | None = None
    project_name: str = "lupine-mlip"
    runner: str = "gcp-cloud-run"
    tracer_name: str = _DEFAULT_TRACER_NAME

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "PatcherConfig":
        source = os.environ if env is None else env
        return cls(
            enabled=_env_flag("LUPINE_OTEL_ENABLED", False)
            if env is None
            else str(source.get("LUPINE_OTEL_ENABLED", "")).strip().lower()
            in {"1", "true", "yes", "on"},
            endpoint=source.get("OTEL_EXPORTER_OTLP_ENDPOINT") or None,
            relay_url=source.get("PHOENIX_OTLP_RELAY_URL") or None,
            relay_token=source.get("PHOENIX_RELAY_TOKEN") or None,
            project_name=source.get("LUPINE_OTEL_PROJECT", "lupine-mlip"),
            runner=source.get("LUPINE_GCP_RUNNER", "gcp-cloud-run"),
        )

    @property
    def active(self) -> bool:
        """Telemetry emits when enabled AND a direct endpoint or relay is set."""
        if not self.enabled:
            return False
        if self.relay_url and self.relay_token:
            return True
        return bool(self.endpoint)


@dataclass
class MLIPRunPatcher:
    """Emit one OpenInference TOOL span per MLIP benchmark cell.

    The patcher is cheap to construct on a no-otel image: it neither imports
    opentelemetry nor builds a tracer until :meth:`emit_benchmark_span` is
    called with telemetry actually armed.
    """

    config: PatcherConfig = field(default_factory=PatcherConfig.from_env)
    _tracer: Any = field(default=None, init=False, repr=False)
    _otel_unavailable: bool = field(default=False, init=False, repr=False)

    # -- internal: lazily build a tracer, or mark otel unavailable ----------
    def _get_tracer(self) -> Any | None:
        if self._tracer is not None:
            return self._tracer
        if self._otel_unavailable:
            return None
        try:
            # Lazy import — keeps the module importable without otel installed.
            from opentelemetry import trace
            from opentelemetry.sdk.resources import Resource
            from opentelemetry.sdk.trace import TracerProvider
            from opentelemetry.sdk.trace.export import BatchSpanProcessor
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
                OTLPSpanExporter,
            )
        except Exception as exc:  # pragma: no cover - depends on env
            logger.info(
                "OpenTelemetry not installed; MLIP benchmark spans disabled (%s)",
                exc,
            )
            self._otel_unavailable = True
            return None

        try:
            resource = Resource.create(
                {
                    "service.name": self.config.tracer_name,
                    OI_PROJECT_NAME: self.config.project_name,
                }
            )
            provider = TracerProvider(resource=resource)

            if self.config.relay_url and self.config.relay_token:
                endpoint = self.config.relay_url.rstrip("/")
                if not endpoint.endswith("/v1/traces"):
                    endpoint = f"{endpoint}/v1/traces"
                exporter = OTLPSpanExporter(
                    endpoint=endpoint,
                    headers={"x-relay-token": self.config.relay_token},
                )
            else:
                exporter = OTLPSpanExporter(endpoint=self.config.endpoint)
            provider.add_span_processor(BatchSpanProcessor(exporter))
            self._tracer = provider.get_tracer(self.config.tracer_name)
            return self._tracer
        except Exception as exc:  # pragma: no cover - depends on env
            logger.warning("Failed to initialise OTLP tracer; disabling: %s", exc)
            self._otel_unavailable = True
            return None

    def emit_benchmark_span(
        self,
        *,
        backend: str,
        system: str,
        suite: str,
        mae_energy: float | None = None,
        mae_forces: float | None = None,
        wall_time_s: float | None = None,
        gpu_utilization: float | None = None,
        theorem_predictions: Any | None = None,
        prediction_match: bool | None = None,
        run_id: str | None = None,
        extra_attributes: Mapping[str, Any] | None = None,
    ) -> bool:
        """Emit one OpenInference TOOL span describing a benchmark cell.

        Returns ``True`` if a span was emitted, ``False`` if telemetry is a
        no-op (disabled, no endpoint, or otel unavailable). Never raises.
        """
        if not self.config.active:
            logger.debug(
                "Telemetry inactive (enabled=%s endpoint=%s); span no-op for %s/%s/%s",
                self.config.enabled,
                bool(self.config.endpoint),
                backend,
                system,
                suite,
            )
            return False

        tracer = self._get_tracer()
        if tracer is None:
            return False

        try:
            import json as _json

            span_name = f"mlip.benchmark.{backend}.{system}.{suite}"
            with tracer.start_as_current_span(span_name) as span:
                # OpenInference: classify as a TOOL invocation.
                span.set_attribute(SPAN_KIND, "TOOL")
                span.set_attribute(TOOL_NAME, _DEFAULT_TOOL_NAME)
                span.set_attribute(GCP_RUNNER, self.config.runner)
                span.set_attribute(BENCH_BACKEND, backend)
                span.set_attribute(BENCH_SYSTEM, system)
                span.set_attribute(BENCH_SUITE, suite)
                if run_id is not None:
                    span.set_attribute("lupine.run_id", str(run_id))

                # Result metrics — only set when present (don't fabricate 0.0).
                if mae_energy is not None:
                    span.set_attribute(RES_MAE_ENERGY, float(mae_energy))
                if mae_forces is not None:
                    span.set_attribute(RES_MAE_FORCES, float(mae_forces))
                if wall_time_s is not None:
                    span.set_attribute(RES_WALL_TIME, float(wall_time_s))
                if gpu_utilization is not None:
                    span.set_attribute(RES_GPU_UTIL, float(gpu_utilization))

                # Theorem predictions are structured; OTel attributes must be
                # scalars/str, so serialise to JSON.
                if theorem_predictions is not None:
                    try:
                        span.set_attribute(
                            THEOREM_PREDICTIONS,
                            _json.dumps(theorem_predictions, sort_keys=True),
                        )
                    except (TypeError, ValueError):
                        span.set_attribute(
                            THEOREM_PREDICTIONS, str(theorem_predictions)
                        )
                if prediction_match is not None:
                    span.set_attribute(PREDICTION_MATCH, bool(prediction_match))

                if extra_attributes:
                    for key, value in extra_attributes.items():
                        if isinstance(value, (str, bool, int, float)):
                            span.set_attribute(key, value)
                        else:
                            span.set_attribute(key, str(value))

                # OpenInference output payload for Phoenix's I/O extraction.
                span.set_attribute(
                    "output.value",
                    _json.dumps(
                        {
                            "backend": backend,
                            "system": system,
                            "suite": suite,
                            "mae_energy": mae_energy,
                            "mae_forces": mae_forces,
                            "wall_time_s": wall_time_s,
                            "prediction_match": prediction_match,
                        },
                        sort_keys=True,
                    ),
                )
                span.set_attribute("output.mime_type", "application/json")
            return True
        except Exception as exc:  # pragma: no cover - defensive
            # A telemetry failure must never propagate into the run.
            logger.warning("emit_benchmark_span failed (non-fatal): %s", exc)
            return False

    def shutdown(self) -> None:
        """Best-effort flush of any buffered spans. Safe to call always."""
        provider = getattr(self._tracer, "_tracer_provider", None) if self._tracer else None
        if provider is None:
            return
        try:
            provider.shutdown()
        except Exception as exc:  # pragma: no cover - defensive
            logger.debug("Tracer shutdown noop/failed: %s", exc)
