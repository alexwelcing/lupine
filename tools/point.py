#!/usr/bin/env python3
"""point.py — Master Execution Protocol for the Kimi Branch (cross-platform).

Usage:
    python tools/point.py <command> [args]

Commands:
    status              Full repo health check
    build <subsystem>   Build a subsystem (or 'all')
    test <subsystem>    Run tests (or 'all')
    research <query>    Dispatch research via glim-think
    distill             Run ODF MVP
    inventory           Scan subsystems and skills
    deploy <target>     Deploy to cloud target
    help                Show this message
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parent.parent


def _run(cmd: list[str], cwd: Optional[Path] = None, check: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=cwd or REPO_ROOT, check=check, capture_output=True, text=True, encoding="utf-8", errors="replace")


def _ok(text: str) -> None:
    print(f"[PASS] {text}")


def _warn(text: str) -> None:
    print(f"[WARN] {text}")


def _fail(text: str) -> None:
    print(f"[FAIL] {text}")


def _header(text: str) -> None:
    print(f"\n=== {text} ===")


def cmd_status() -> int:
    _header("POINT STATUS")

    # Git
    branch = _run(["git", "rev-parse", "--abbrev-ref", "HEAD"]).stdout.strip()
    dirty = _run(["git", "status", "--porcelain"]).stdout.strip()
    last_commit = _run(["git", "log", "-1", "--format=%h %s"]).stdout.strip()
    print(f"Branch: {branch}")
    print(f"Dirty: {bool(dirty)} ({len(dirty.splitlines()) if dirty else 0} files)")
    print(f"Last commit: {last_commit}")

    # Rust
    _header("RUST WORKSPACES")
    rust_projects = [
        "atlas-distill", "lupine-distill", "distill-cli",
        "lupine-ops", "atlas-view-native", "atlas-tui", "axiom"
    ]
    for proj in rust_projects:
        manifest = REPO_ROOT / proj / "Cargo.toml"
        if manifest.exists():
            print(f"Checking {proj}...", end=" ")
            res = _run(["cargo", "check", "--manifest-path", str(manifest)])
            if res.returncode == 0:
                _ok(proj)
            else:
                _fail(proj)
        else:
            _warn(f"{proj} missing Cargo.toml")

    # Lean
    _header("LEAN SPEC")
    print("Checking lean-spec...", end=" ")
    res = _run(["lake", "build"], cwd=REPO_ROOT / "lean-spec")
    if res.returncode == 0:
        _ok("lean-spec")
    else:
        _fail("lean-spec")

    # Python
    _header("PYTHON ENV")
    print("Checking Python deps...", end=" ")
    res = _run([sys.executable, "-c", "import click, httpx"])
    if res.returncode == 0:
        _ok("tools/ deps installed")
    else:
        _fail("tools/ deps missing (run: cd tools && pip install -r requirements.txt)")

    # Web
    _header("WEB VIEWER")
    if (REPO_ROOT / "atlas" / "atlas-view" / "pnpm-lock.yaml").exists():
        _ok("atlas-view lockfile present")
    else:
        _warn("atlas-view lockfile missing")

    # Skills
    _header("POINT REGISTRY")
    print("Skills:")
    kimi_skills = REPO_ROOT / ".kimi" / "skills"
    if kimi_skills.exists():
        for d in sorted(kimi_skills.iterdir()):
            if d.is_dir():
                print(f"  - {d.name}")

    print("\nPoint is armed. Awaiting orders.")
    return 0


def cmd_build(subsystem: Optional[str]) -> int:
    if not subsystem or subsystem == "all":
        _header("BUILD ALL")
        for s in ["atlas-distill", "lupine-distill", "distill-cli", "lupine-ops", "atlas-view-native", "atlas-tui", "lean-spec"]:
            cmd_build(s)
        return 0

    _header(f"BUILD {subsystem}")
    mapping = {
        "atlas-distill": (REPO_ROOT / "atlas-distill", ["cargo", "build", "--release"]),
        "lupine-distill": (REPO_ROOT / "lupine-distill", ["cargo", "build", "--release"]),
        "distill-cli": (REPO_ROOT / "distill-cli", ["cargo", "build", "--release"]),
        "lupine-ops": (REPO_ROOT / "lupine-ops", ["cargo", "build", "--release"]),
        "atlas-view-native": (REPO_ROOT / "atlas-view-native", ["cargo", "build", "--release"]),
        "atlas-tui": (REPO_ROOT / "atlas-tui", ["cargo", "build", "--release"]),
        "axiom": (REPO_ROOT / "axiom", ["cargo", "build", "--release"]),
        "atlas-view": (REPO_ROOT / "atlas" / "atlas-view", ["pnpm", "install"]),
        "lupine-start": (REPO_ROOT / "lupine-start", ["pnpm", "install"]),
        "library-site": (REPO_ROOT / "library-site", ["npm", "install"]),
        "lean-spec": (REPO_ROOT / "lean-spec", ["lake", "build"]),
        "distiller": (REPO_ROOT / "distiller", [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"]),
    }
    if subsystem not in mapping:
        _fail(f"Unknown subsystem: {subsystem}")
        return 1

    cwd, cmd = mapping[subsystem]
    res = _run(cmd, cwd=cwd, check=False)
    if res.returncode != 0:
        print(res.stderr)
        _fail(f"{subsystem} build failed")
        return 1
    _ok(f"{subsystem} built")
    return 0


def cmd_test(subsystem: Optional[str]) -> int:
    if not subsystem or subsystem == "all":
        _header("TEST ALL")
        for s in ["atlas-distill", "lupine-distill", "distill-cli", "lupine-ops", "atlas-view-native", "atlas-tui", "tools"]:
            cmd_test(s)
        return 0

    _header(f"TEST {subsystem}")
    mapping = {
        "atlas-distill": (REPO_ROOT / "atlas-distill", ["cargo", "test"]),
        "lupine-distill": (REPO_ROOT / "lupine-distill", ["cargo", "test"]),
        "distill-cli": (REPO_ROOT / "distill-cli", ["cargo", "test"]),
        "lupine-ops": (REPO_ROOT / "lupine-ops", ["cargo", "test"]),
        "atlas-view-native": (REPO_ROOT / "atlas-view-native", ["cargo", "test"]),
        "atlas-tui": (REPO_ROOT / "atlas-tui", ["cargo", "test"]),
        "lean-spec": (REPO_ROOT / "lean-spec", ["lake", "build"]),
        "tools": (REPO_ROOT / "tools", [sys.executable, "-m", "pytest", "test_glim.py", "-v"]),
    }
    if subsystem not in mapping:
        _fail(f"Unknown subsystem: {subsystem}")
        return 1

    cwd, cmd = mapping[subsystem]
    res = _run(cmd, cwd=cwd, check=False)
    if res.returncode != 0:
        print(res.stderr)
        _fail(f"{subsystem} tests failed")
        return 1
    _ok(f"{subsystem} tests passed")
    return 0


def cmd_research(query: str) -> int:
    if not query:
        _fail("Research query required")
        return 1
    _header(f"RESEARCH: {query}")
    res = _run([sys.executable, "glim.py", "ask", query, "--asked-by", "kimi"], cwd=REPO_ROOT / "tools")
    print(res.stdout)
    if res.stderr:
        print(res.stderr, file=sys.stderr)
    return res.returncode


def cmd_distill() -> int:
    _header("DISTILL")
    mvp = REPO_ROOT / "scripts" / "competition" / "run_mvp.sh"
    if mvp.exists():
        res = _run(["bash", str(mvp)])
        print(res.stdout)
        return res.returncode
    else:
        _warn("run_mvp.sh not found; skipping")
        return 0


def cmd_inventory() -> int:
    _header("INVENTORY")
    print("Subsystems found:")
    ignore = {".git", ".github", ".pytest_cache", ".sisyphus", ".wrangler",
              ".atlas-cache", ".claude", "_archive", "_research_archive",
              "node_modules", "target", ".lake", "dist", ".output", ".tanstack"}
    for item in sorted(REPO_ROOT.iterdir()):
        if item.is_dir() and item.name not in ignore and not item.name.startswith("."):
            has_cargo = (item / "Cargo.toml").exists()
            has_pkg = (item / "package.json").exists()
            has_py = (item / "requirements.txt").exists() or (item / "pyproject.toml").exists()
            has_lake = (item / "lakefile.toml").exists()
            stype = "Rust" if has_cargo else "Node" if has_pkg else "Python" if has_py else "Lean" if has_lake else "Other"
            print(f"  [{stype}] {item.name}")

    print("\nSkills:")
    kimi_skills = REPO_ROOT / ".kimi" / "skills"
    if kimi_skills.exists():
        for d in sorted(kimi_skills.iterdir()):
            if d.is_dir():
                print(f"  - {d.name}")
    return 0


def cmd_deploy(target: str) -> int:
    if not target:
        _fail("Deploy target required")
        return 1
    _header(f"DEPLOY {target}")
    if target == "glim-think":
        res = _run(["wrangler", "deploy"], cwd=REPO_ROOT / "glim-think")
        print(res.stdout)
        return res.returncode
    else:
        _fail(f"Unknown deploy target: {target}")
        return 1


def cmd_help() -> int:
    print(__doc__)
    return 0


def main() -> int:
    if len(sys.argv) < 2:
        return cmd_help()

    command = sys.argv[1]
    args = sys.argv[2:]

    handlers = {
        "status": lambda: cmd_status(),
        "build": lambda: cmd_build(args[0] if args else None),
        "test": lambda: cmd_test(args[0] if args else None),
        "research": lambda: cmd_research(" ".join(args)),
        "distill": lambda: cmd_distill(),
        "inventory": lambda: cmd_inventory(),
        "deploy": lambda: cmd_deploy(args[0] if args else None),
        "help": lambda: cmd_help(),
    }

    handler = handlers.get(command, cmd_help)
    return handler()


if __name__ == "__main__":
    sys.exit(main())
