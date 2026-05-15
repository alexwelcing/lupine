#!/usr/bin/env python3
"""
Lupine Hive — Embedded Research Squad Activation

Any agent (Kimi, Claude, Codex) can activate the local heavy-hitter squad
by running this script. It dispatches tasks to Hermes profiles, collects
results, and posts findings back to the glim-think swarm.

Windows note: Hermes uses prompt_toolkit which requires a real Windows console.
We work around this by launching via hermes-launch.py, which monkey-patches
prompt_toolkit to use plain text output before importing Hermes.

Usage:
  python tools/hive.py run --profile manifold --query "Analyze Al hyper-ribbon"
  python tools/hive.py run --profiles manifold,causal --query "Full Al analysis"
  python tools/hive.py run --squad --query "Comprehensive evaluation"
  python tools/hive.py status
  python tools/hive.py beat --summary "Finding: ..." --metrics '{"n": 42}'
"""

import argparse
import io
import json
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

# Windows console encoding fix
if sys.platform == "win32" and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Resolve paths
REPO_ROOT = Path(__file__).parent.parent.resolve()
HIVE_DIR = REPO_ROOT / "tools" / "hermes-hive"
HIVE_WIRE = HIVE_DIR / "hive-wire.py"
LAUNCHER = HIVE_DIR / "hermes-launch.py"
PROFILES_DIR = HIVE_DIR / "profiles"
LOGS_DIR = HIVE_DIR / "data" / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# Python interpreter (use Hermes venv if available)
HERMES_VENV = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local")) / "hermes" / "hermes-agent" / "venv" / "Scripts" / "python.exe"
PYTHON = str(HERMES_VENV) if HERMES_VENV.exists() else sys.executable


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


def load_profile(name: str) -> dict:
    path = PROFILES_DIR / f"{name}.json"
    if not path.exists():
        raise FileNotFoundError(f"Profile not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def list_profiles() -> list[str]:
    return [p.stem for p in PROFILES_DIR.glob("*.json")]


def run_hermes(profile: str, query: str, timeout: int = 300) -> dict:
    """
    Run Hermes chat for a single profile with the given query.
    Uses hermes-launch.py to bypass the Windows console requirement.
    Returns parsed output or error dict.
    """
    prof = load_profile(profile)
    model_cfg = prof.get("model", {})
    model = model_cfg.get("default", "")
    provider = model_cfg.get("provider", "auto")

    ts = time.strftime("%Y%m%d_%H%M%S")
    log_path = LOGS_DIR / f"{profile}_{ts}.log"

    # Build launcher command
    cmd = [
        PYTHON,
        str(LAUNCHER),
        "--provider", provider,
        "--model", model,
        "--query", query,
        "--max-turns", "20",
        "--quiet",
    ]

    # Store task in kanban
    try:
        _hw("task", "create", "--profile", profile, "--prompt", query)
    except Exception:
        pass

    start = time.time()
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(REPO_ROOT),
            timeout=timeout,
            encoding="utf-8",
            errors="replace",
        )
        elapsed = time.time() - start

        output = result.stdout
        error = result.stderr

        # Write log for audit
        log_content = (
            f"=== HIVE RUN {ts} ===\n"
            f"Profile: {profile}\n"
            f"Model: {model}\n"
            f"Provider: {provider}\n"
            f"Query: {query}\n"
            f"Exit: {result.returncode}\n"
            f"Elapsed: {elapsed:.2f}s\n\n"
            f"--- STDOUT ---\n{output}\n\n"
            f"--- STDERR ---\n{error}\n"
        )
        log_path.write_text(log_content, encoding="utf-8")

        # Hermes exits with non-zero even on success sometimes; treat any
        # stdout as success if it's not empty.
        effective_ok = result.returncode == 0 or bool(output.strip())

        return {
            "profile": profile,
            "model": model,
            "provider": provider,
            "exit_code": result.returncode,
            "elapsed_sec": round(elapsed, 2),
            "output": output,
            "error": error if not output.strip() else None,
            "log_file": str(log_path),
        }

    except subprocess.TimeoutExpired as exc:
        elapsed = time.time() - start
        log_content = (
            f"=== HIVE RUN {ts} ===\n"
            f"Profile: {profile}\n"
            f"Model: {model}\n"
            f"Provider: {provider}\n"
            f"Query: {query}\n"
            f"Exit: TIMEOUT\n"
            f"Elapsed: {elapsed:.2f}s\n\n"
            f"--- STDOUT (partial) ---\n{getattr(exc, 'stdout', '') or ''}\n\n"
            f"--- STDERR (partial) ---\n{getattr(exc, 'stderr', '') or ''}\n"
        )
        log_path.write_text(log_content, encoding="utf-8")
        return {
            "profile": profile,
            "model": model,
            "provider": provider,
            "exit_code": -1,
            "elapsed_sec": round(elapsed, 2),
            "output": getattr(exc, "stdout", "") or "",
            "error": f"Timed out after {timeout}s",
            "log_file": str(log_path),
        }

    except Exception as e:
        elapsed = time.time() - start
        log_content = (
            f"=== HIVE RUN {ts} ===\n"
            f"Profile: {profile}\n"
            f"Model: {model}\n"
            f"Provider: {provider}\n"
            f"Query: {query}\n"
            f"Exit: EXCEPTION\n"
            f"Elapsed: {elapsed:.2f}s\n\n"
            f"--- ERROR ---\n{str(e)}\n"
        )
        log_path.write_text(log_content, encoding="utf-8")
        return {
            "profile": profile,
            "model": model,
            "provider": provider,
            "exit_code": -1,
            "elapsed_sec": round(elapsed, 2),
            "output": "",
            "error": str(e),
            "log_file": str(log_path),
        }


