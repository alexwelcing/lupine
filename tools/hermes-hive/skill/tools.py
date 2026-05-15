"""
Lupine Hive Skill — tool implementations for Hermes agents.

This module is imported by Hermes when the lupine-hive skill is active.
It exposes functions that Hermes can call as tools during a chat session.
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

# Resolve hive-wire.py path
HIVE_DIR = Path(os.environ.get("HIVE_DIR", Path(__file__).parent.parent.resolve()))
HIVE_WIRE = HIVE_DIR / "hive-wire.py"


def _hw(*args: str) -> dict:
    """Call hive-wire.py CLI and return parsed JSON."""
    cmd = [sys.executable, str(HIVE_WIRE), *args]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(HIVE_DIR))
    if result.returncode != 0:
        return {"error": result.stderr.strip() or "hive-wire.py failed"}
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {"raw": result.stdout.strip()}


# ───────────────────────────────────────────────────────────
# Swarm tools
# ───────────────────────────────────────────────────────────

def swarm_run(element: Optional[str] = None, analysis_types: Optional[str] = None) -> dict:
    """
    Trigger a research analysis on the glim-think swarm.

    Args:
        element: Element symbol to analyze (e.g. "Al", "Cu"). Omit for all.
        analysis_types: Comma-separated list: "manifold,causal" or subset.
    """
    args = ["swarm", "run"]
    if element:
        args += ["--element", element]
    if analysis_types:
        args += ["--analysis-types", analysis_types]
    return _hw(*args)


def swarm_fleet(elements: Optional[str] = None) -> dict:
    """
    Trigger a parallel fleet sweep across elements.

    Args:
        elements: Comma-separated element symbols, e.g. "Al,Cu,Ni".
                  Use "all" for the full 15-element benchmark set.
    """
    args = ["swarm", "fleet"]
    if elements:
        args += ["--elements", elements]
    return _hw(*args)


def swarm_status() -> dict:
    """Check swarm health and queue status."""
    return _hw("swarm", "status")


def swarm_dispatch(fixture_url: str, command: str) -> dict:
    """
    Dispatch a heavy compute job to Cloud Tasks.

    Args:
        fixture_url: GCS path, e.g. "gs://bucket/fixture.csv"
        command: Command for atlas-distill, e.g. "auto-research"
    """
    # Note: hive-wire.py does not yet expose dispatch directly;
    # this routes through swarm_run for now.
    return _hw("swarm", "run")


def swarm_beat(summary: str, metrics_json: Optional[str] = None) -> dict:
    """
    Publish a beat to the swarm feed.

    Args:
        summary: Human-readable summary of the finding.
        metrics_json: Optional JSON string of structured metrics.
    """
    args = ["swarm", "beat", "--summary", summary]
    if metrics_json:
        args += ["--agent", "hermes-hive"]
    return _hw(*args)


# ───────────────────────────────────────────────────────────
# Local kanban tools
# ───────────────────────────────────────────────────────────

def local_claim(description: str, evidence: str = "", confidence: float = 0.5) -> dict:
    """
    Draft a claim in the local SQLite kanban.

    Args:
        description: The claim text.
        evidence: Supporting evidence or citations.
        confidence: Confidence score 0.0–1.0.
    """
    return _hw(
        "claim", "create",
        "--profile", os.environ.get("HERMES_PROFILE", "unknown"),
        "--description", description,
        "--evidence", evidence,
        "--confidence", str(confidence)
    )


def local_tasks(status: Optional[str] = None, profile: Optional[str] = None) -> dict:
    """
    List tasks from the local kanban board.

    Args:
        status: Filter by status (pending, running, complete, failed).
        profile: Filter by agent profile name.
    """
    args = ["task", "list"]
    if status:
        args += ["--status", status]
    if profile:
        args += ["--profile", profile]
    return _hw(*args)


def local_task_create(profile: str, prompt: str) -> dict:
    """
    Create a new task in the local kanban.

    Args:
        profile: Agent profile responsible for this task.
        prompt: The research prompt or instruction.
    """
    return _hw("task", "create", "--profile", profile, "--prompt", prompt)


# ───────────────────────────────────────────────────────────
# Budget guard
# ───────────────────────────────────────────────────────────

def budget_check(tier: str = "deep") -> dict:
    """
    Check whether there is budget remaining for a tier.

    Args:
        tier: "deep" (MiniMax) or "fast" (Workers AI).
    """
    return _hw("budget", "check", "--tier", tier)


# ───────────────────────────────────────────────────────────
# Skill metadata (Hermes uses this for discovery)
# ───────────────────────────────────────────────────────────

SKILL_NAME = "lupine-hive"
SKILL_VERSION = "1.0.0"
SKILL_TOOLS = [
    swarm_run,
    swarm_fleet,
    swarm_status,
    swarm_dispatch,
    swarm_beat,
    local_claim,
    local_tasks,
    local_task_create,
    budget_check,
]
