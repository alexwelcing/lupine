---
name: odf-capacity-test
description: "Capacity discovery and latency/TPS benchmarking sweep across both providers backing Hermes in open-distillation-factory: MiniMax (primary) and Z.ai GLM (fallback)."
user-invocable: true
emoji: "\U0001F50D"
homepage: https://github.com/alexwelcing/open-distillation-factory
allowed-tools: Bash(python3 *), Bash(pip install *), Bash(curl *), Bash(cat *), Bash(jq *)
tags:
  - capacity-testing
  - provider-benchmarking
  - minimax
  - zai
  - latency
  - throughput
  - hermes-providers
  - open-distillation-factory
---

# odf-capacity-test

Capacity discovery + latency/TPS benchmarking sweep across both providers backing Hermes
in open-distillation-factory: MiniMax (provider A, primary) and Z.ai GLM (provider B, fallback / deep reasoning).

## Inputs
- `MINIMAX_TOKEN_KEY` — MiniMax Token Plan key (from project `.env`)
- `ZAI_TOKEN_KEY` — Z.ai coding pro plan key (from project `.env`)

## What it tests

**MiniMax** (`https://api.minimax.io`):
- Text: `MiniMax-M2.7`, streaming variant, Anthropic-compat
- Modal: TTS (`speech-2.8-hd`), image (`image-01`), music (`music-2.6`), lyrics
- Discovery: `/v1/models`, `/v1/api/openplatform/coding_plan/remains`

(Highspeed tier and `coding-plan-*` MCP tools removed — not API models on the current plan.)

**Z.ai** (`https://api.z.ai`):
- Text: `glm-5.1`, `glm-5-turbo`, `glm-4.7`, streaming variant, function-calling, Anthropic-compat
- Image: `cogview-4`

## Outputs
- `runs/capacity/latest.json` — structured per-endpoint records (status, latency_ms, ttft_ms, tps, response_preview)
- `runs/capacity/summary.txt` — human-readable comparison table

## Run
```bash
python3 scripts/capacity/test_all_endpoints.py
```

Set `--fast` to skip non-text modalities (image/audio/video burn daily quota).
Set `--text-only` to test only text endpoints across both providers.
