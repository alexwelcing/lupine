---
title: glim-mlip-bench
emoji: ⚙️
colorFrom: blue
colorTo: purple
sdk: gradio
sdk_version: 4.44.1
app_file: app.py
pinned: false
license: mit
hardware: zero-a10g
suggested_hardware: zero-a10g
short_description: Foundation-MLIP elastic-constant predictions for cubic metals
---

# glim-mlip-bench (HF ZeroGPU Space)

Foundation-MLIP elastic-constant predictions on a ZeroGPU A100 — the
companion compute substrate for the
[Lupine Materials Science](https://github.com/alexwelcing/lupine) research
pipeline.

## Why this exists

The pipeline needs MLIP rows in its D1 ledger to validate
`h4_mlip_invariance`. Three obstacles made local execution painful:

1. The dev workstation runs Python 3.14 and `ase 3.28` won't import (spglib
   wheel not yet published for 3.14).
2. CHGNet/MACE-MP/M3GNet on a free GitHub-hosted runner pay a 5-minute cold
   install per workflow run.
3. The glim-think Cloudflare Worker can't run PyTorch.

This Space owns the heavy compute substrate once. Everything else (local
CLI, GitHub Actions, the worker itself) calls it via HTTP. ZeroGPU on the
HF Pro tier means an A100 (40 GB) for free per-call, ~5 min/request limit.

## Endpoints (Gradio API)

Both are callable as plain HTTP — see `glim mlip predict` in the parent
repo's `tools/glim.py` for a thin CLI client.

| Endpoint | Inputs | Output |
|---|---|---|
| `/run/predict` | `{data: [element, mlip]}` | ElasticResult dict |
| `/run/predict_batch` | `{data: [elements_csv, mlips_csv, references_json]}` | List of BenchmarkRecord dicts ready for `/ingest/batch` |

When `references_json` is non-empty in the batch call, the output schema
matches the glim-think worker's `BenchmarkRecord` exactly, so the response
can be wrapped in `{"records": [...]}` and POSTed to `/ingest/batch` with
no transformation.

## Deploy

```bash
# One-time: create the Space (any name; the CI workflow + CLI use the env
# var GLIM_HF_SPACE to find it, defaulting to <HF_USERNAME>/glim-mlip-bench).
huggingface-cli login           # paste your HF Pro token

# From this directory:
huggingface-cli upload <HF_USERNAME>/glim-mlip-bench . . \
    --repo-type=space \
    --commit-message "deploy glim-mlip-bench"

# Or via git push:
git clone https://huggingface.co/spaces/<HF_USERNAME>/glim-mlip-bench
cp app.py requirements.txt README.md glim-mlip-bench/
cd glim-mlip-bench && git add . && git commit -m "deploy" && git push

# After deploy, link the Space to your Pro account in Settings → Hardware →
# enable ZeroGPU. First call has ~5 min cold-init while the GPU pool spins
# up the container; subsequent calls in the same session are warm.
```

## Hardware tier

`zero-a10g` (default in this README's frontmatter) — A10G GPU on the
ZeroGPU shared pool. For heavier MACE-MP-0 / batch sweeps, switch to
`zero-a100-large` in Settings.

## Local testing (without ZeroGPU)

```bash
cd swarm_preprint_review/scripts/mlip_benchmark/hf_space
pip install -r requirements.txt
python app.py    # opens Gradio on http://127.0.0.1:7860
```

The `@spaces.GPU` decorator becomes a no-op when `spaces` isn't importable
(see `_gpu_decorator` in `app.py`), so local dev works on CPU.
