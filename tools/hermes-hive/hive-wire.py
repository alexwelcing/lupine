#!/usr/bin/env python3
"""
Lupine Hermes Hive Wire — Local coordination layer for multi-terminal research squad.

Provides:
  - SQLite-backed shared kanban (tasks, claims, beats)
  - glim-think swarm API client
  - Budget guard for API spend
  - Profile loader for agent-specific configurations

Usage:
  python hive-wire.py task create --profile manifold --prompt "Analyze Al hyper-ribbon"
  python hive-wire.py task list
  python hive-wire.py swarm run --element Al --analysis-types manifold,causal
  python hive-wire.py swarm status
"""

import argparse
import io
import json
import os
import sqlite3
import sys

# Windows console encoding fix
if sys.platform == "win32" and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import urllib.request
import urllib.error

# ───────────────────────────────────────────────────────────
# Configuration
# ───────────────────────────────────────────────────────────

HIVE_DIR = Path(__file__).parent.resolve()
DATA_DIR = HIVE_DIR / "data"
PROFILES_DIR = HIVE_DIR / "profiles"
DB_PATH = DATA_DIR / "hive.db"

# glim-think base URL — override with GLIM_THINK_URL env var
DEFAULT_GLIM_THINK_URL = os.environ.get(
    "GLIM_THINK_URL",
    "https://glim-think.lupine.workers.dev"
)

# Monthly token budget per model tier (shared across hive)
BUDGET_DEEP = 500_000_000   # MiniMax Max plan
BUDGET_FAST = float("inf")  # Workers AI is free


# ───────────────────────────────────────────────────────────
# Data models
# ───────────────────────────────────────────────────────────

@dataclass
class Task:
    id: int
    profile: str
    model: str
    prompt: str
    status: str  # pending | running | complete | failed
    result_url: Optional[str]
    created_at: str
    completed_at: Optional[str]
    swarm_response: Optional[str]


@dataclass
class Claim:
    id: int
    profile: str
    description: str
    evidence: str
    confidence: float  # 0.0–1.0
    status: str  # draft | submitted | confirmed | refuted
    created_at: str


@dataclass
class Beat:
    id: int
    source: str
    summary: str
    metrics_json: str
    created_at: str


# ───────────────────────────────────────────────────────────
# Database
# ───────────────────────────────────────────────────────────

