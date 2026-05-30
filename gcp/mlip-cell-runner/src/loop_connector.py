"""Push managed MLIP benchmark results into the glim-think research loop.

After a benchmark cell finishes, the runner hands its results to glim-think's
``ExperimentFacet`` so the agent graph can ingest measured accuracy/speed and
compare them against theorem predictions. This closes the
runner -> loop -> hypothesis feedback cycle described in the managed-infra plan.

Transport is an async ``httpx`` POST to the glim-think RPC endpoint
(``/rpc/benchmark-results``) carrying a JSON-RPC-style envelope whose method is
``ingest_benchmark``. The payload mirrors what ``ExperimentFacet`` expects:
``run_id`` / ``backend`` / ``benchmarks`` / ``metrics`` / ``theorem_predictions``
/ ``atlas_revision``.

Design constraints (mirrors openinference_patcher — never block a run):

* ``httpx`` is imported **lazily inside methods** so this module imports on a
  baseline image with no httpx installed.
* Missing httpx, missing endpoint, or a transport error degrades to a logged
  no-op; the result of ``push_results`` reports success/failure but never raises
  for ordinary network/config problems.
* The bearer token is read from the environment, never hardcoded.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any, Mapping

logger = logging.getLogger("lupine.mlip.loop_connector")

DEFAULT_RPC_URL = "https://glim-think.lupine.workers.dev/rpc/benchmark-results"
RPC_METHOD = "ingest_benchmark"
RPC_FACET = "ExperimentFacet"
DEFAULT_TIMEOUT_S = 30.0


@dataclass(frozen=True)
class PushOutcome:
    """Immutable result of a push attempt."""

    ok: bool
    status_code: int | None
    detail: str

    @classmethod
    def noop(cls, detail: str) -> "PushOutcome":
        return cls(ok=False, status_code=None, detail=detail)


@dataclass(frozen=True)
class ConnectorConfig:
    """Immutable connector configuration resolved from the environment."""

    endpoint: str = DEFAULT_RPC_URL
    token: str | None = None
    timeout_s: float = DEFAULT_TIMEOUT_S
    facet: str = RPC_FACET

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "ConnectorConfig":
        source = os.environ if env is None else env
        timeout_raw = source.get("LUPINE_LOOP_TIMEOUT_S")
        try:
            timeout_s = float(timeout_raw) if timeout_raw else DEFAULT_TIMEOUT_S
        except ValueError:
            timeout_s = DEFAULT_TIMEOUT_S
        return cls(
            endpoint=source.get("LUPINE_LOOP_RPC_URL", DEFAULT_RPC_URL),
            # Bearer token strictly from env / Secret Manager mount.
            token=source.get("LUPINE_LOOP_TOKEN")
            or source.get("GLIM_THINK_TOKEN")
            or None,
            timeout_s=timeout_s,
            facet=source.get("LUPINE_LOOP_FACET", RPC_FACET),
        )


class LoopConnector:
    """Async client that posts benchmark results to the glim-think loop."""

    def __init__(self, config: ConnectorConfig | None = None) -> None:
        self.config = config or ConnectorConfig.from_env()

    def _build_envelope(self, run_results: Mapping[str, Any]) -> dict[str, Any]:
        """Project a runner result dict into the ExperimentFacet RPC envelope.

        Only known fields are forwarded; unknown keys are dropped so a runner
        change cannot accidentally leak large blobs to the loop.
        """
        params = {
            "run_id": run_results.get("run_id"),
            "backend": run_results.get("backend"),
            "benchmarks": run_results.get("benchmarks", []),
            "metrics": run_results.get("metrics", {}),
            "theorem_predictions": run_results.get("theorem_predictions", []),
            "atlas_revision": run_results.get("atlas_revision"),
        }
        return {
            "facet": self.config.facet,
            "method": RPC_METHOD,
            "params": params,
        }

    def _headers(self) -> dict[str, str]:
        headers = {"content-type": "application/json"}
        if self.config.token:
            headers["authorization"] = f"Bearer {self.config.token}"
        return headers

    async def push_results(self, run_results: Mapping[str, Any]) -> PushOutcome:
        """POST one run's results to the loop. Never raises on network/config.

        Returns a :class:`PushOutcome`. A no-op (missing httpx / endpoint)
        returns ``ok=False`` with an explanatory detail rather than throwing.
        """
        if not self.config.endpoint:
            return PushOutcome.noop("no loop RPC endpoint configured")

        try:
            # Lazy import — module stays importable without httpx installed.
            import httpx
        except Exception as exc:  # pragma: no cover - depends on env
            logger.info("httpx not installed; loop push is a no-op (%s)", exc)
            return PushOutcome.noop(f"httpx unavailable: {exc}")

        envelope = self._build_envelope(run_results)
        try:
            async with httpx.AsyncClient(timeout=self.config.timeout_s) as client:
                response = await client.post(
                    self.config.endpoint,
                    json=envelope,
                    headers=self._headers(),
                )
            ok = 200 <= response.status_code < 300
            if not ok:
                logger.warning(
                    "Loop ingest returned %s for run_id=%s",
                    response.status_code,
                    envelope["params"].get("run_id"),
                )
            return PushOutcome(
                ok=ok,
                status_code=response.status_code,
                detail="ingested" if ok else f"http {response.status_code}",
            )
        except Exception as exc:  # pragma: no cover - network dependent
            # Transport failures must not fail the benchmark run.
            logger.warning("Loop push failed (non-fatal): %s", exc)
            return PushOutcome(ok=False, status_code=None, detail=f"error: {exc}")

    def push_results_blocking(self, run_results: Mapping[str, Any]) -> PushOutcome:
        """Synchronous convenience wrapper for the async push.

        Useful from the sync runner entrypoint. Spins a private event loop so it
        is safe even when no loop is running. Never raises for ordinary errors.
        """
        import asyncio

        try:
            return asyncio.run(self.push_results(run_results))
        except RuntimeError as exc:
            # e.g. called from within a running loop; fall back to a fresh loop.
            logger.debug("asyncio.run rejected (%s); using a private loop", exc)
            loop = asyncio.new_event_loop()
            try:
                return loop.run_until_complete(self.push_results(run_results))
            finally:
                loop.close()
