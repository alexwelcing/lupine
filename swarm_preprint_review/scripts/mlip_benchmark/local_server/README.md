# glim-mlip-local

Local GPU server for MLIP elastic-constant predictions. Replaces the HF
ZeroGPU Space when you have a local GPU with full CUDA support.

## Why local?

- HF ZeroGPU's PyTorch CUDA emulation cannot intercept `torch._C._cuda_init`,
  which all modern MLIPs (CHGNet, MACE-MP, M3GNet) trigger on import.
- Local GPU = no 120-second time limits, no emulation layers, full CUDA.
- First prediction is instant (models pre-loaded at startup).

## Setup

```bash
cd swarm_preprint_review/scripts/mlip_benchmark/local_server
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn server:app --host 0.0.0.0 --port 8000
```

The server pre-loads all default MLIPs at startup. On a modern GPU this
takes ~30-60s and uses ~4-6 GB VRAM.

## Expose to internet (optional)

Cloudflare Tunnel (free, no account needed):
```bash
cloudflared tunnel --url http://localhost:8000
```

ngrok:
```bash
ngrok http 8000
```

Tailscale (LAN + secure sharing):
```bash
tailscale serve 8000
```

## API

Same schema as the HF Space:

- `GET /` — health check + available MLIPs + GPU info
- `POST /predict` — `{element: "Al", mlip: "chgnet"}`
- `POST /predict_batch` — `{elements: "Al,Cu", mlips: "chgnet", references_json: "{}"}`

## Wiring into the pipeline

Set `GLIM_HF_SPACE` to your tunnel URL in GitHub Actions or local env:

```bash
export GLIM_HF_SPACE="https://your-tunnel.ngrok.io"
python tools/glim_mlip.py batch --elements Al,Cu --mlips chgnet
```
