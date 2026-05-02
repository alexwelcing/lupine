# `glim` CLI — local dispatch for the glim-think worker

Dispatch research work to the deployed Cloudflare Worker without hand-crafted curl.

## Install

```bash
cd tools
python -m venv .venv
source .venv/Scripts/activate   # Windows (Git Bash); use .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
```

By default the CLI talks to `https://glim-think-v1.aw-ab5.workers.dev`. Override
with the `GLIM_API_URL` environment variable or the `--api-url` flag.

## Usage

```bash
# Lab notebook: ask a free-text research question
python glim.py ask "Why does Cu LJ overestimate C44?" --asked-by alex

# Critiques: queue a peer-review markdown file
python glim.py critique queue ../swarm_preprint_review/critique11.md
python glim.py critique pending

# Hypotheses
python glim.py hypothesis list
python glim.py hypothesis update h4_mlip_invariance --status testing --confidence 0.4

# Analysis
python glim.py run --element Al --analysis manifold,causal
python glim.py fleet run --elements Al,Cu,Ni

# Watch the experiment queue
python glim.py watch --interval 30

# Literature search
python glim.py literature search "MACE-MP elastic constants" --max 5

# One-shot: dispatch the critique11.md gaps as a batch
python glim.py dispatch-critique11

# Self-describing API
python glim.py openapi | jq '.paths | keys'
```

## Test

```bash
python -m pytest test_glim.py -v
```

All HTTP calls are mocked at `httpx.Client.request`; no network access required.
