"""Tests for the neural-symbolic CPU nodes (Node 2 relay, Node 3 Lean synthesis).

These nodes consume a ``CurvatureBoundaryPayload`` (normally produced by the GPU
Node 1) and either relay it as an OpenInference span (Node 2) or synthesize a
machine-checked Lean theorem from it (Node 3). The committed ``fixture_payload.json``
stands in for the gitignored GPU payload so the suite runs CPU-only.

Import note — this test package is, by task convention, named ``neural_symbolic``,
the same name as the *real* package under ``runtime/python/scripts/neural_symbolic``
that holds the code under test. With pytest's default import machinery the bare name
``neural_symbolic`` binds to *this* package, which would shadow the real one and make
``from neural_symbolic import node2_relay`` fail. We resolve that by extending this
package's ``__path__`` to also cover the real source directory: the merged package
then exposes both the tests here and the node modules / ``payload`` over there, so
``from neural_symbolic.payload import ...`` (used by the nodes themselves) and
``from neural_symbolic import node2_relay, node3_lean_synth`` (used by the tests) all
resolve to the real implementation.
"""

from __future__ import annotations

import pathlib

# .../tests/neural_symbolic/__init__.py -> parents: [neural_symbolic, tests, python]
_REAL_PKG = (
    pathlib.Path(__file__).resolve().parents[2] / "scripts" / "neural_symbolic"
)
if _REAL_PKG.is_dir() and str(_REAL_PKG) not in __path__:
    __path__.append(str(_REAL_PKG))
