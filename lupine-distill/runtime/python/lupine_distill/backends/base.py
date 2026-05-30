"""Abstract benchmark backend contract.

A backend knows how to run one named benchmark against one atomic system and
return a :class:`BenchmarkMetrics`. Backends are stateless w.r.t. the system
they are handed: they must not mutate ``system``.
"""

from __future__ import annotations

import abc
from typing import Any, Mapping

from ..schemas import Backend, BenchmarkMetrics

# An opaque atomic-system description. In production this is an ASE Atoms /
# pymatgen Structure / torch_sim state; here it is a read-only mapping so the
# abstraction does not depend on any heavy simulation library at import time.
System = Mapping[str, Any]


class BenchmarkBackend(abc.ABC):
    """Strategy interface for executing benchmarks on a given engine."""

    #: Backend discriminator written into :class:`BenchmarkResult.backend`.
    backend_id: Backend

    @abc.abstractmethod
    def run(self, system: System, benchmark: str) -> BenchmarkMetrics:
        """Run ``benchmark`` against ``system`` and return its metrics.

        Implementations MUST treat ``system`` as immutable and MUST raise
        ``ValueError`` for an unknown ``benchmark`` name.
        """

    @property
    @abc.abstractmethod
    def engine_version(self) -> str:
        """Version string of the underlying engine (e.g. torch_sim version)."""


__all__ = ["BenchmarkBackend", "System"]
