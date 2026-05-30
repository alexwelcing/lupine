"""CPU-only coverage for the neural-symbolic relay (Node 2) and Lean synth (Node 3).

The two nodes are normally fed by the GPU Node 1, whose payloads are gitignored and
absent in a fresh worktree. We substitute the committed ``fixture_payload.json`` (a
valid ``CurvatureBoundaryPayload`` representing a real T3-REJECT shear-curvature
breach) so both nodes can be exercised without torch or a GPU.

Node 2 is checked at two levels: the pure ``span_attributes`` contract, and the
degrade-mode ``main()`` that persists a durable JSON span artifact when no Phoenix
OTLP relay URL is configured. Node 3 is checked by synthesizing the Lean theorem and
*actually compiling it* with the ``lean`` toolchain (rc 0, 0 sorry).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

# The real ``neural_symbolic`` nodes resolve here because this test package's
# ``__init__`` extends ``__path__`` to the real ``scripts/neural_symbolic`` source dir
# (see that module's docstring); ``conftest`` also puts ``scripts/`` on sys.path.
from neural_symbolic import node2_relay, node3_lean_synth
from neural_symbolic.payload import CurvatureBoundaryPayload

FIXTURE = Path(__file__).resolve().parent / "fixture_payload.json"


def _load_payload() -> CurvatureBoundaryPayload:
    """Load the committed fixture exactly the way the nodes load Node 1 output."""
    return CurvatureBoundaryPayload.model_validate_json(FIXTURE.read_text(encoding="utf-8"))


@pytest.fixture()
def payload() -> CurvatureBoundaryPayload:
    return _load_payload()


# --------------------------------------------------------------------------------------
# Fixture contract
# --------------------------------------------------------------------------------------


def test_fixture_loads_and_is_a_reject_breach(payload: CurvatureBoundaryPayload) -> None:
    """The committed fixture is a valid payload describing a T3-REJECT breach."""
    assert payload.model_id == "test-mlip"
    assert payload.observable == "C44_shear"
    assert payload.structure_id == "Ni-fcc-shear-sweep"
    assert payload.reference_gpa == 124.7
    assert payload.verdict == "reject"
    assert payload.samples == ()
    # Deterministic Lean identifier derived from model_id + divergence strain (0.13).
    assert payload.lean_theorem_name() == "shear_manifold_invalid_test_mlip_beyond_1300"


# --------------------------------------------------------------------------------------
# Node 2 — relay span attributes
# --------------------------------------------------------------------------------------


def test_node2_span_attributes_complete(payload: CurvatureBoundaryPayload) -> None:
    """``span_attributes`` emits the full OpenInference EVALUATOR contract."""
    attrs = node2_relay.span_attributes(payload)

    # OpenInference framing.
    assert attrs["openinference.span.kind"] == "EVALUATOR"
    assert attrs["openinference.project.name"] == node2_relay.PROJECT

    # Proof / theorem provenance.
    assert attrs["lupine.proof.status"] == "reject"
    assert attrs["lupine.theorem.name"] == payload.lean_theorem_name()
    assert attrs["lupine.theorem.name"] == "shear_manifold_invalid_test_mlip_beyond_1300"
    assert attrs["lupine.build.atlas_revision"] == payload.atlas_revision
    assert attrs["lupine.build.mathlib_revision"] == payload.mathlib_revision

    # Curvature measurement carried onto the span.
    assert attrs["lupine.curvature.observable"] == "C44_shear"
    assert attrs["lupine.curvature.reference_gpa"] == 124.7
    assert attrs["lupine.curvature.elastic_prediction_gpa"] == 92.4
    assert attrs["lupine.curvature.deviation_pct"] == -25.9
    assert attrs["lupine.curvature.validated_strain_max"] == 0.1
    assert attrs["lupine.curvature.divergence_strain"] == 0.13

    # Model / structure identity.
    assert attrs["lupine.model.id"] == "test-mlip"
    assert attrs["lupine.structure.id"] == "Ni-fcc-shear-sweep"

    # Every value is OTLP-serializable (str / number / bool — no None, no objects).
    for key, value in attrs.items():
        assert isinstance(value, (str, int, float, bool)), f"{key} -> {type(value)!r}"


def test_node2_divergence_strain_none_is_sentinel() -> None:
    """A never-diverging payload reports the documented -1.0 sentinel, not None."""
    base = _load_payload()
    no_div = base.model_copy(update={"divergence_strain": None})
    attrs = node2_relay.span_attributes(no_div)
    assert attrs["lupine.curvature.divergence_strain"] == -1.0


def test_node2_main_degrade_mode_writes_span_artifact(
    payload: CurvatureBoundaryPayload, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """With no PHOENIX_OTLP_RELAY_URL, ``main()`` persists a durable JSON span artifact.

    ``main()`` reads ``node1_*.json`` from ``PAYLOAD_DIR`` and writes spans/manifest under
    ``RELAY_OUT``; both are module-level and derived from the repo root. We redirect them
    (and ``_REPO``, used only for log-relative paths) at a tmp dir to exercise the real
    artifact-writing path in isolation.
    """
    monkeypatch.delenv("PHOENIX_OTLP_RELAY_URL", raising=False)
    monkeypatch.delenv("PHOENIX_RELAY_TOKEN", raising=False)

    payload_dir = tmp_path / "neural_symbolic"
    relay_out = payload_dir / "relay_out"
    payload_dir.mkdir(parents=True)
    # Seed a Node-1-style payload file (the breach the relay should pick up).
    (payload_dir / "node1_test.json").write_text(payload.model_dump_json(), encoding="utf-8")

    monkeypatch.setattr(node2_relay, "PAYLOAD_DIR", payload_dir)
    monkeypatch.setattr(node2_relay, "RELAY_OUT", relay_out)
    monkeypatch.setattr(node2_relay, "_REPO", tmp_path)

    rc = node2_relay.main()
    assert rc == 0

    artifact = relay_out / f"span_{payload.model_id}.json"
    assert artifact.exists(), "degrade mode must persist a per-model span artifact"

    span = json.loads(artifact.read_text(encoding="utf-8"))
    assert span["name"] == "curvature_boundary_breach"
    assert span["attributes"]["openinference.span.kind"] == "EVALUATOR"
    assert span["attributes"]["lupine.proof.status"] == "reject"
    assert span["payload"]["model_id"] == "test-mlip"

    manifest = json.loads((relay_out / "relay_manifest.json").read_text(encoding="utf-8"))
    assert manifest["breaches"] == 1
    assert "durable local artifact" in manifest["mode"]


# --------------------------------------------------------------------------------------
# Node 3 — Lean synthesis + real compilation
# --------------------------------------------------------------------------------------


def test_node3_generate_lean_returns_source_and_two_theorems(
    payload: CurvatureBoundaryPayload,
) -> None:
    """``generate_lean`` returns a module name, Lean source, and exactly two theorems."""
    module_name, lean_source, theorem_names = node3_lean_synth.generate_lean(payload)

    assert module_name == "test_mlip"
    assert isinstance(lean_source, str) and lean_source.strip()
    assert len(theorem_names) == 2

    # Theorem names are fully-qualified under the model namespace.
    ns = "Lupine.NeuralSymbolic.test_mlip"
    assert theorem_names == [
        f"{ns}.test_mlip_shear_strain_beyond_manifold_is_invalid",
        f"{ns}.test_mlip_curvature_reject",
    ]

    # The source declares the namespace and both theorems.
    assert f"namespace {ns}" in lean_source
    assert "theorem test_mlip_shear_strain_beyond_manifold_is_invalid" in lean_source
    assert "theorem test_mlip_curvature_reject" in lean_source

    # Proofs are decidable, not stubbed. The literal word "sorry" *does* appear in the
    # generated doc-comment ("decided by native_decide — 0 sorry"), so we must check for
    # an actual `sorry` *proof term*, not the bare substring.
    assert "by decide" in lean_source
    for stub in (":= sorry", "by sorry", ":= by sorry", "  sorry"):
        assert stub not in lean_source, f"unexpected sorry proof term: {stub!r}"


def test_node3_synthesized_lean_compiles(
    payload: CurvatureBoundaryPayload, tmp_path: Path
) -> None:
    """The synthesized theorem is machine-checked: ``lean`` accepts it (rc 0, 0 sorry).

    ``verify`` shells out to ``lean`` (cwd ``lean-spec`` so elan selects the pinned
    toolchain) and returns ok == (rc 0 and no 'sorry' diagnostic). The generated file is
    import-free core Lean (``by decide``), so it compiles in seconds under any toolchain.
    """
    _, lean_source, _ = node3_lean_synth.generate_lean(payload)
    lean_file = tmp_path / "TestMlipShearBound.lean"
    lean_file.write_text(lean_source, encoding="utf-8")

    ok, diagnostics = node3_lean_synth.verify(lean_file)
    if not ok and "lean executable not found" in diagnostics:
        pytest.skip("lean toolchain not on PATH in this environment")
    assert ok is True, f"synthesized Lean failed to verify: {diagnostics!r}"
    assert "sorry" not in diagnostics.lower()
