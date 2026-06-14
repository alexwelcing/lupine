# Python Distill packages

This directory is the single source of truth for active Python Distill code.

## What lives here

| Package | Path | Purpose |
| --- | --- | --- |
| `lupine_distill` | `python/lupine_distill/` | Benchmark schemas, backends, uplift, regime gate, and ODF promotion contracts. |
| `lupine_distill_runtime` | `python/lupine_distill_runtime/` | Instrumented runtime for MLIP cells: sessions, leakage guards, policy engine adapter, events. |

Retired Distill material lives in `archive/distiller-kb/` and `archive/lupine-distill-rust/`.

## Install

```bash
cd python
pip install -e ".[torchsim]"   # or without [torchsim] for CPU-only gate tests
```

The optional `[torchsim]` extra installs `torch-sim-atomistic` (import name `torch_sim`) for real GPU benchmarks. The unit-test suite does **not** require it.

## Run tests

```bash
cd python
python -m pytest -m unit -q
```

For the full collection (including integration tests that may need `torch_sim`):

```bash
python -m pytest -q
```

## Package layout

```
python/
├── pyproject.toml
├── pytest.ini
├── lupine_distill/
│   ├── schemas.py          # canonical BenchmarkResult / BenchmarkMetrics contract
│   ├── benchmark.py        # benchmark runner
│   ├── backends/           # torchsim, ASE, mock backends
│   ├── uplift/             # distill_v_uplift and promotion recommendation
│   ├── regime/             # a-priori regime gate
│   └── odf/                # ODF / ATLAS promotion gate and model cards
├── lupine_distill_runtime/
│   ├── session.py          # DistillSession / DistillSupportModel
│   ├── leakage.py          # LeakageGuard
│   ├── policy_engine.py    # Rust atlas-distill bridge
│   └── events.py           # OpenInference / OTLP event log
└── scripts/
    ├── run_ni_gpu_loop.py              # end-to-end Ni FCC benchmark
    ├── run_cross_material_transfer.py  # cross-material negative-transfer demo
    └── neural_symbolic/                # GPU → Lean neural-symbolic loop
```

## Key entry points

```python
# Run a mock benchmark
from lupine_distill.benchmark import run_suite
from lupine_distill.backends.mock import MockBenchmarkBackend

backend = MockBenchmarkBackend(model_id="mace-mp-0", distill_version=0)
result = run_suite(backend)

# Compute uplift between two versions
from lupine_distill.uplift import distill_v_uplift
uplift = distill_v_uplift(baseline_result, distilled_result)

# Run the promotion gate
from lupine_distill.odf.promotion_gate import evaluate_promotion
gate_result = evaluate_promotion({
    "model_id": "mace-mp-0",
    "distill_version": 1,
    "overall_uplift_pct": uplift.overall_uplift_pct,
    "atlas_theorem_refs": ["OpenDistillationFactory.Materials.Theory.ContextSpecificProof"],
    "formal_properties": {"scope_invariant": True},
})
```

## How it connects to the rest of the repo

- `atlas-distill/` supplies the Rust policy engine invoked by `lupine_distill_runtime/policy_engine.py`.
- `gcp/mlip-cell-runner/` imports `lupine_distill_runtime` for instrumented cells.
- `tools/mlip_regime_filter.py` and `tools/regime_gate_flywheel.py` import `lupine_distill.regime`.
- `lean-spec/` holds the theorems referenced by `lupine_distill.odf.promotion_gate`.

## Conventions

- All schemas are frozen Pydantic models (`ConfigDict(frozen=True, extra="forbid")`).
- `torch_sim` is optional; backends must degrade gracefully to mock or ASE.
- No `sorry` proofs may be introduced downstream of this package.