def run_squad(
    query: str,
    profiles: Optional[list[str]] = None,
    parallel: bool = True,
    timeout: int = 300,
) -> list[dict]:
    """
    Run multiple Hermes profiles against the same query.
    Collects results and posts a consolidated beat to the swarm.
    """
    if profiles is None:
        profiles = list_profiles()

    print(f"🐺 Activating Lupine Hive squad: {', '.join(profiles)}")
    print(f"   Query: {query[:100]}{'...' if len(query) > 100 else ''}")
    print(f"   Log directory: {LOGS_DIR}")
    print()

    results: list[dict] = []

    if parallel and len(profiles) > 1:
        with ThreadPoolExecutor(max_workers=min(len(profiles), 4)) as exe:
            futures = {exe.submit(run_hermes, p, query, timeout): p for p in profiles}
            for future in as_completed(futures):
                res = future.result()
                results.append(res)
                ok = res["exit_code"] == 0 or bool(res.get("output", "").strip())
                icon = "✅" if ok else "❌"
                print(f"   {icon} {res['profile']} ({res['model']}) — {res['elapsed_sec']}s")
                if res.get("error"):
                    print(f"      ⚠️ {res['error'][:120]}")
    else:
        for p in profiles:
            res = run_hermes(p, query, timeout)
            results.append(res)
            ok = res["exit_code"] == 0 or bool(res.get("output", "").strip())
            icon = "✅" if ok else "❌"
            print(f"   {icon} {res['profile']} ({res['model']}) — {res['elapsed_sec']}s")
            if res.get("error"):
                print(f"      ⚠️ {res['error'][:120]}")

    # Build consolidated beat
    successful = [r for r in results if (r["exit_code"] == 0 or bool(r.get("output", "").strip()))]
    summary = (
        f"Hive squad run complete. {len(successful)}/{len(results)} agents succeeded. "
        f"Profiles: {', '.join(r['profile'] for r in results)}."
    )
    metrics = {
        "query": query,
        "profiles_run": len(results),
        "profiles_success": len(successful),
        "elapsed_by_profile": {r["profile"]: r["elapsed_sec"] for r in results},
    }

    # Post beat to swarm
    try:
        beat_res = _hw("swarm", "beat", "--summary", summary)
        print(f"\n📡 Beat posted: {beat_res.get('status', 'unknown')}")
    except Exception as e:
        print(f"\n⚠️ Beat post failed: {e}")

    # Save consolidated claim
    if successful:
        combined_output = "\n\n".join(
            f"--- {r['profile']} ---\n{r['output'][:2000]}"
            for r in successful
        )
        try:
            _hw(
                "claim", "create",
                "--profile", "hive",
                "--description", summary,
                "--evidence", combined_output[:4000],
                "--confidence", str(len(successful) / len(results)),
            )
        except Exception:
            pass

    return results


