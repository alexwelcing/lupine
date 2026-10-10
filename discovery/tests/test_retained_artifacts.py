"""Synthetic Git/archive/wheel fixtures; never build/install/import artifacts."""
from copy import deepcopy
from hashlib import sha256
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import tarfile
import tempfile
import unittest
import zipfile

ROOT=next(p for p in Path(__file__).resolve().parents if (p/'src/lupine_discovery/decision_pool.py').is_file())
SPEC = importlib.util.spec_from_file_location('retained_verifier_review', Path(__file__).resolve().parents[1]/'scripts/verify_retained_artifacts.py')
v = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(v)


class ArtifactVerifierTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='artifact-verifier-synthetic-')
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.repo = self.base / 'repository'; self.repo.mkdir()
        self.directory = self.base / 'artifacts'; self.directory.mkdir()
        self.contents = {
            'discovery/pyproject.toml': b'[project]\nname="fixture"\nversion="0.0.0"\n',
            'discovery/scripts/check.py': b'# Never executed synthetic source\n',
            'discovery/tests/test_example.py': b'# Never executed synthetic test source\n',
            'discovery/src/lupine_discovery/__init__.py': b'# Never imported synthetic package\n',
            'discovery/docs/note.md': b'Inert source copyset fixture\n',
            '.github/workflows/discovery-verify.yml': b'name: synthetic only\n'}
        for name, raw in self.contents.items():
            path = self.repo / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(raw)
        manifest = {'schema':'lupine.discovery.runtime-manifest.v1', 'checkpoint':'synthetic', 'python':'3.12.0',
            'files':{name.removeprefix('discovery/'):v.digest(raw) for name, raw in self.contents.items()
                     if name.startswith('discovery/') and name.endswith(('.py','.toml'))}}
        self.manifest_path = self.repo / 'discovery/reports/runtime-manifest.json'
        self.manifest_path.parent.mkdir(); self.manifest_path.write_bytes(v.canonical(manifest))
        self.git('init', '-q'); self.git('config','core.attributesFile', os.devnull)
        self.commit()
        self.make_wheel()
        self.refresh_archive_receipt()

    def git(self, *args):
        return subprocess.check_output(['git','-c','core.hooksPath=/dev/null','-c','commit.gpgsign=false',*args],
                                       cwd=self.repo, stderr=subprocess.PIPE)

    def commit(self):
        self.git('add','.')
        self.git('-c','user.name=Inert Fixture','-c','user.email=fixture@example.invalid','commit','-qm','Synthetic fixture')
        self.commit_id = self.git('rev-parse','HEAD').decode().strip()

    def make_wheel(self):
        files = {'lupine_discovery/__init__.py':b'INERT synthetic bytes; never import',
                 'lupine_discovery/web/mpea.js':b'// INERT synthetic asset; never execute\n',
                 'lupine_discovery-0.1.0.dist-info/METADATA':b'Name: lupine-discovery\nVersion: 0.1.0\n',
                 'lupine_discovery-0.1.0.dist-info/WHEEL':b'Wheel-Version: 1.0\n'}
        lines = []
        for path, raw in files.items():
            encoded = v.base64.urlsafe_b64encode(sha256(raw).digest()).rstrip(b'=').decode()
            lines.append(path + ',sha256=' + encoded + ',' + str(len(raw)))
        record = 'lupine_discovery-0.1.0.dist-info/RECORD'
        files[record] = ('\n'.join([*lines,record+',,'])+'\n').encode()
        self.wheel_path = self.directory / 'lupine_discovery-0.1.0-py3-none-any.whl'
        with zipfile.ZipFile(self.wheel_path,'w') as wheel:
            for path, raw in files.items(): wheel.writestr(path,raw)

    def refresh_archive_receipt(self):
        self.archive_path = self.directory / ('lupine-discovery-source-'+self.commit_id[:12]+'.tar')
        for previous in self.directory.glob('*.tar'): previous.unlink()
        self.archive_path.write_bytes(self.git('archive','--format=tar','--prefix=lupine-source/',self.commit_id,
            '--','discovery','.github/workflows/discovery-verify.yml'))
        hashes = {}
        with tarfile.open(self.archive_path) as archive:
            for member in archive:
                if member.isfile(): hashes[member.name.removeprefix('lupine-source/')] = v.digest(archive.extractfile(member).read())
        manifest_raw = self.manifest_path.read_bytes(); manifest = json.loads(manifest_raw)
        source = {'git_commit':self.commit_id, 'git_tree':self.git('rev-parse','HEAD^{tree}').decode().strip(),
                  'project_path':'discovery','archive_copyset':['discovery','.github/workflows/discovery-verify.yml'],
                  'worktree_status':'clean', 'archived_file_count':len(hashes),
                  'archived_file_hashes_sha256':v.digest(v.canonical(hashes)),
                  'runtime_manifest':{'path':'reports/runtime-manifest.json','sha256':v.digest(manifest_raw),
                                      'checkpoint':manifest['checkpoint'],'file_count':len(manifest['files'])}}
        verification = {'schema':'lupine.discovery.package_verification.v1','status':'passed','isolated_install':True,
            'case_count':28,'problem_schemas':v.SCHEMAS,'checks':v.CHECKS,'runtime_dependencies':[], 'python':'3.12.0',
            'optional_mpea':{'resource':'resources/mpea-t25-v1.json','status':'absent',
                             'javascript':'packaged_and_exactly_served'},
            'certificate_digests':{f'synthetic_{i}':'a'*64 for i in range(28)},
            'replay_digests':{f'synthetic_{i}':'b'*64 for i in range(28)}, 'known_answer_summary':{'failed':0}}
        self.receipt = {'schema':'lupine.discovery.release_artifacts.v1','source':source,
            'source_state_rechecked_after_smoke':True,'wheel_build_source':'committed_source_archive',
            'artifacts':{},'verification':verification,'scope':'Synthetic transport fixture, not an executed probe'}
        self.rebind_artifacts()

    def rebind_artifacts(self):
        self.receipt['artifacts'] = {kind:{'filename':path.name,'bytes':len(path.read_bytes()),'sha256':v.digest(path.read_bytes())}
            for kind,path in [('source_archive',self.archive_path),('wheel',self.wheel_path)]}
        self.receipt['verification']['wheel_sha256'] = v.digest(self.wheel_path.read_bytes())
        self.seal()

    def seal(self):
        payload = {k:x for k,x in self.receipt.items() if k != 'content_sha256'}
        self.receipt['content_sha256'] = v.digest(v.canonical(payload))
        (self.directory/'release-artifacts.json').write_bytes(v.canonical(self.receipt))

    def verify(self):
        return v.verify(self.directory,self.commit_id,self.repo)

    def test_valid_fixture_checks_all_original_blobs_manifest_and_wheel_records(self):
        report = self.verify()
        self.assertEqual(report['status'],'PASS')
        self.assertEqual(report['source_audit']['archived_file_count'],7)
        self.assertEqual(report['source_audit']['runtime_manifest_source_count'],4)
        self.assertEqual(report['wheel_audit']['record_entries'],5)
        self.assertIs(report['archive_contents_executed'],False)
        self.assertIs(report['ci_success_established'],False)

    def add_nested_fixture(self):
        # Explicit independent inclusion oracle, never call runtime_manifest.py.
        additions={'tests/fixtures/nested_worker.py':b'# Inert nested worker\n',
                   'tests/fixtures/nested_case.json':b'{"fixture":"inert"}\n',
                   'scripts/fixtures/nested_settings.toml':b'fixture = "inert"\n'}
        manifest=json.loads(self.manifest_path.read_bytes())
        for relative,raw in additions.items():
            path=self.repo/'discovery'/relative;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
            manifest['files'][relative]=sha256(raw).hexdigest()
        self.manifest_path.write_bytes(v.canonical(manifest));self.commit();self.refresh_archive_receipt()
        return additions

    def test_recursive_fixture_extensions_are_independently_covered(self):
        self.add_nested_fixture();report=self.verify()
        self.assertEqual(report['source_audit']['runtime_manifest_source_count'],7)
        self.assertEqual(report['source_audit']['archived_file_count'],10)

    def test_missing_nested_fixture_manifest_entry_fails_after_full_reseal(self):
        self.add_nested_fixture();manifest=json.loads(self.manifest_path.read_bytes())
        del manifest['files']['tests/fixtures/nested_worker.py']
        self.manifest_path.write_bytes(v.canonical(manifest));self.commit();self.refresh_archive_receipt()
        with self.assertRaisesRegex(v.AuditError,'coverage'):self.verify()

    def test_mutated_nested_fixture_bytes_fail_after_full_reseal(self):
        self.add_nested_fixture()
        (self.repo/'discovery/tests/fixtures/nested_case.json').write_bytes(b'{"fixture":"changed"}\n')
        self.commit();self.refresh_archive_receipt()
        with self.assertRaisesRegex(v.AuditError,'source bytes'):self.verify()

    def test_probe_claim_tampering_fails_even_after_resealing(self):
        original = deepcopy(self.receipt)
        mutations = [lambda x:x['verification'].update(case_count=True),
                     lambda x:x['verification'].update(isolated_install=1),
                     lambda x:x['verification'].update(checks=[]),
                     lambda x:x['verification']['replay_digests'].pop('synthetic_0'),
                     lambda x:x['verification']['known_answer_summary'].update(failed=True),
                     lambda x:x['source'].update(archived_file_count=True)]
        for mutate in mutations:
            self.receipt=deepcopy(original); mutate(self.receipt); self.seal()
            with self.subTest(mutation=mutate), self.assertRaises(v.AuditError): self.verify()

    def test_noncanonical_duplicate_and_broken_seal_are_rejected(self):
        path=self.directory/'release-artifacts.json'; raw=path.read_bytes()
        for changed in (raw.rstrip(b'\n'), b' '+raw, raw.replace(b'"schema":',b'"schema":"duplicate","schema":',1)):
            path.write_bytes(changed)
            with self.subTest(raw=changed[:30]), self.assertRaises(v.AuditError): self.verify()
        path.write_bytes(raw)
        self.receipt['content_sha256']='0'*64; path.write_bytes(v.canonical(self.receipt))
        with self.assertRaisesRegex(v.AuditError,'seal'): self.verify()

    def test_changed_artifact_and_symlink_fail_without_touching_sources(self):
        original=self.wheel_path.read_bytes(); self.wheel_path.write_bytes(original+b'changed')
        with self.assertRaisesRegex(v.AuditError,'length/hash'): self.verify()
        outside=self.base/'outside.whl'; outside.write_bytes(original)
        self.wheel_path.unlink(); self.wheel_path.symlink_to(outside)
        with self.assertRaisesRegex(v.AuditError,'symlink'): self.verify()
        self.assertEqual(outside.read_bytes(),original)

    def rewrite_tar(self, mode):
        result=io.BytesIO()
        with tarfile.open(self.archive_path) as original, tarfile.open(fileobj=result,mode='w') as changed:
            for member in original:
                content=original.extractfile(member).read() if member.isfile() else None
                if member.name.endswith('docs/note.md'):
                    if mode=='omit': continue
                    if mode=='mutate': content=b'Not original committed source'; member.size=len(content)
                    if mode=='link': member.type=tarfile.SYMTYPE; member.linkname='../../outside'; member.size=0; content=None
                changed.addfile(member,io.BytesIO(content) if content is not None else None)
        self.archive_path.write_bytes(result.getvalue()); self.rebind_artifacts()

    def test_resealed_source_change_omission_and_link_cannot_replace_original_commit(self):
        original=self.archive_path.read_bytes()
        for mode in ('mutate','omit','link'):
            self.archive_path.write_bytes(original); self.rewrite_tar(mode)
            with self.subTest(mode=mode),self.assertRaises(v.AuditError):self.verify()

    def test_resealed_wheel_content_cannot_bypass_record_digest(self):
        buffer=io.BytesIO()
        with zipfile.ZipFile(self.wheel_path) as original, zipfile.ZipFile(buffer,'w') as changed:
            for info in original.infolist():
                raw=original.read(info.filename)
                if info.filename.endswith('__init__.py'):raw=b'Different inert fixture bytes'
                changed.writestr(info,raw)
        self.wheel_path.write_bytes(buffer.getvalue()); self.rebind_artifacts()
        with self.assertRaisesRegex(v.AuditError,'RECORD'):self.verify()

    def test_committed_incomplete_manifest_is_rejected_against_source_path_inventory(self):
        manifest=json.loads(self.manifest_path.read_bytes()); manifest['files'].pop('scripts/check.py')
        self.manifest_path.write_bytes(v.canonical(manifest));self.commit();self.refresh_archive_receipt()
        with self.assertRaisesRegex(v.AuditError,'coverage'):self.verify()

    def test_metadata_aliases_paths_and_extra_files_fail(self):
        original=deepcopy(self.receipt)
        changes=[lambda x:x['artifacts']['wheel'].update(bytes=True),
                 lambda x:x['artifacts']['wheel'].update(filename='../outside.whl'),
                 lambda x:x['source'].update(archived_file_hashes_sha256='f'*64),
                 lambda x:x['source'].update(git_commit='0'*40),
                 lambda x:x['source'].update(archive_copyset=['discovery'])]
        for change in changes:
            self.receipt=deepcopy(original);change(self.receipt);self.seal()
            with self.subTest(change=change),self.assertRaises(v.AuditError):self.verify()
        self.receipt=original;self.seal();(self.directory/'extra.txt').write_bytes(b'unexpected')
        with self.assertRaisesRegex(v.AuditError,'unexpected'):self.verify()


if __name__=='__main__':
    unittest.main()
