"""Managed-infrastructure seams for the MLIP cell runner.

Both modules are import-safe without their optional heavy deps (opentelemetry,
httpx); each degrades to a logged no-op when its dependency or configuration is
absent so telemetry/loop wiring can never block a benchmark run.
"""

from .openinference_patcher import MLIPRunPatcher, PatcherConfig
from .loop_connector import LoopConnector, ConnectorConfig, PushOutcome

__all__ = [
    "MLIPRunPatcher",
    "PatcherConfig",
    "LoopConnector",
    "ConnectorConfig",
    "PushOutcome",
]
