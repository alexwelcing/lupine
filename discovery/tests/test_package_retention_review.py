"""Independent artifact-custody tests: temporary Git trees and inert wheel bytes."""
from contextlib import ExitStack, redirect_stdout
from copy import deepcopy
from hashlib import sha256
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve()
PROJECT = next(p for p in HERE.parents if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
SOURCE = HERE.parent.parent / 'scripts/package_smoke.py' if '.cache' in HERE.parts else PROJECT / 'scripts/package_smoke.py'
spec = importlib.util.spec_from_file_location('retention_independent_review', SOURCE)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
INERT_WHEEL = b'Synthetic inert wheel bytes. No package installation or probe is performed.\n'
PROBE_SHA256 = '0500909f0aee8a3275b44d8c60ad8f3880247332966525c126141e8f8ced70c7'


class RetentionIndependentReview(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='independent-retention-')
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.stack.enter_context(patch.object(socket, 'create_connection', side_effect=AssertionError('network forbidden')))
        self.calls = []
        self.build_roots = []
        self.installed = []
        self.probe_action = None
        self.make_repository(self.base / 'repo')
        self.destination = self.base / 'release'
        self.checked_original = m.checked
        self.stack.enter_context(patch.object(m, '__file__', str(self.root / 'scripts/package_smoke.py')))
        self.stack.enter_context(patch.object(m, 'checked', side_effect=self.fake_checked))

    def git(self, *arguments):
        return subprocess.check_output(['git', '-c', 'maintenance.auto=false', '-c', 'gc.auto=0', *arguments], cwd=self.repo, stderr=subprocess.PIPE)

    def make_repository(self, repo, *, standalone=False, object_format='sha1'):
        self.repo = repo
        self.repo.mkdir()
        self.root = repo if standalone else repo / 'discovery'
        for part in ('scripts', 'src/lupine_discovery', 'tests', 'reports', 'docs'):
            (self.root / part).mkdir(parents=True, exist_ok=True)
        (repo / '.github/workflows').mkdir(parents=True)
        (repo / '.github/workflows/discovery-verify.yml').write_text('name: synthetic only\n')
        if not standalone:
            (repo / 'unrelated').mkdir()
            (repo / 'unrelated/private.txt').write_text('Not in the declared archive copyset\n')
        (repo / '.gitignore').write_text('.cache/\n__pycache__/\n.env\n')
        (self.root / 'README.md').write_text('An inert committed README.\n')
        (self.root / 'docs/note.md').write_text('No source data or scientific outcomes.\n')
        (self.root / 'pyproject.toml').write_text('[project]\nname="lupine-discovery"\nversion="0.0.0"\n')
        (self.root / 'scripts/package_smoke.py').write_bytes(SOURCE.read_bytes())
        (self.root / 'scripts/runtime_manifest.py').write_bytes((PROJECT / 'scripts/runtime_manifest.py').read_bytes())
        (self.root / 'src/lupine_discovery/__init__.py').write_text('fixture = True\n')
        self.refresh_manifest()
        self.git('init', '-q', '--object-format=' + object_format)
        self.git('config', 'user.name', 'Independent Synthetic Test')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('config', 'commit.gpgsign', 'false')
        self.git('config', 'core.hooksPath', str(self.base / 'no-hooks'))
        self.git('config', 'core.attributesFile', os.devnull)
        self.commit()

    def refresh_manifest(self):
        # Independent enumeration of this small fixture, not the producer helper.
        names = ('pyproject.toml', 'scripts/package_smoke.py', 'scripts/runtime_manifest.py',
                 'src/lupine_discovery/__init__.py')
        value = {'schema':'lupine.discovery.runtime-manifest.v1', 'checkpoint':'independent-inert-fixture',
                 'python':sys.version.split()[0],
                 'files':{name:sha256((self.root / name).read_bytes()).hexdigest() for name in names}}
        (self.root / 'reports/runtime-manifest.json').write_text(json.dumps(value, sort_keys=True) + '\n')

    def commit(self):
        self.git('add', '.')
        self.git('commit', '-qm', 'Inert independent fixture')

    def fake_checked(self, command, cwd):
        self.calls.append(list(command))
        if command[-1].endswith('scripts/runtime_manifest.py'):
            return self.checked_original(command, cwd)
        if command[1:4] == ['-m', 'pip', 'wheel']:
            self.build_roots.append(Path(command[4]))
            self.work = Path(cwd)
            self.wheel = Path(command[-1]) / 'lupine_discovery-0.0.0-py3-none-any.whl'
            self.wheel.write_bytes(INERT_WHEEL)
            return ''
        if command[1:3] == ['-m', 'venv']:
            Path(command[-1]).mkdir()
            return ''
        if command[1:4] == ['-m', 'pip', 'install']:
            self.installed.append(Path(command[-1]).read_bytes())
            return ''
        if command[1:3] == ['-I', '-c']:
            self.assertEqual(sha256(command[3].encode()).hexdigest(), PROBE_SHA256)
            if self.probe_action:
                self.probe_action()
            return json.dumps({'status':'passed','isolated_install':True, 'case_count':0,
                               'problem_schemas':[], 'checks':['inert synthetic transport stub']})
        self.fail('Unexpected command in synthetic review: ' + repr(command))

    def test_retained_artifacts_match_installed_bytes_and_every_scoped_git_blob(self):
        (self.root / '.cache').mkdir()
        (self.root / '.cache/PRIVATE').write_text('Ignored cache sentinel')
        (self.root / '.env').write_text('Ignored local environment sentinel')
        report = m.run(self.destination)
        self.assertEqual(self.installed, [INERT_WHEEL])
        receipt_path = self.destination / 'release-artifacts.json'
        raw = receipt_path.read_bytes()
        receipt = json.loads(raw)
        self.assertEqual(sha256(raw).hexdigest(), report['retention']['receipt_sha256'])
        payload = {k:v for k,v in receipt.items() if k != 'content_sha256'}
        canonical = (json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False) + '\n').encode()
        self.assertEqual(receipt['content_sha256'], sha256(canonical).hexdigest())
        self.assertEqual(receipt['verification']['wheel_sha256'], sha256(INERT_WHEEL).hexdigest())
        self.assertEqual(receipt['source']['git_commit'], self.git('rev-parse', 'HEAD').decode().strip())
        for description in receipt['artifacts'].values():
            retained = self.destination / description['filename']
            self.assertEqual(retained.stat().st_size, description['bytes'])
            self.assertEqual(sha256(retained.read_bytes()).hexdigest(), description['sha256'])
        archive = self.destination / receipt['artifacts']['source_archive']['filename']
        with tarfile.open(archive) as bundle:
            for member in bundle.getmembers():
                if member.isfile():
                    path = member.name.removeprefix('lupine-source/')
                    self.assertTrue(path.startswith('discovery/') or path == '.github/workflows/discovery-verify.yml')
                    self.assertEqual(bundle.extractfile(member).read(), self.git('show', 'HEAD:' + path))
            self.assertFalse(any('.cache/' in x or '/.env' in x or 'unrelated/' in x for x in bundle.getnames()))
        self.assertNotEqual(self.build_roots, [self.root])
        self.assertFalse((self.build_roots[0] / '.cache').exists())
        self.assertEqual(self.git('status', '--porcelain'), b'')

    def test_export_ignore_in_untracked_git_info_attributes_cannot_change_copyset(self):
        (self.repo / '.git/info/attributes').write_text('discovery/README.md export-ignore\n')
        self.assertEqual(self.git('status', '--porcelain'), b'')
        with self.assertRaisesRegex(RuntimeError, 'full declared copyset'):
            m.run(self.destination)
        self.assertFalse(self.build_roots)
        self.assertFalse(self.destination.exists())

    def test_export_subst_plus_hidden_matching_worktree_is_rejected_against_git_blob(self):
        (self.root / 'README.md').write_text('$Format:%H$\n')
        (self.root / '.gitattributes').write_text('README.md export-subst\n')
        self.commit()
        literal = self.git('show', 'HEAD:discovery/README.md')
        expanded = self.git('rev-parse', 'HEAD')
        self.git('update-index', '--assume-unchanged', 'discovery/README.md')
        (self.root / 'README.md').write_bytes(expanded)
        self.assertNotEqual(literal, expanded)
        self.assertEqual(self.git('status', '--porcelain'), b'')
        with self.assertRaisesRegex(RuntimeError, 'committed Git blob'):
            m.run(self.destination)
        self.assertFalse(self.build_roots)
        self.assertEqual((self.root / 'README.md').read_bytes(), expanded)
        self.assertFalse(self.destination.exists())

    def test_skip_worktree_cannot_hide_nonmanifest_document_edits(self):
        self.git('update-index', '--skip-worktree', 'discovery/docs/note.md')
        changed = b'Uncommitted hidden user document\n'
        (self.root / 'docs/note.md').write_bytes(changed)
        self.assertEqual(self.git('status', '--porcelain'), b'')
        with self.assertRaisesRegex(RuntimeError, 'working source differs'):
            m.run(self.destination)
        self.assertFalse(self.build_roots)
        self.assertEqual((self.root / 'docs/note.md').read_bytes(), changed)
        self.assertFalse(self.destination.exists())

    def test_original_archive_hash_survives_probe_and_is_checked_before_publication(self):
        def modify_archive():
            archive, = self.work.glob('*.tar')
            with archive.open('ab') as stream:
                stream.write(b'Changed after build/probe input snapshot')
        self.probe_action = modify_archive
        with self.assertRaisesRegex(RuntimeError, 'Source archive bytes changed'):
            m.run(self.destination)
        self.assertFalse(self.destination.exists())

    def test_wheel_changed_after_install_cannot_get_completion_receipt(self):
        self.probe_action = lambda: self.wheel.write_bytes(b'Replacement wheel after install')
        with self.assertRaisesRegex(RuntimeError, 'Wheel bytes changed'):
            m.run(self.destination)
        self.assertEqual(self.installed, [INERT_WHEEL])
        self.assertFalse(self.destination.exists())

    def test_receipt_not_written_when_second_artifact_publication_fails(self):
        original_open = Path.open
        def fault(path, *args, **kwargs):
            if path.parent == self.destination and path.suffix == '.tar' and args and args[0] == 'xb':
                raise OSError('synthetic publication failure')
            return original_open(path, *args, **kwargs)
        with patch.object(Path, 'open', fault), self.assertRaises(OSError):
            m.run(self.destination)
        self.assertTrue(self.destination.is_dir())
        self.assertFalse((self.destination / 'release-artifacts.json').exists())
        wheel, = self.destination.glob('*.whl')
        self.assertEqual(wheel.read_bytes(), INERT_WHEEL)
        with self.assertRaisesRegex(RuntimeError, 'must be new'):
            m.run(self.destination)
        self.assertEqual(wheel.read_bytes(), INERT_WHEEL)

    def test_failed_completion_flush_leaves_no_completion_named_receipt(self):
        with patch.object(m.os, 'fsync', side_effect=OSError('synthetic completion flush failure')):
            with self.assertRaises(OSError):
                m.run(self.destination)
        self.assertTrue(self.destination.is_dir())
        self.assertFalse((self.destination / 'release-artifacts.json').exists())
        self.assertFalse(list(self.destination.glob('.lupine-artifact-*')))
        wheel, = self.destination.glob('*.whl')
        self.assertEqual(wheel.read_bytes(), INERT_WHEEL)

    def test_changed_parent_cleanup_preserves_unrelated_outside_file(self):
        parent = self.base / 'publication-parent'; parent.mkdir()
        outside = self.base / 'outside'; outside.mkdir()
        moved = self.base / 'original-parent'
        captured = {}
        sentinel = b'Unrelated preexisting file must survive failed publication'

        def replace_parent(_descriptor):
            if captured:
                return
            temporary, = parent.glob('.lupine-artifact-*')
            captured['name'] = temporary.name
            parent.rename(moved)
            parent.symlink_to(outside, target_is_directory=True)
            (outside / temporary.name).write_bytes(sentinel)

        with patch.object(m.os, 'fsync', side_effect=replace_parent):
            with self.assertRaises(RuntimeError):
                m._write_new_file(parent / 'receipt.json', b'{"fixture":true}\n')
        self.assertTrue(captured)
        self.assertEqual((outside / captured['name']).read_bytes(), sentinel)
        self.assertFalse((outside / 'receipt.json').exists())
        self.assertFalse((moved / 'receipt.json').exists())
        self.assertFalse((moved / captured['name']).exists())

    def test_optional_output_rechecks_parent_after_long_smoke(self):
        parent = self.base / 'report-parent'; parent.mkdir()
        outside = self.base / 'outside'; outside.mkdir()
        moved = self.base / 'original-parent'
        report = {'status':'passed', 'case_count':0, 'problem_schemas':[],
                  'checks':['synthetic stub, no package probe']}

        def fake_run(_destination):
            parent.rename(moved)
            parent.symlink_to(outside, target_is_directory=True)
            return report

        with patch.object(m, 'run', side_effect=fake_run), redirect_stdout(io.StringIO()):
            with self.assertRaises(RuntimeError):
                m.main(['--retain-directory', str(self.destination),
                        '--output', str(parent / 'smoke.json')])
        self.assertFalse((outside / 'smoke.json').exists())
        self.assertFalse((moved / 'smoke.json').exists())

    def test_existing_file_directory_symlink_and_ancestor_are_never_overwritten(self):
        old = self.base / 'old'
        old.mkdir()
        (old / 'sentinel').write_bytes(b'Keep this existing artifact')
        link = self.base / 'link'; link.symlink_to(old, target_is_directory=True)
        existing_file = self.base / 'file'; existing_file.write_bytes(b'Unrelated user content')
        for destination in (old, link, link / 'new', existing_file):
            with self.assertRaises(RuntimeError):
                m.run(destination)
        self.assertFalse(self.calls)
        self.assertEqual((old / 'sentinel').read_bytes(), b'Keep this existing artifact')
        self.assertEqual(existing_file.read_bytes(), b'Unrelated user content')
        self.assertFalse((old / 'new').exists())

    def test_default_development_path_and_reviewed_probe_contract(self):
        (self.root / 'README.md').write_text('Dirty development source is permitted by the old default')
        report = m.run()
        self.assertEqual(self.build_roots, [self.root])
        self.assertNotIn('retention', report)
        self.assertEqual(report['schema'], 'lupine.discovery.package_verification.v1')
        self.assertEqual(sha256(m.PROBE.encode()).hexdigest(), PROBE_SHA256)
        self.assertFalse(any(call[-1].endswith('runtime_manifest.py') for call in self.calls))

    def test_standalone_checkout_can_retain_its_project_tree(self):
        self.make_repository(self.base / 'standalone', standalone=True)
        with patch.object(m, '__file__', str(self.root / 'scripts/package_smoke.py')):
            report = m.run(self.destination)
        receipt = json.loads((self.destination / 'release-artifacts.json').read_bytes())
        self.assertEqual(receipt['source']['project_path'], '.')
        self.assertEqual(receipt['source']['archive_copyset'], ['.'])
        with tarfile.open(self.destination / receipt['artifacts']['source_archive']['filename']) as bundle:
            self.assertIn('lupine-source/pyproject.toml', bundle.getnames())
            self.assertNotIn('lupine-source/discovery/pyproject.toml', bundle.getnames())
        self.assertEqual(report['status'], 'passed')

    def test_sha256_git_object_format_uses_the_actual_blob_hash_domain(self):
        self.make_repository(self.base / 'sha256', object_format='sha256')
        with patch.object(m, '__file__', str(self.root / 'scripts/package_smoke.py')):
            report = m.run(self.destination)
        receipt = json.loads((self.destination / 'release-artifacts.json').read_bytes())
        self.assertEqual(len(receipt['source']['git_commit']), 64)
        self.assertEqual(report['retention']['git_commit'], self.git('rev-parse', 'HEAD').decode().strip())

    def test_tracked_links_and_cache_content_never_enter_archive(self):
        (self.root / 'docs/symlink').symlink_to('../README.md')
        self.commit()
        with self.assertRaisesRegex(RuntimeError, 'unsupported links'):
            m.run(self.destination)
        self.assertFalse(self.build_roots)
        (self.root / 'docs/symlink').unlink()
        self.commit()
        (self.root / '.cache').mkdir()
        (self.root / '.cache/private.bin').write_bytes(b'Synthetic raw cache sentinel')
        self.git('add', '-f', 'discovery/.cache/private.bin')
        self.git('commit', '-qm', 'Deliberately prohibited tracked cache')
        with self.assertRaisesRegex(RuntimeError, 'cache files'):
            m.run(self.destination)
        self.assertFalse(self.destination.exists())


if __name__ == '__main__':
    unittest.main()
