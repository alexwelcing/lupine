# Lupine Hive Skill

Skill for Hermes agents participating in the Lupine multi-terminal research squad.

## Purpose

Provides tools for each Hermes instance to interact with the glim-think swarm and the local SQLite kanban board. Every agent in the hive loads this skill so they can dispatch work, publish findings, and share state.

## Tools

### `swarm_run`
Trigger a research analysis on the glim-think swarm.
- `element` (str, optional): Element to analyze, e.g. "Al"
- `analysis_types` (list[str], optional): ["manifold", "causal"] or subset
- Returns: JSON result from swarm with statistical analysis

### `swarm_fleet`
Trigger a parallel fleet sweep across multiple elements.
- `elements` (list[str], optional): Elements to analyze, e.g. ["Al", "Cu", "Ni"]
- Returns: Fleet dispatch status and job IDs

### `swarm_status`
Check the current health and queue status of the swarm.
- Returns: Fleet status, pending experiments, record counts

### `swarm_dispatch`
Dispatch a heavy compute job to Cloud Tasks (atlas-distill).
- `fixture_url` (str): GCS path to input fixture
- `command` (str): Command to run, e.g. "auto-research"
- `args` (list[str], optional): Additional arguments
- Returns: Cloud Tasks task name

### `swarm_beat`
Publish a beat (finding / update) to the swarm feed.
- `summary` (str): Human-readable summary
- `metrics` (dict, optional): Structured metrics object
- Returns: Beat ingestion confirmation

### `local_claim`
Draft a claim in the local SQLite kanban for review by other agents.
- `description` (str): Claim text
- `evidence` (str, optional): Supporting evidence
- `confidence` (float, optional): 0.0–1.0
- Returns: Claim ID

### `local_tasks`
List tasks from the local kanban board.
- `status` (str, optional): Filter by status
- `profile` (str, optional): Filter by agent profile
- Returns: List of task records

## Configuration

Set environment variables before launching Hermes:
- `GLIM_THINK_URL` — Base URL of glim-think worker (default: https://glim-think.lupine.workers.dev)
- `HIVE_DIR` — Path to `tools/hermes-hive/` directory

## Usage

```bash
# Load skill in Hermes chat
hermes chat --skills lupine-hive --prompt "Analyze Al manifold"

# Or reference by path
hermes chat --skills ./tools/hermes-hive/skill --prompt "Screen for Simpson's Paradox"
```

## Integration

This skill is auto-loaded by `launch-hive.ps1` for every terminal in the squad.