def ensure_db() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile TEXT NOT NULL,
            model TEXT NOT NULL,
            prompt TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            result_url TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            completed_at TEXT,
            swarm_response TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_profile ON tasks(profile);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

        CREATE TABLE IF NOT EXISTS claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile TEXT NOT NULL,
            description TEXT NOT NULL,
            evidence TEXT,
            confidence REAL DEFAULT 0.5,
            status TEXT DEFAULT 'draft',
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);

        CREATE TABLE IF NOT EXISTS beats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            summary TEXT NOT NULL,
            metrics_json TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS spend (
            month TEXT PRIMARY KEY,
            deep_tokens INTEGER DEFAULT 0,
            deep_calls INTEGER DEFAULT 0,
            fast_tokens INTEGER DEFAULT 0,
            fast_calls INTEGER DEFAULT 0
        );
    """)
    conn.commit()
    return conn


# ───────────────────────────────────────────────────────────
# Task operations
# ───────────────────────────────────────────────────────────

def task_create(profile: str, prompt: str, model: Optional[str] = None) -> int:
    conn = ensure_db()
    if model is None:
        model = load_profile(profile).get("model", {}).get("default", "unknown")
    cursor = conn.execute(
        "INSERT INTO tasks (profile, model, prompt) VALUES (?, ?, ?)",
        (profile, model, prompt)
    )
    conn.commit()
    return cursor.lastrowid


def task_list(status: Optional[str] = None, profile: Optional[str] = None) -> list[Task]:
    conn = ensure_db()
    where = []
    params = []
    if status:
        where.append("status = ?")
        params.append(status)
    if profile:
        where.append("profile = ?")
        params.append(profile)
    sql = "SELECT * FROM tasks"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY created_at DESC"
    rows = conn.execute(sql, params).fetchall()
    return [Task(**dict(r)) for r in rows]


def task_update(task_id: int, status: str, result_url: Optional[str] = None,
                swarm_response: Optional[str] = None) -> None:
    conn = ensure_db()
    completed = datetime.now(timezone.utc).isoformat() if status in ("complete", "failed") else None
    conn.execute(
        """UPDATE tasks SET status = ?, result_url = ?, swarm_response = ?, completed_at = ?
           WHERE id = ?""",
        (status, result_url, swarm_response, completed, task_id)
    )
    conn.commit()


# ───────────────────────────────────────────────────────────
# Claim operations
# ───────────────────────────────────────────────────────────

def claim_create(profile: str, description: str, evidence: str = "",
                 confidence: float = 0.5) -> int:
    conn = ensure_db()
    cursor = conn.execute(
        "INSERT INTO claims (profile, description, evidence, confidence) VALUES (?, ?, ?, ?)",
        (profile, description, evidence, confidence)
    )
    conn.commit()
    return cursor.lastrowid


def claim_list(status: Optional[str] = None) -> list[Claim]:
    conn = ensure_db()
    sql = "SELECT * FROM claims"
    params = []
    if status:
        sql += " WHERE status = ?"
        params.append(status)
    sql += " ORDER BY created_at DESC"
    rows = conn.execute(sql, params).fetchall()
    return [Claim(**dict(r)) for r in rows]


def claim_update(claim_id: int, status: str) -> None:
    conn = ensure_db()
    conn.execute("UPDATE claims SET status = ? WHERE id = ?", (status, claim_id))
    conn.commit()


# ───────────────────────────────────────────────────────────
# Beat operations
# ───────────────────────────────────────────────────────────

def beat_ingest(source: str, summary: str, metrics: Optional[dict] = None) -> int:
    conn = ensure_db()
    metrics_json = json.dumps(metrics) if metrics else None
    cursor = conn.execute(
        "INSERT INTO beats (source, summary, metrics_json) VALUES (?, ?, ?)",
        (source, summary, metrics_json)
    )
    conn.commit()
    return cursor.lastrowid


def beat_list(limit: int = 50) -> list[Beat]:
    conn = ensure_db()
    rows = conn.execute(
        "SELECT * FROM beats ORDER BY created_at DESC LIMIT ?", (limit,)
    ).fetchall()
    return [Beat(**dict(r)) for r in rows]


# ───────────────────────────────────────────────────────────
# Swarm API client
# ───────────────────────────────────────────────────────────

def _api_req(path: str, method: str = "GET", payload: Optional[dict] = None,
             api_key: Optional[str] = None) -> dict:
    url = f"{DEFAULT_GLIM_THINK_URL.rstrip('/')}{path}"
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    data = json.dumps(payload).encode() if payload else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        raise RuntimeError(f"Swarm API {e.code}: {body[:500]}") from e
    except Exception as e:
        raise RuntimeError(f"Swarm API error: {e}") from e


def swarm_run(element: Optional[str] = None, analysis_types: Optional[list[str]] = None,
              exclude_styles: Optional[list[str]] = None,
              only_styles: Optional[list[str]] = None) -> dict:
    payload: dict = {}
    if element:
        payload["element"] = element
    if analysis_types:
        payload["analysis_types"] = analysis_types
    if exclude_styles:
        payload["exclude_styles"] = exclude_styles
    if only_styles:
        payload["only_styles"] = only_styles
    return _api_req("/run", method="POST", payload=payload)


def swarm_fleet(elements: Optional[list[str]] = None, iterations: int = 1) -> dict:
    payload: dict = {"iterations": iterations}
    if elements:
        payload["elements"] = elements
    return _api_req("/fleet/run", method="POST", payload=payload)


def swarm_status() -> dict:
    return _api_req("/fleet/status")


def swarm_beat(summary: str, metrics: Optional[dict] = None,
               agent: str = "hermes-hive") -> dict:
    payload = {"summary": summary, "agent": agent}
    if metrics:
        payload["metrics"] = metrics
    return _api_req("/feed/beats", method="POST", payload=payload)


# ───────────────────────────────────────────────────────────
# Profile loader
# ───────────────────────────────────────────────────────────

def load_profile(name: str) -> dict:
    path = PROFILES_DIR / f"{name}.json"
    if not path.exists():
        raise FileNotFoundError(f"Profile not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def list_profiles() -> list[str]:
    return [p.stem for p in PROFILES_DIR.glob("*.json")]


# ───────────────────────────────────────────────────────────
# Budget guard
# ───────────────────────────────────────────────────────────

def record_spend(tier: str, tokens: int) -> None:
    conn = ensure_db()
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    col_tokens = f"{tier}_tokens"
    col_calls = f"{tier}_calls"
    conn.execute(f"""
        INSERT INTO spend (month, {col_tokens}, {col_calls})
        VALUES (?, ?, 1)
        ON CONFLICT(month) DO UPDATE SET
            {col_tokens} = {col_tokens} + excluded.{col_tokens},
            {col_calls} = {col_calls} + excluded.{col_calls}
    """, (month, tokens))
    conn.commit()


def check_budget(tier: str) -> bool:
    if tier == "fast":
        return True
    conn = ensure_db()
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    row = conn.execute(
        "SELECT deep_tokens FROM spend WHERE month = ?", (month,)
    ).fetchone()
    used = row["deep_tokens"] if row else 0
    return used < BUDGET_DEEP


# ───────────────────────────────────────────────────────────
# CLI
# ───────────────────────────────────────────────────────────

def main(argv: list[str] = sys.argv[1:]) -> int:
    parser = argparse.ArgumentParser(description="Lupine Hermes Hive Wire")
    sub = parser.add_subparsers(dest="command")

    # task
    task_p = sub.add_parser("task", help="Task management")
    task_sub = task_p.add_subparsers(dest="task_cmd")
    tc = task_sub.add_parser("create", help="Create a task")
    tc.add_argument("--profile", required=True)
    tc.add_argument("--prompt", required=True)
    tc.add_argument("--model", default=None)
    tl = task_sub.add_parser("list", help="List tasks")
    tl.add_argument("--status", default=None)
    tl.add_argument("--profile", default=None)
    tu = task_sub.add_parser("update", help="Update task status")
    tu.add_argument("--id", type=int, required=True)
    tu.add_argument("--status", required=True)
    tu.add_argument("--result-url", default=None)

    # claim
    claim_p = sub.add_parser("claim", help="Claim management")
    claim_sub = claim_p.add_subparsers(dest="claim_cmd")
    cc = claim_sub.add_parser("create", help="Create a claim")
    cc.add_argument("--profile", required=True)
    cc.add_argument("--description", required=True)
    cc.add_argument("--evidence", default="")
    cc.add_argument("--confidence", type=float, default=0.5)
    cl = claim_sub.add_parser("list", help="List claims")
    cl.add_argument("--status", default=None)

    # beat
    beat_p = sub.add_parser("beat", help="Beat management")
    beat_sub = beat_p.add_subparsers(dest="beat_cmd")
    bi = beat_sub.add_parser("ingest", help="Ingest a beat")
    bi.add_argument("--source", required=True)
    bi.add_argument("--summary", required=True)
    bi.add_argument("--metrics", default=None)
    bl = beat_sub.add_parser("list", help="List beats")
    bl.add_argument("--limit", type=int, default=50)

    # swarm
    swarm_p = sub.add_parser("swarm", help="Swarm API")
    swarm_sub = swarm_p.add_subparsers(dest="swarm_cmd")
    sr = swarm_sub.add_parser("run", help="Trigger /run analysis")
    sr.add_argument("--element", default=None)
    sr.add_argument("--analysis-types", default="manifold,causal")
    sr.add_argument("--exclude-styles", default=None)
    sf = swarm_sub.add_parser("fleet", help="Trigger fleet run")
    sf.add_argument("--elements", default=None)
    ss = swarm_sub.add_parser("status", help="Get fleet status")
    sb = swarm_sub.add_parser("beat", help="Post a beat")
    sb.add_argument("--summary", required=True)
    sb.add_argument("--agent", default="hermes-hive")

    # profile
    prof_p = sub.add_parser("profile", help="Profile management")
    prof_sub = prof_p.add_subparsers(dest="prof_cmd")
    prof_sub.add_parser("list", help="List profiles")

    # budget
    budg_p = sub.add_parser("budget", help="Budget guard")
    budg_sub = budg_p.add_subparsers(dest="budg_cmd")
    bc = budg_sub.add_parser("check", help="Check budget")
    bc.add_argument("--tier", default="deep")

    args = parser.parse_args(argv)

    if args.command == "task":
        if args.task_cmd == "create":
            tid = task_create(args.profile, args.prompt, args.model)
            print(json.dumps({"task_id": tid, "status": "created"}))
        elif args.task_cmd == "list":
            tasks = task_list(status=args.status, profile=args.profile)
            print(json.dumps([t.__dict__ for t in tasks], indent=2))
        elif args.task_cmd == "update":
            task_update(args.id, args.status, args.result_url)
            print(json.dumps({"updated": args.id, "status": args.status}))

    elif args.command == "claim":
        if args.claim_cmd == "create":
            cid = claim_create(args.profile, args.description, args.evidence, args.confidence)
            print(json.dumps({"claim_id": cid, "status": "draft"}))
        elif args.claim_cmd == "list":
            claims = claim_list(status=args.status)
            print(json.dumps([c.__dict__ for c in claims], indent=2))

    elif args.command == "beat":
        if args.beat_cmd == "ingest":
            metrics = json.loads(args.metrics) if args.metrics else None
            bid = beat_ingest(args.source, args.summary, metrics)
            print(json.dumps({"beat_id": bid}))
        elif args.beat_cmd == "list":
            beats = beat_list(limit=args.limit)
            print(json.dumps([b.__dict__ for b in beats], indent=2))

    elif args.command == "swarm":
        if args.swarm_cmd == "run":
            types = args.analysis_types.split(",") if args.analysis_types else None
            excludes = args.exclude_styles.split(",") if args.exclude_styles else None
            result = swarm_run(args.element, types, excludes)
            print(json.dumps(result, indent=2))
        elif args.swarm_cmd == "fleet":
            elements = args.elements.split(",") if args.elements else None
            result = swarm_fleet(elements)
            print(json.dumps(result, indent=2))
        elif args.swarm_cmd == "status":
            print(json.dumps(swarm_status(), indent=2))
        elif args.swarm_cmd == "beat":
            print(json.dumps(swarm_beat(args.summary, agent=args.agent), indent=2))

    elif args.command == "profile":
        if args.prof_cmd == "list":
            print(json.dumps(list_profiles(), indent=2))

    elif args.command == "budget":
        if args.budg_cmd == "check":
            ok = check_budget(args.tier)
            print(json.dumps({"tier": args.tier, "ok": ok}))

    else:
        parser.print_help()
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
