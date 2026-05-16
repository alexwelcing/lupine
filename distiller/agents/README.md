# Hermes Profiles and Agent Roles

## Status: Migrated to Lupine Hermes Hive

The old in-repo Hermes profile configs (`agents/profiles/*/hermes-*.yaml`) have been archived to `agents/profiles/.archive/`. They targeted Hermes v0.12.0, which was broken on Windows and 1422 commits behind upstream.

The new local agent layer lives in `tools/hermes-hive/` and is designed for:
- **Fresh Hermes v0.13+** installed via `uv` into an isolated venv
- **Subprocess-safe squad dispatch** via `tools/hive.py` on Windows
- **Direct swarm dispatch** to glim-think via a custom skill
- **Shared SQLite kanban** for cross-agent task coordination

## New Architecture

```
Local Windows Machine
  └─ python tools/hive.py run --squad --query "..."
       ├─ hermes-launch.py  (prompt_toolkit monkey-patch for headless Windows)
       ├─ Hermes + MiniMax-M2.7  → Manifold Agent (α)
       ├─ Hermes + MiniMax-M2.7  → Causal Agent (δ)
       ├─ Hermes + MiniMax-M2.7  → Theorist Agent (γ)
       ├─ Hermes + MiniMax-M2.7  → Experiment Agent (ε)
       ├─ Hermes + MiniMax-M2.7  → Literaturist Agent (β)
       └─ Shared SQLite kanban (hive-wire.py)  → glim-think swarm
```

## Windows Console Fix

Hermes uses `prompt_toolkit` which requires a real Windows console (`cmd.exe`). When launched via `subprocess.Popen` or background tasks, it crashes with:

```
NoConsoleScreenBufferError: Found xterm-256color, while expecting a Windows console.
```

We solve this with **`tools/hermes-hive/hermes-launch.py`**, which monkey-patches `prompt_toolkit` to use `PlainTextOutput` before importing Hermes. This disables rich formatting but makes Hermes fully functional in headless/subprocess contexts.

## Files

| Path | Purpose |
|------|---------|
| `tools/hive.py` | Main activation script — run this to dispatch the squad |
| `tools/hermes-hive/hermes-launch.py` | Subprocess-safe Hermes launcher (prompt_toolkit monkey-patch) |
| `tools/hermes-hive/hive-wire.py` | SQLite kanban + glim-think API client + budget guard |
| `tools/hermes-hive/profiles/*.json` | Agent-specific system prompts and model configs |
| `tools/hermes-hive/skill/SKILL.md` | Hermes skill documentation |
| `tools/hermes-hive/skill/tools.py` | Tool implementations for swarm dispatch |

## Usage

```bash
# Run the full squad
python tools/hive.py run --squad --query "Analyze Al hyper-ribbon"

# Run specific agents
python tools/hive.py run --profiles manifold,causal --query "Screen for paradoxes"

# Check status
python tools/hive.py status
```

## End-to-end flow (simplified)

1. Operator or agent runs `python tools/hive.py run --squad --query "..."`
2. `hive.py` reads profiles and launches Hermes via `hermes-launch.py` for each agent
3. Agents run in parallel (default) or sequentially (`--sequential`)
4. Each agent's output is stored in local SQLite kanban and log files
5. A consolidated beat is posted to glim-think swarm
6. A consolidated claim is drafted for review

## Provider status

| Provider | Status | Notes |
|----------|--------|-------|
| MiniMax | ✅ Working | All profiles route here by default |
| OpenAI Codex | ❌ Auth required | Refresh token consumed by another client; run `codex` in terminal to refresh |
| Z.ai / GLM | ❌ Hangs | API endpoint unresponsive in subprocess context |
| Hugging Face | ❌ Auth required | `HF_TOKEN` returns 401 for gated models |

To add a provider, edit the profile JSON and ensure the corresponding API key is in your environment.

## Old profiles (archived)

- `corpus` — ingestion, extraction, parsing
- `distill` — Rust transforms + Python operator discovery
- `formalize` — Lean theorem targeting
- `loop` — internal success-loop packaging

These are preserved in `agents/profiles/.archive/` for reference but are not maintained.
