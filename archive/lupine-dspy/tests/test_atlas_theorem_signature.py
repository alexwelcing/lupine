"""Tests for the theorem-aware DSPy signature + inventory loader (§14.2).

Key guarantee: the signature module imports WITHOUT dspy installed. Because
dspy may be present in the dev environment, we verify the lazy-import contract
in an isolated subprocess where ``dspy`` is blocked from importing.
"""

import json
import subprocess
import sys
import textwrap
from pathlib import Path

from lupine_dspy.signatures.atlas_theorem_signature import (
    build_theorem_context,
    load_theorem_inventory,
)

FIXTURE = Path(__file__).parent / "fixtures" / "theorem_inventory.json"


class TestLoadTheoremInventory:
    def test_loads_fixture(self):
        ctx = load_theorem_inventory(FIXTURE)
        assert isinstance(ctx, list)
        assert len(ctx) == 3
        names = {t["name"] for t in ctx}
        assert "Atlas.RealAnalysis.Continuity" in names
        assert "OpenDistillationFactory.Materials.Elasticity.FCC" in names

    def test_missing_file_returns_empty(self):
        ctx = load_theorem_inventory(Path("does/not/exist/theorem_inventory.json"))
        assert ctx == []

    def test_bare_array(self, tmp_path):
        p = tmp_path / "inv.json"
        p.write_text(json.dumps([{"name": "Atlas.Foo"}, {"name": "Atlas.Bar"}]))
        ctx = load_theorem_inventory(p)
        assert len(ctx) == 2

    def test_bare_string_names_wrapped(self, tmp_path):
        p = tmp_path / "inv.json"
        p.write_text(json.dumps(["Atlas.Foo", "Atlas.Bar"]))
        ctx = load_theorem_inventory(p)
        assert ctx == [{"name": "Atlas.Foo"}, {"name": "Atlas.Bar"}]

    def test_name_keyed_object(self, tmp_path):
        p = tmp_path / "inv.json"
        p.write_text(json.dumps({"Atlas.Foo": {"kind": "imported"}}))
        ctx = load_theorem_inventory(p)
        assert ctx == [{"kind": "imported", "name": "Atlas.Foo"}]

    def test_malformed_json_raises(self, tmp_path):
        p = tmp_path / "bad.json"
        p.write_text("{not valid json")
        try:
            load_theorem_inventory(p)
        except ValueError:
            return
        raise AssertionError("expected ValueError on malformed JSON")

    def test_build_theorem_context_is_json_string(self):
        ctx = load_theorem_inventory(FIXTURE)
        s = build_theorem_context(ctx)
        assert isinstance(s, str)
        assert json.loads(s) == ctx


class TestLazyDspyImport:
    def test_module_imports_without_dspy(self):
        """Importing the signature module must NOT require dspy.

        Run in a subprocess with a meta_path finder that makes ``import dspy``
        raise ImportError, proving the module body has no hard dspy dependency.
        """
        script = textwrap.dedent(
            """
            import sys, importlib.abc, importlib.machinery

            class _BlockDspy(importlib.abc.MetaPathFinder):
                def find_spec(self, name, path, target=None):
                    if name == "dspy" or name.startswith("dspy."):
                        raise ImportError("dspy is blocked for this test")
                    return None

            sys.meta_path.insert(0, _BlockDspy())

            # Sanity: dspy is indeed unimportable now.
            try:
                import dspy
                print("FAIL: dspy imported despite block")
                sys.exit(2)
            except ImportError:
                pass

            # The target module + its package must import cleanly.
            import lupine_dspy.signatures as sigs
            from lupine_dspy.signatures import atlas_theorem_signature as ats

            # The inventory loader must work without dspy.
            assert ats.load_theorem_inventory("nope.json") == []

            # Building the signature should raise a clear ImportError (not crash).
            try:
                ats.get_theorem_guided_hypothesis()
                print("FAIL: expected ImportError building signature without dspy")
                sys.exit(3)
            except ImportError as e:
                assert "dspy is required" in str(e)

            print("OK")
            """
        )
        proc = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
            cwd=str(Path(__file__).parent.parent),  # lupine-dspy/ root
        )
        assert proc.returncode == 0, (
            f"subprocess failed (rc={proc.returncode})\n"
            f"STDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
        )
        assert "OK" in proc.stdout
