#!/usr/bin/env python3
"""
hermes-launch.py — Subprocess-safe Hermes launcher for Windows.

Problem: Hermes uses prompt_toolkit for rich console output. On Windows,
prompt_toolkit's Win32Output requires a real Windows console (cmd.exe).
When launched via subprocess.Popen or background tasks, it crashes with:
    NoConsoleScreenBufferError: Found xterm-256color, while expecting a Windows console.

Solution: Monkey-patch prompt_toolkit to use PlainTextOutput BEFORE any
Hermes code is imported. This disables rich formatting but makes Hermes
fully functional in headless / subprocess contexts.

Usage:
    python hermes-launch.py --provider minimax --model MiniMax-M2.7 --query "..."
    python hermes-launch.py --provider openai --model gpt-4o --query "..."

All extra arguments are forwarded to `hermes chat`.
"""

import sys
import os


def _patch_prompt_toolkit():
    """Replace Win32Output with PlainTextOutput so Hermes works headless."""
    try:
        from prompt_toolkit.output.plain_text import PlainTextOutput
        from prompt_toolkit.output import defaults as output_defaults

        # Override output factory
        output_defaults.create_output = lambda *a, **k: PlainTextOutput(sys.stdout)

        # Also patch the Win32 class itself in case anything instantiates directly
        from prompt_toolkit.output import win32 as pt_win32

        pt_win32.Win32Output = PlainTextOutput  # type: ignore
    except Exception:
        # If prompt_toolkit isn't here, nothing to patch
        pass


def _patch_rich():
    """Optional: force rich console to plain mode to avoid any TTY issues."""
    try:
        os.environ["TERM"] = "dumb"
        os.environ["FORCE_COLOR"] = "0"
        os.environ["NO_COLOR"] = "1"
    except Exception:
        pass


def main():
    # Apply patches BEFORE importing anything Hermes-related
    _patch_rich()
    _patch_prompt_toolkit()

    # Add Hermes to path if running inside repo
    hermes_agent = os.path.join(
        os.environ.get("LOCALAPPDATA", ""), "hermes", "hermes-agent"
    )
    if os.path.isdir(hermes_agent) and hermes_agent not in sys.path:
        sys.path.insert(0, hermes_agent)

    from hermes_cli.main import main as hermes_main

    # Reconstruct argv: shift script name, keep everything else
    # If user passes: python hermes-launch.py --provider x ...
    # We want: hermes chat --provider x ...
    args = sys.argv[1:]
    if args and args[0] not in ("chat", "doctor", "model", "status"):
        args = ["chat"] + args

    sys.argv = ["hermes"] + args
    hermes_main()


if __name__ == "__main__":
    main()
