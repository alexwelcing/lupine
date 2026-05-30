"""Pytest bootstrap for the neural-symbolic node tests.

Submodule discovery for the real ``neural_symbolic`` package is handled by this test
package's ``__init__.py`` (it extends ``__path__`` to the real source dir). As a
belt-and-suspenders — and so a bare ``import neural_symbolic.payload`` works even if
this package's ``__init__`` has not been imported yet — we also prepend the
``scripts/`` directory (which contains the real ``neural_symbolic`` package) to
``sys.path``. The repo-level ``tests/conftest.py`` only adds the ``lupine_distill``
package root, so this is additive, not a duplicate.
"""

from __future__ import annotations

import pathlib
import sys

# .../tests/neural_symbolic/conftest.py -> parents: [neural_symbolic, tests, python]
_SCRIPTS = pathlib.Path(__file__).resolve().parents[2] / "scripts"
if _SCRIPTS.is_dir() and str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))
