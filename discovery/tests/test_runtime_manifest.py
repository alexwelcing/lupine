"""The staged and installed-tree manifest walkers must bind nested fixtures alike."""
from hashlib import sha256
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('reviewed_runtime_manifest',
    Path(__file__).resolve().parents[1] / 'scripts/runtime_manifest.py')
MANIFEST = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MANIFEST)


class RuntimeManifestTests(unittest.TestCase):
    def test_staged_and_worktree_bind_nested_python_and_json_identically(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            files = {'pyproject.toml': b'[project]\nname="fixture"\n',
                     'scripts/helper.py': b'# helper\n',
                     'tests/fixtures/worker.py': b'# constructed child\n',
                     'tests/fixtures/reports/unknown.json': b'{"known":false}\n',
                     'src/lupine_discovery/web/extra.js': b'"use strict";\n'}
            for name, raw in files.items():
                path = root / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(raw)
            subprocess.run(['git', 'init', '-q'], cwd=root, check=True, capture_output=True)
            subprocess.run(['git', 'add', '.'], cwd=root, check=True, capture_output=True)
            expected = {name: sha256(raw).hexdigest() for name, raw in files.items()}
            self.assertEqual(MANIFEST.source_files(root), expected)
            self.assertEqual(MANIFEST.source_files(root, staged=True), expected)
            nested = root / 'tests/fixtures/reports/unknown.json'
            nested.write_bytes(b'{"known":true}\n')
            self.assertNotEqual(MANIFEST.source_files(root)[str(nested.relative_to(root))], expected[str(nested.relative_to(root))])
            self.assertEqual(MANIFEST.source_files(root, staged=True), expected)

    def test_cache_and_nonruntime_files_are_excluded(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); (root/'pyproject.toml').write_bytes(b'')
            for name in ('tests/__pycache__/fixture.py', 'tests/fixtures/notes.txt', 'scripts/README.md'):
                path=root/name; path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(b'not runtime')
            self.assertEqual(MANIFEST.source_files(root), {'pyproject.toml': sha256(b'').hexdigest()})
