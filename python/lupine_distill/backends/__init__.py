"""Benchmark backend implementations.

Importing this package never imports torch / torch_sim: the TorchSim backend
only imports the heavy dependency lazily inside its methods.
"""

from __future__ import annotations

from .base import BenchmarkBackend, System
from .mock import MockBenchmarkBackend
from .torchsim import (
    TorchSimBenchmarkBackend,
    TorchSimUnavailable,
    torchsim_available,
    try_build_torchsim_backend,
)

__all__ = [
    "BenchmarkBackend",
    "MockBenchmarkBackend",
    "System",
    "TorchSimBenchmarkBackend",
    "TorchSimUnavailable",
    "torchsim_available",
    "try_build_torchsim_backend",
]
