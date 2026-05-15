---
name: lupine-hive
description: "Activate the local Lupine Hermes Hive — a multi-model research squad embedded in the research loop. Any agent (Kimi, Claude, Codex) can invoke this to dispatch heavy-hitter local agents against a query."
user-invocable: true
emoji: "🐺"
homepage: https://github.com/alexwelcing/lupine
tags:
  - lupine-hive
  - hermes
  - multi-agent
  - research-loop
  - swarm-dispatch
---

# lupine-hive — Embedded Research Squad Protocol

## Purpose

The Lupine Hive is a local squad of model-specific Hermes agents that any coding agent can activate as part of the normal research workflow. It is not a separate launcher or manual process — it is a callable subroutine within the research loop.

When you (the agent) encounter a research question that benefits from multiple perspectives — geometric analysis, causal screening, hypothesis generation, or experiment design — activate the hive instead of answering from a single model.

## When to activate

Activate the hive when:
- The query spans multiple analysis types (e.g., "Analyze Al manifold AND check for paradoxes")
- You need cross-model consensus on a claim
- The operator says "run the hive", "activate the squad", or "get all perspectives"
- A scheduled fleet run detects anomalies requiring deep investigation
- You are writing a research diary entry and want supporting analysis from specialist agents

Do **not** activate for:
- Simple single-property lookups
- Code refactoring or build tasks
- Questions that are purely about repository structure

## How to activate

### Single command (preferred)

```bash
# Run the full squad on a query
python tools/hive.py run --squad --query "Your research question here"

# Run specific agents
python tools/hive.py run --profiles manifold,causal --query "Analyze Al"

# Run one agent
python tools/hive.py run --profile theorist --query "Generate hypotheses for Cu LJ failure"
```

### Check status before activating

```bash
python tools/hive.py status
```

This shows:
- Available profiles
- Hermes binary location
- Recent kanban tasks
- Deep-tier budget status (MiniMax token usage)

### Post a finding manually

```bash
python tools/hive.py beat --summary "Your finding" --metrics '{"n": 42}'
```

## Squad roster

| Agent | Profile | Model | Provider | Role |
|-------|---------|-------|----------|------|
| Manifold (α) | `manifold` | MiniMax-M2.7 | MiniMax | PCA eigenvalue, hyper-ribbon detection |
| Causal (δ) | `causal` | MiniMax-M2.7 | MiniMax | Simpson's Paradox, ecological fallacy screening |
| Theorist (γ) | `theorist` | MiniMax-M2.7 | MiniMax | Competing hypothesis generation |
| Experiment (ε) | `experiment` | MiniMax-M2.7 | MiniMax | LAMMPS experiment design |
| Literaturist (β) | `literaturist` | MiniMax-M2.7 | MiniMax | Literature mining |

> **Provider note:** All agents currently route through MiniMax (M2.7) because it is the only provider that works reliably in headless Windows subprocess contexts. Other providers (OpenAI Codex, Z.ai/GLM, Hugging Face) require additional auth configuration before they can be used. To switch a profile's provider, edit `tools/hermes-hive/profiles/<name>.json`.

## What happens during activation

1. `tools/hive.py` reads the requested profile(s) from `tools/hermes-hive/profiles/`
2. Each profile specifies its model, provider, system prompt, and available tools
3. Hermes chat is invoked for each profile with the query
4. Agents run **in parallel** by default (configurable with `--sequential`)
5. Each agent's output is stored in the local SQLite kanban
6. A consolidated beat is posted to the glim-think swarm
7. A consolidated claim is drafted for review

## Output format

The script prints a consolidated report:
```
🐺 Activating Lupine Hive squad: manifold, causal, theorist, experiment
   Query: Analyze Al hyper-ribbon and screen for paradoxes

   ✅ manifold (MiniMax-M2.7) — 45.2s
   ✅ causal (MiniMax-M2.7) — 38.7s
   ✅ theorist (GLM-5-turbo) — 52.1s
   ✅ experiment (anthropic/claude-sonnet-4) — 41.0s

📡 Beat posted: ok

============================================================
CONSOLIDATED OUTPUT
============================================================

📋 MANIFOLD (MiniMax-M2.7)
   Status: OK | Time: 45.2s
   [agent output here...]

📋 CAUSAL (MiniMax-M2.7)
   Status: OK | Time: 38.7s
   [agent output here...]
```

## Integration with POINT protocol

The `point` skill recognizes `point hive` as a subcommand:

```bash
# Via POINT
point hive --query "Why does Cu LJ overestimate C44?"

# Which delegates to:
python tools/hive.py run --squad --query "Why does Cu LJ overestimate C44?"
```

## Budget guard

The hive respects the MiniMax monthly token budget (500M tokens). The budget check runs before dispatching deep-tier agents. If the budget is exhausted, the script warns and skips deep-tier profiles.

## Error handling

- If a single agent fails, the others continue
- Failed agents are recorded in the kanban with error details
- The consolidated beat notes how many agents succeeded vs failed
- Always report the failure count to the operator

## Windows console fix

Hermes uses `prompt_toolkit` for rich terminal output. On Windows, `prompt_toolkit` requires a real `cmd.exe` console and crashes in subprocess/headless contexts with:

```
NoConsoleScreenBufferError: Found xterm-256color, while expecting a Windows console.
```

The hive works around this via **`tools/hermes-hive/hermes-launch.py`**, which monkey-patches `prompt_toolkit` to use `PlainTextOutput` before importing any Hermes code. This makes Hermes fully functional in subprocess, background task, and CI contexts at the cost of losing rich formatting.

If you run Hermes directly in an interactive terminal, use `hermes chat` as normal. For all hive/squad launches, the launcher handles the patch automatically.

## Files

| Path | Purpose |
|------|---------|
| `tools/hive.py` | Main activation script (this is what you run) |
| `tools/hermes-hive/hermes-launch.py` | Subprocess-safe Hermes launcher (prompt_toolkit monkey-patch) |
| `tools/hermes-hive/hive-wire.py` | SQLite kanban + glim-think API client |
| `tools/hermes-hive/profiles/*.json` | Agent configurations |
| `tools/hermes-hive/skill/` | Hermes skill for swarm tools |
| `tools/hermes-hive/data/hive.db` | Local SQLite state |
