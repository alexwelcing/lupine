"""Synthetic release-custody checks; no wheel builds, browsers or data acquisition."""
from hashlib import sha256
import importlib.util
from io import StringIO
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('package_smoke_retention', ROOT / 'scripts/package_smoke.py')
smoke = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(smoke)
# Scratch and promoted tests use the same project-relative source location.
PROJECT = next(p for p in Path(__file__).resolve().parents if p.name == 'discovery' and (p / 'AGENTS.md').exists())
MANIFEST_SPEC = importlib.util.spec_from_file_location('retention_runtime_manifest', PROJECT / 'scripts/runtime_manifest.py')
manifest = importlib.util.module_from_spec(MANIFEST_SPEC)
MANIFEST_SPEC.loader.exec_module(manifest)
WHEEL = b'constructed wheel bytes for custody checks only; never installed'


class PackageRetentionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='lupine-release-test-')
        self.base = Path(self.temporary.name)
        self.repository = self.base / 'repo'
        self.repository.mkdir()
        self.project = self.repository / 'discovery'
        for directory in ('scripts', 'reports', 'docs', 'formal', 'src/lupine_discovery', 'tests'):
            (self.project / directory).mkdir(parents=True)
        (self.repository / '.github/workflows').mkdir(parents=True)
        (self.repository / '.github/workflows/discovery-verify.yml').write_text('name: synthetic workflow\n')
        (self.repository / 'other-project').mkdir()
        (self.repository / 'other-project/private.txt').write_text('unrelated committed project: exclude from copyset')
        (self.repository / '.gitignore').write_text('.cache/\n*.egg-info/\nbuild/\n.env\n__pycache__/\n')
        (self.project / 'pyproject.toml').write_text('[project]\nname="lupine-discovery"\nversion="0.1.0"\n')
        (self.project / 'scripts/package_smoke.py').write_bytes((ROOT / 'scripts/package_smoke.py').read_bytes())
        (self.project / 'scripts/runtime_manifest.py').write_bytes((PROJECT / 'scripts/runtime_manifest.py').read_bytes())
        (self.project / 'README.md').write_text('Committed synthetic source snapshot\n')
        (self.project / 'docs/protocol.md').write_text('Synthetic protocol, no dataset\n')
        (self.project / 'formal/Example.lean').write_text('theorem example_true : True := True.intro\n')
        (self.project / 'src/lupine_discovery/__init__.py').write_text('__version__="0.1.0"\n')
        self.refresh_manifest()
        self.git('init', '-q')
        self.git('config', 'user.name', 'Synthetic Test')
        self.git('config', 'user.email', 'test@example.invalid')
        self.commit()
        self.commit_id = self.git('rev-parse', 'HEAD').strip()
        self.destination = self.base / 'retained'
        self.commands = []
        self.mutate_during_probe = None
        self.original_checked = smoke.checked
        self.script_patch = patch.object(smoke, '__file__', str(self.project / 'scripts/package_smoke.py'))
        self.command_patch = patch.object(smoke, 'checked', side_effect=self.fake_checked)
        self.script_patch.start()
        self.command_patch.start()
        self.addCleanup(self.command_patch.stop)
        self.addCleanup(self.script_patch.stop)
        self.addCleanup(self.temporary.cleanup)

    def git(self, *args):
        return subprocess.check_output(['git', '-c', 'maintenance.auto=false', '-c', 'gc.auto=0', '-c', 'core.hooksPath=/dev/null',
            '-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', *args],
            cwd=self.repository, stderr=subprocess.PIPE, text=True)

    def commit(self):
        self.git('add', '.')
        self.git('commit', '-qm', 'Synthetic fixture checkpoint')

    def refresh_manifest(self):
        value = {'schema':'lupine.discovery.runtime-manifest.v1','python':sys.version.split()[0],
                 'checkpoint':'synthetic-retention-fixture','files':manifest.source_files(self.project)}
        (self.project / 'reports/runtime-manifest.json').write_text(json.dumps(value, sort_keys=True))

    def fake_checked(self, command, cwd):
        self.commands.append(tuple(command))
        if command[-1].endswith('scripts/runtime_manifest.py'):
            return self.original_checked(command, cwd)
        if command[1:4] == ['-m', 'pip', 'wheel']:
            build_root = Path(command[4])
            self.build_root = build_root
            self.assertTrue((build_root / 'README.md').is_file())
            destination = Path(command[-1]) / 'lupine_discovery-0.1.0-py3-none-any.whl'
            destination.write_bytes(WHEEL)
            self.wheel_path = destination
            return ''
        if command[1:3] == ['-m', 'venv']:
            Path(command[-1]).mkdir()
            return ''
        if command[1:4] == ['-m', 'pip', 'install']:
            self.assertEqual(Path(command[-1]).read_bytes(), WHEEL)
            return ''
        if command[1:3] == ['-I', '-c']:
            self.assertEqual(command[3], smoke.PROBE)
            if self.mutate_during_probe:
                self.mutate_during_probe()
            return json.dumps({'status':'passed','isolated_install':True,'case_count':28,
                               'problem_schemas':['synthetic'],'checks':['synthetic-custody-probe']})
        self.fail(f'Unexpected command: {command!r}')

    def test_retained_wheel_is_exact_installed_bytes_and_source_archive_is_committed_copyset(self):
        (self.project / '.cache').mkdir()
        (self.project / '.cache/secret').write_text('ignored cache sentinel')
        (self.project / '.env').write_text('ignored environment sentinel')
        report = smoke.run(self.destination)
        self.assertNotEqual(self.build_root, self.project)
        self.assertFalse((self.build_root / '.cache').exists())
        self.assertFalse((self.build_root / '.env').exists())
        receipt_path = self.destination / 'release-artifacts.json'
        receipt = json.loads(receipt_path.read_text())
        expected_seal = sha256(smoke._canonical({k:v for k,v in receipt.items() if k!='content_sha256'})).hexdigest()
        self.assertEqual(receipt['content_sha256'], expected_seal)
        self.assertEqual(report['retention']['receipt_sha256'], sha256(receipt_path.read_bytes()).hexdigest())
        self.assertEqual(receipt['source']['git_commit'], self.commit_id)
        self.assertEqual(receipt['source']['archive_copyset'], ['discovery','.github/workflows/discovery-verify.yml'])
        wheel = self.destination / receipt['artifacts']['wheel']['filename']
        self.assertEqual(wheel.read_bytes(), WHEEL)
        self.assertEqual(receipt['artifacts']['wheel']['sha256'], report['wheel_sha256'])
        archive = self.destination / receipt['artifacts']['source_archive']['filename']
        with tarfile.open(archive) as bundle:
            names = bundle.getnames()
            self.assertIn('lupine-source/discovery/formal/Example.lean', names)
            self.assertIn('lupine-source/discovery/docs/protocol.md', names)
            self.assertIn('lupine-source/.github/workflows/discovery-verify.yml', names)
            self.assertFalse(any('.cache' in n or '.env' in n or 'other-project' in n for n in names))
        self.assertEqual(self.git('status','--porcelain'), '')

    def test_dirty_or_untracked_worktree_rejects_before_build_and_never_overwrites_edit(self):
        changed = self.project / 'README.md'
        changed.write_text('Uncommitted user edit')
        with self.assertRaisesRegex(RuntimeError, 'clean Git worktree'):
            smoke.run(self.destination)
        self.assertEqual(changed.read_text(), 'Uncommitted user edit')
        self.assertFalse(self.commands)
        self.assertFalse(self.destination.exists())
        self.git('checkout','--','discovery/README.md')
        (self.project / 'untracked.txt').write_text('User work')
        with self.assertRaisesRegex(RuntimeError, 'clean Git worktree'):
            smoke.run(self.destination)
        self.assertFalse(self.destination.exists())

    def test_assume_unchanged_cannot_hide_source_edits_from_release_binding(self):
        self.git('update-index','--assume-unchanged','discovery/README.md')
        (self.project/'README.md').write_text('Hidden local edit remains user-owned')
        self.assertEqual(self.git('status','--porcelain'),'')
        with self.assertRaisesRegex(RuntimeError,'differs from the committed archive'):
            smoke.run(self.destination)
        self.assertFalse(self.destination.exists())
        self.assertEqual((self.project/'README.md').read_text(),'Hidden local edit remains user-owned')

    def test_stale_committed_manifest_rejects_before_build(self):
        (self.project / 'src/lupine_discovery/__init__.py').write_text('changed=1\n')
        self.commit()
        with self.assertRaises(RuntimeError):
            smoke.run(self.destination)
        self.assertFalse(any('wheel' in command for command in self.commands))
        self.assertFalse(self.destination.exists())

    def test_source_mutation_or_new_commit_during_probe_prevents_publication(self):
        self.mutate_during_probe=lambda: (self.project / 'README.md').write_text('changed during smoke')
        with self.assertRaisesRegex(RuntimeError, 'clean Git worktree'):
            smoke.run(self.destination)
        self.assertFalse(self.destination.exists())
        self.git('checkout','--','discovery/README.md')
        def advance_commit():
            (self.project / 'README.md').write_text('new clean commit during smoke')
            self.commit()
        self.mutate_during_probe=advance_commit
        with self.assertRaisesRegex(RuntimeError, 'source state changed'):
            smoke.run(self.destination)
        self.assertFalse(self.destination.exists())

    def test_wheel_mutation_after_install_is_rejected(self):
        self.mutate_during_probe=lambda: self.wheel_path.write_bytes(b'not the installed wheel')
        with self.assertRaisesRegex(RuntimeError, 'Wheel bytes changed'):
            smoke.run(self.destination)
        self.assertFalse(self.destination.exists())

    def test_source_archive_mutation_during_probe_is_rejected(self):
        def change_archive():
            archive = next(self.build_root.parents[2].glob('lupine-discovery-source-*.tar'))
            archive.write_bytes(b'not the archive used to build the installed wheel')
        self.mutate_during_probe = change_archive
        with self.assertRaisesRegex(RuntimeError, 'Source archive bytes changed'):
            smoke.run(self.destination)
        self.assertFalse(self.destination.exists())

    def test_existing_destinations_and_symlink_ancestors_are_rejected_without_writes(self):
        self.destination.mkdir()
        sentinel=self.destination/'user.txt'; sentinel.write_text('preserve')
        with self.assertRaisesRegex(RuntimeError, 'must be new'):
            smoke.run(self.destination)
        self.assertEqual(sentinel.read_text(),'preserve')
        link=self.base/'linked'; link.symlink_to(self.destination,target_is_directory=True)
        with self.assertRaisesRegex(RuntimeError, 'no symlinked ancestors'):
            smoke.run(link/'new')
        self.assertFalse(self.commands)

    def test_archive_rejects_export_ignored_file_and_tracked_symlink(self):
        (self.project/'.gitattributes').write_text('README.md export-ignore\n')
        self.commit()
        with self.assertRaisesRegex(RuntimeError,'full declared copyset'):
            smoke.run(self.destination)
        self.assertFalse(self.destination.exists())
        (self.project/'.gitattributes').unlink()
        (self.project/'link').symlink_to('README.md')
        self.commit()
        with self.assertRaisesRegex(RuntimeError,'unsupported links'):
            smoke.run(self.destination)

    def test_archive_rejects_even_tracked_cache_contents(self):
        (self.project/'.cache').mkdir()
        (self.project/'.cache/private').write_text('never export')
        self.git('add','-f','discovery/.cache/private')
        self.git('commit','-qm','Synthetic prohibited tracked cache')
        with self.assertRaisesRegex(RuntimeError,'cache files'):
            smoke.run(self.destination)
        self.assertFalse(self.destination.exists())

    def test_archive_rejects_export_substitution_even_when_hidden_worktree_edit_matches(self):
        (self.project / 'README.md').write_text('$Format:%H$\n')
        (self.project / '.gitattributes').write_text('README.md export-subst\n')
        self.commit()
        self.git('update-index', '--assume-unchanged', 'discovery/README.md')
        expanded = self.git('rev-parse', 'HEAD')
        (self.project / 'README.md').write_text(expanded)
        self.assertEqual(self.git('status', '--porcelain'), '')
        with self.assertRaisesRegex(RuntimeError, 'differs from its committed Git blob'):
            smoke.run(self.destination)
        self.assertFalse(self.destination.exists())
        self.assertEqual((self.project / 'README.md').read_text(), expanded)

    def test_default_smoke_keeps_worktree_build_and_existing_report_shape(self):
        (self.project/'README.md').write_text('Default smoke permits development edits')
        result=smoke.run()
        self.assertEqual(self.build_root,self.project)
        self.assertNotIn('retention',result)
        self.assertNotIn('source',result)
        self.assertEqual(result['wheel_sha256'],sha256(WHEEL).hexdigest())
        self.assertFalse(any(command[-1].endswith('runtime_manifest.py') for command in self.commands))

    def test_retention_cli_will_not_overwrite_existing_output_or_retained_artifact(self):
        output=self.base/'existing.json'; output.write_text('preserve')
        with patch.object(smoke,'run',side_effect=AssertionError('should not run')):
            with self.assertRaisesRegex(RuntimeError,'must be new'):
                smoke.main(['--retain-directory',str(self.destination),'--output',str(output)])
        self.assertEqual(output.read_text(),'preserve')
        # Receipt is written last by run; explicit --output must not replace it.
        receipt=self.destination/'release-artifacts.json'
        with patch('sys.stdout',new=StringIO()), self.assertRaisesRegex(RuntimeError, 'must be new'):
            smoke.main(['--retain-directory',str(self.destination),'--output',str(receipt)])
        self.assertEqual(json.loads(receipt.read_text())['schema'],'lupine.discovery.release_artifacts.v1')

    def test_explicit_output_rechecks_parent_after_smoke(self):
        parent = self.base / 'output-parent'
        parent.mkdir()
        elsewhere = self.base / 'elsewhere'
        elsewhere.mkdir()
        def swap_parent(*_):
            parent.rmdir()
            parent.symlink_to(elsewhere, target_is_directory=True)
            return {'status':'passed'}
        with patch.object(smoke, 'run', side_effect=swap_parent):
            with self.assertRaisesRegex(RuntimeError, 'no symlinked ancestors'):
                smoke.main(['--retain-directory',str(self.destination),'--output',str(parent/'report.json')])
        self.assertFalse((elsewhere / 'report.json').exists())

    def test_completion_receipt_write_failure_leaves_no_completion_named_file(self):
        with patch.object(smoke.os, 'fsync', side_effect=OSError('injected flush failure')):
            with self.assertRaisesRegex(OSError, 'injected flush failure'):
                smoke.run(self.destination)
        self.assertFalse((self.destination / 'release-artifacts.json').exists())
        self.assertFalse(list(self.destination.glob('.lupine-artifact-*')))
        self.assertEqual(len(list(self.destination.iterdir())), 2)

    def test_parent_swap_cleanup_never_unlinks_unrelated_same_named_file(self):
        parent=self.base/'sink'; parent.mkdir()
        moved=self.base/'moved'; outside=self.base/'outside'; outside.mkdir()
        sentinels=[]
        def swap(_fd):
            temporary=next(parent.glob('.lupine-artifact-*'))
            parent.rename(moved)
            parent.symlink_to(outside,target_is_directory=True)
            sentinel=outside/temporary.name
            sentinel.write_bytes(b'preserve unrelated user file')
            sentinels.append(sentinel)
        with patch.object(smoke.os,'fsync',side_effect=swap):
            with self.assertRaisesRegex(RuntimeError,'no symlinked ancestors'):
                smoke._write_new_file(parent/'report.json',b'complete report')
        self.assertEqual(sentinels[0].read_bytes(),b'preserve unrelated user file')
        self.assertFalse(list(moved.iterdir()))
        self.assertFalse((outside/'report.json').exists())

    def test_child_cannot_import_caller_pythonpath_but_keeps_other_settings(self):
        source_only = self.base / 'caller-source'
        source_only.mkdir()
        (source_only / 'lupine_path_canary.py').write_text('VALUE = "synthetic"\n')
        command = [sys.executable, '-c',
                   'import importlib.util,json,os; print(json.dumps({'
                   '"source_visible":importlib.util.find_spec("lupine_path_canary") is not None,'
                   '"marker":os.environ.get("LUPINE_TEST_CHILD_MARKER")}))']
        environment = {**os.environ, 'PYTHONPATH': str(source_only),
                       'LUPINE_TEST_CHILD_MARKER': 'preserved-synthetic-setting'}
        control = subprocess.run(command, cwd=self.base, env=environment,
                                 capture_output=True, text=True, check=True)
        self.assertTrue(json.loads(control.stdout)['source_visible'])
        with patch.dict(os.environ, environment, clear=True):
            isolated = json.loads(self.original_checked(command, self.base))
        self.assertFalse(isolated['source_visible'])
        self.assertEqual(isolated['marker'], 'preserved-synthetic-setting')

    def test_reviewed_eighteen_check_probe_is_pinned(self):
        # Reviewed six-mode and prospective-planning installed probe plus historical census and source readiness (18 checks).
        # Deliberate changes require an explicit reviewed fixed-hash update.
        self.assertEqual(sha256(smoke.PROBE.encode()).hexdigest(), '0500909f0aee8a3275b44d8c60ad8f3880247332966525c126141e8f8ced70c7')



if __name__=='__main__':
    unittest.main()
