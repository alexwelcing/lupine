"""Pytest bootstrap: make the ``lupine_distill`` package importable.

The package lives at ``python/lupine_distill`` with no installed distribution, so
we prepend this file's package root (``python/``) to ``sys.path``. This lets
``python -m pytest`` run from the repo root.
"""

from __future__ import annotations

import pathlib
import sys

_PKG_ROOT = pathlib.Path(__file__).resolve().parent.parent  # .../python
if str(_PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(_PKG_ROOT))
