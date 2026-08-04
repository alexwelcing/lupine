# `lupine_distill.backends`

Benchmark backend implementations for the Distill pipeline.

## Purpose

A backend knows how to run one named benchmark against one atomic system and return a `BenchmarkMetrics` value. Backends are stateless and must not mutate the system they are handed.

Importing this package does **not** import `torch` or `torch_sim`; the TorchSim backend loads those heavy dependencies lazily inside its methods so CPU-only CI stays fast.

## Key modules

| Module | Key classes / functions |
|---|---|
| `base.py` | `BenchmarkBackend` (abstract), `System` |
| `mock.py` | `MockBenchmarkBackend` — deterministic synthetic backend for tests and CPU fallback |
| `torchsim.py` | `TorchSimBenchmarkBackend`, `TorchSimUnavailable`, `torchsim_available()`, `try_build_torchsim_backend()` |

## Import

```python
from lupine_distill.backends import MockBenchmarkBackend, TorchSimBenchmarkBackend, torchsim_available
```

## Example

```python
from lupine_distill.backends import MockBenchmarkBackend

backend = MockBenchmarkBackend(model_id="mace-mp-0", distill_version=0)
metrics = backend.run({"structure_id": "Ni-fcc"}, "static_energy")
```

See [`python/README.md`](../../README.md) for the full package overview.
