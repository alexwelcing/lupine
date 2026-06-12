"""Entry point for ``python -m lupine_distill.uplift``.

Delegates to the argparse CLI in :mod:`lupine_distill.uplift_cli`.
"""

from __future__ import annotations

from ..uplift_cli import main

if __name__ == "__main__":  # pragma: no cover - module entry point
    raise SystemExit(main())