def print_status() -> None:
    """Print current hive status from kanban."""
    profiles = list_profiles()
    print("🐺 Lupine Hive Status")
    print(f"   Profiles available: {', '.join(profiles)}")
    print(f"   Launcher: {LAUNCHER}")
    print(f"   Python: {PYTHON}")
    print(f"   Hive data: {HIVE_DIR / 'data' / 'hive.db'}")
    print(f"   Log directory: {LOGS_DIR}")
    print()

    tasks = _hw("task", "list", "--limit", "10")
    if isinstance(tasks, list) and tasks:
        print("   Recent tasks:")
        for t in tasks[:5]:
            status_icon = {"pending": "⏳", "running": "🔄", "complete": "✅", "failed": "❌"}.get(t.get("status"), "❓")
            print(f"      {status_icon} [{t.get('profile', '?')}] {t.get('prompt', '')[:60]}...")
    else:
        print("   No tasks in kanban.")

    budget = _hw("budget", "check", "--tier", "deep")
    if isinstance(budget, dict):
        ok = "✅" if budget.get("ok") else "❌"
        print(f"\n   {ok} Deep-tier budget: {'OK' if budget.get('ok') else 'EXHAUSTED'}")


def main(argv: list[str] = sys.argv[1:]) -> int:
    parser = argparse.ArgumentParser(
        description="Lupine Hive — Embedded Research Squad Activation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python tools/hive.py run --profile manifold --query "Analyze Al hyper-ribbon"
  python tools/hive.py run --profiles manifold,causal --query "Full Al analysis" --parallel
  python tools/hive.py run --squad --query "Comprehensive evaluation of Cu potentials"
  python tools/hive.py status
  python tools/hive.py beat --summary "Finding: Simpson's paradox in BCC data"
        """
    )
    sub = parser.add_subparsers(dest="command")

    # run
    run_p = sub.add_parser("run", help="Run one or more hive agents")
    run_p.add_argument("--profile", default=None, help="Single profile to run")
    run_p.add_argument("--profiles", default=None, help="Comma-separated profiles")
    run_p.add_argument("--squad", action="store_true", help="Run all available profiles")
    run_p.add_argument("--query", required=True, help="Research query / prompt")
    run_p.add_argument("--parallel", action="store_true", default=True, help="Run profiles in parallel")
    run_p.add_argument("--sequential", action="store_true", help="Run profiles sequentially")
    run_p.add_argument("--timeout", type=int, default=300, help="Timeout per agent in seconds")

    # status
    sub.add_parser("status", help="Show hive status")

    # beat
    beat_p = sub.add_parser("beat", help="Post a beat to the swarm")
    beat_p.add_argument("--summary", required=True)
    beat_p.add_argument("--metrics", default=None, help="JSON metrics string")

    args = parser.parse_args(argv)

    if args.command == "run":
        profiles: list[str] = []
        if args.squad:
            profiles = list_profiles()
        elif args.profiles:
            profiles = [p.strip() for p in args.profiles.split(",")]
        elif args.profile:
            profiles = [args.profile]
        else:
            print("❌ Error: specify --profile, --profiles, or --squad")
            return 1

        parallel = args.parallel and not args.sequential
        results = run_squad(args.query, profiles, parallel=parallel, timeout=args.timeout)

        # Print consolidated output
        print("\n" + "=" * 60)
        print("CONSOLIDATED OUTPUT")
        print("=" * 60)
        for r in results:
            ok = r["exit_code"] == 0 or bool(r.get("output", "").strip())
            print(f"\n📋 {r['profile'].upper()} ({r['model']})")
            print(f"   Status: {'OK' if ok else 'FAILED'} | Time: {r['elapsed_sec']}s")
            if r.get("log_file"):
                print(f"   Log: {r['log_file']}")
            if r.get("output"):
                print(f"\n{r['output'][:1500]}")
            if r.get("error"):
                print(f"   Error: {r['error'][:500]}")
        return 0 if all((r["exit_code"] == 0 or bool(r.get("output", "").strip())) for r in results) else 1

    elif args.command == "status":
        print_status()
        return 0

    elif args.command == "beat":
        metrics = json.loads(args.metrics) if args.metrics else None
        res = _hw("swarm", "beat", "--summary", args.summary)
        print(json.dumps(res, indent=2))
        return 0

    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
