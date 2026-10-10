"""Independent constructed-only registration/allocation boundary checks.

Never opens scientific metadata, CSV, features, targets, or an OS entropy source.
"""
from __future__ import annotations
import copy
import dataclasses
import hashlib
import importlib.util
import json
import math
import os
import subprocess
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

ROOT = next(path for path in Path(__file__).resolve().parents if (path / 'src/lupine_discovery/decision_pool.py').is_file())
SOURCE = ROOT / 'scripts/mpea_registration_allocation.py'
spec = importlib.util.spec_from_file_location('independent_registration_allocation', SOURCE)
m = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = m
spec.loader.exec_module(m)
from mpea_public_tag_review_fixture import public_tag

SYNTHETIC_SHA = hashlib.sha256(b'independent constructed archive, not scientific bytes').hexdigest()


def encode(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()


def reference_development(groups, source_sha=SYNTHETIC_SHA):
    def key(group):
        raw = b'mpea-t25-archive-option-v1\x00development\x00' + (source_sha + ':' + str(group)).encode('ascii')
        return hashlib.sha256(raw).digest(), group
    return tuple(sorted(groups, key=key)[:35])


def reference_unrank(ids, index):
    """Independent positional expansion, with no call to the authored sampler."""
    digits = []
    for radix in range(1, len(ids) + 1):
        index, digit = divmod(index, radix)
        digits.append(digit)
    if index:
        raise ValueError('rank outside universe')
    remaining = list(ids)
    return tuple(remaining.pop(digit) for digit in reversed(digits))


def context():
    groups = tuple(2 + 3 * i for i in range(75))
    rows = []
    for ordinal in range(1545):
        group = groups[ordinal % 75] if ordinal < 389 else 999
        if ordinal == 1544:
            group = None
        rows.append(m.MetadataRow(ordinal, SYNTHETIC_SHA + ':' + str(ordinal), group,
                                  ordinal < 314, None))
    return m.metadata_fixture(rows, tuple(('field' + str(i)).encode() for i in range(23)), SYNTHETIC_SHA)


def registration(receipt_sha='a' * 64):
    return m.RegistrationIdentity(encode({'receipt': {'content_sha256': receipt_sha}}), 'SYNTHETIC')


def ledger_key():
    return hashlib.sha256(encode({'protocol_id': 'mpea-t25-archival-v1',
                                 'source_sha256': SYNTHETIC_SHA})).hexdigest()


def transcript(reserved, indexes):
    draws = []
    for ordinal, index in enumerate(indexes, 1):
        draws.append({'ordinal': ordinal, 'raw_hex': index.to_bytes(20, 'big').hex(),
                      'masked_index': index, 'status': 'ACCEPTED' if index < math.factorial(40) else 'REJECTED_OUT_OF_RANGE',
                      'received_bytes': 20})
    index = indexes[-1]
    return {'schema': 'lupine.permutation-allocation.fixture.v1', 'status': 'SUCCESS',
            'reason': 'EXACT_INDEX_ACCEPTED', 'original_ids': list(reserved),
            'permutation_count': math.factorial(40), 'mask_bits': 160,
            'requested_bytes': 20, 'maximum_draws': 128, 'draws': draws,
            'accepted_index': index, 'permutation': list(reference_unrank(reserved, index)),
            'uniform_byte_source_attested': False, 'physical_independence_established': False}


def ci_capture(commit='d' * 40, run_id=27):
    return {'remote_commit': commit,
            'run': {'id': run_id, 'head_sha': commit, 'head_branch': m.BRANCH,
                    'path': '.github/workflows/discovery-verify.yml', 'status': 'completed',
                    'conclusion': 'success', 'repository': {'full_name': m.REPOSITORY}},
            'jobs': {'total_count': 4, 'jobs': [
                {'id': 101 + i, 'run_id': run_id, 'name': name, 'status': 'completed',
                 'conclusion': 'success'} for i, name in enumerate(sorted(m.JOBS))]}}


def reproduction_capture(commit='d' * 40, head='e' * 40):
    return {**ci_capture(commit), 'branch_head': head,
            'comparison_endpoint': f'repos/{m.REPOSITORY}/compare/{commit}...{head}',
            'comparison': {'base_commit': {'sha': commit}, 'merge_base_commit': {'sha': commit},
                           'status': 'identical' if commit == head else 'ahead',
                           'ahead_by': 0 if commit == head else 3, 'behind_by': 0}}


def fixture_repository(root):
    """Tiny committed synthetic tree, with no copy of any scientific metadata."""
    files = {'discovery/src/constructed.py': b'pass\n',
             'discovery/pyproject.toml': b'[project]\nname="constructed"\nversion="0"\n',
             '.github/workflows/discovery-verify.yml': b'name: constructed\n',
             'discovery/docs/protocol.md': b'constructed protocol\n',
             'discovery/docs/contract.md': b'constructed contract\n',
             'discovery/docs/operational.md': b'constructed operational\n',
             'discovery/docs/mpea-registration-publication-v1.md': b'constructed publication contract\n',
             'discovery/reports/mpea-header-labels-v1.json': b'{"constructed":true}\n'}
    files.update({'discovery/' + key: b'{"constructed":true}\n' for key in m.METADATA_PINS})
    files.update({'discovery/reports/mpea-protocol-review-v1/randomization/' + name: b'constructed review evidence\n'
                  for name in ('README.md', 'engineering-v1.json', 'permutation_allocation.py',
                               'test_permutation_allocation.py', 'tests-final.txt', 'peer-review-note-v1.json')})
    files.update({'discovery/reports/mpea-feature-readiness-v1/' + name: b'{"constructed":true}\n'
                  for name in ('process-1/readiness.json', 'process-1/execution.json',
                               'process-2/readiness.json', 'process-2/execution.json', 'reproduction.json')})
    for name, raw in files.items():
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)
    def git(*args):
        return subprocess.check_output(['git', '-C', str(root), *args], stderr=subprocess.DEVNULL)
    git('init', '-q')
    git('add', '.')
    git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@invalid.example', 'commit', '-qm', 'constructed')
    commit = git('rev-parse', 'HEAD').decode().strip()
    capture = ci_capture(commit)
    manifest = {'schema': 'lupine.mpea.implementation-manifest.v1', 'commit': commit,
                'files': {name: hashlib.sha256(raw).hexdigest() for name, raw in files.items()}}
    return commit, capture, manifest


def fixture_request(root, commit, capture, manifest):
    def put(name, value):
        raw = encode(m.sealed(value)) + b'\n'
        (root / name).write_bytes(raw)
        return {'path': name, 'sha256': hashlib.sha256(raw).hexdigest()}
    manifest_ref = put('manifest.json', manifest)
    log = b'\nRan 1 test in 0.001s\n\nOK\n'
    (root / 'log.txt').write_bytes(log)
    engineering = {'schema': 'lupine.mpea.registration-engineering.v1', 'commit': commit,
                   'manifest_sha256': manifest_ref['sha256'], 'status': 'PASS',
                   'source_before': dict(manifest['files']), 'source_after': dict(manifest['files']),
                   'commands': [{'command': ['python', '-m', 'unittest'], 'exit_code': 0,
                                 'log_path': 'log.txt', 'log_sha256': hashlib.sha256(log).hexdigest(),
                                 'test_count': 1, 'skipped': 0}]}
    engineering_ref = put('engineering.json', engineering)
    ci_ref = put('ci.json', {'schema': 'lupine.mpea.parent-ci-capture.v1', 'capture': capture})
    ci_ref['run_id'] = 27
    specs = {key: {'path': 'discovery/docs/' + filename,
                   'sha256': manifest['files']['discovery/docs/' + filename]}
             for key, filename in [('protocol', 'protocol.md'), ('contract', 'contract.md'),
                                   ('operational_amendment', 'operational.md')]}
    put('registration.json', {'schema': 'lupine.mpea.registration.v1', 'protocol_id': m.PROTOCOL,
        'repository': m.REPOSITORY, 'branch': m.BRANCH, 'commit': commit, 'manifest': manifest_ref,
        'engineering': engineering_ref, 'ci': ci_ref, 'specifications': specs})
    return root / 'registration.json'


class MemoryStore:
    """Synthetic persistence observer; no claim to test the separate store engine."""
    def __init__(self):
        self.artifacts = {}
        self.stages = {}
        self.imported = None

    def _identity(self, value):
        seal = hashlib.sha256(encode(value)).hexdigest()
        return {'bytes_sha256': seal, 'content_sha256': seal, 'scientific_sha256': seal}

    def write_artifact(self, name, payload, **kwargs):
        value = {'payload': copy.deepcopy(payload), **kwargs}
        self.artifacts[name] = value
        return self._identity(value)

    def commit(self, stage, payload, **kwargs):
        self.stages[stage] = {'payload': copy.deepcopy(payload), **kwargs}

    def stage_identity(self, stage):
        return self._identity(self.stages[stage])

    def stage_bytes(self, stage):
        return encode(self.stages[stage])

    def artifact_bytes(self, name, identity):
        value = self.artifacts[name]
        if identity != self._identity(value):
            raise AssertionError('fixture artifact identity mismatch')
        return encode(value)

    def import_original_allocation(self, stage_raw, stage_identity, routes_raw, route_identity):
        if self.stages or self.artifacts or self.imported:
            raise AssertionError('original import cannot follow another write')
        self.imported = (stage_raw, stage_identity, routes_raw, route_identity)
        self.assert_raw_identity(stage_raw, stage_identity)
        self.assert_raw_identity(routes_raw, route_identity)

    def assert_raw_identity(self, raw, identity):
        if hashlib.sha256(raw).hexdigest() != identity['bytes_sha256']:
            raise AssertionError('original byte identity changed')


class AllocationReview(unittest.TestCase):
    def test_all_original_rows_and_lexical_groups_preserved_without_formula_filter(self):
        c = context()
        groups = {r.source_group for r in c.rows if r.condition_eligible}
        self.assertEqual(len(c.rows), 1545)
        self.assertEqual(sum(r.condition_eligible for r in c.rows), 314)
        self.assertEqual(len(groups), 75)
        self.assertTrue(all(r.formula_group is None for r in c.rows))
        self.assertEqual(m._development(c), reference_development(groups))

    def test_unrank_first_last_and_interior_against_independent_factoradic(self):
        c = context()
        reserved = tuple(sorted({r.source_group for r in c.rows if r.condition_eligible} - set(reference_development({r.source_group for r in c.rows if r.condition_eligible}))))
        for index in (0, 1, math.factorial(20) + 13, math.factorial(40) - 1):
            with self.subTest(index=index):
                t = transcript(reserved, [math.factorial(40), index])
                self.assertEqual(m.verify_sampler(t, reserved), reference_unrank(reserved, index))

    def test_first_accepted_draw_cannot_be_skipped_or_followed(self):
        reserved = tuple(range(40))
        bad = transcript(reserved, [0, 1])
        with self.assertRaises(m.RegistrationError):
            m.verify_sampler(bad, reserved)

    def test_transcript_integer_slots_reject_booleans(self):
        reserved = tuple(range(40))
        changes = [lambda t: t.update(accepted_index=False),
                   lambda t: t['draws'][0].update(ordinal=True),
                   lambda t: t['draws'][0].update(masked_index=False),
                   lambda t: t['original_ids'].__setitem__(0, False),
                   lambda t: t['permutation'].__setitem__(0, False)]
        for mutation_id, change in enumerate(changes):
            value = transcript(reserved, [0])
            change(value)
            with self.subTest(mutation_id=mutation_id), self.assertRaises(m.RegistrationError):
                m.verify_sampler(value, reserved)

    def test_metadata_rejects_bool_ordinal_duplicate_id_and_unknown_condition_source(self):
        base = context()
        mutations = [(0, {'ordinal': False}), (1, {'record_id': base.rows[0].record_id}),
                     (0, {'source_group': None}), (0, {'condition_eligible': 1})]
        for position, changes in mutations:
            rows = list(base.rows)
            rows[position] = dataclasses.replace(rows[position], **changes)
            with self.subTest(changes=changes), self.assertRaises(m.RegistrationError):
                m.metadata_fixture(rows, base.header, SYNTHETIC_SHA)

    def test_fixture_rejects_actual_archive_identity_before_constructing_context(self):
        with self.assertRaises(m.RegistrationError) as raised:
            m.metadata_fixture((), (), m.SOURCE['sha256'])
        self.assertEqual(raised.exception.code, 'SYNTHETIC_FIXTURE_REQUIRED')

    def test_durable_request_before_callback_and_response_before_next_draw(self):
        c, reg, store = context(), registration(), MemoryStore()
        with tempfile.TemporaryDirectory() as directory:
            ledger = Path(directory) / ledger_key()
            calls = []
            def provider(size):
                ordinal = len(calls) + 1
                self.assertEqual(size, 20)
                self.assertTrue((ledger / 'attempt.json').is_file())
                self.assertTrue((ledger / f'request-{ordinal:03}.json').is_file())
                if ordinal > 1:
                    self.assertTrue((ledger / f'response-{ordinal - 1:03}.json').is_file())
                calls.append(size)
                return (math.factorial(40) if ordinal == 1 else 0).to_bytes(20, 'big')
            with mock.patch.object(m.os, 'urandom', side_effect=AssertionError('OS entropy forbidden')):
                allocation = m.allocate_fixture(c, reg, store, directory, provider)
            self.assertEqual(calls, [20, 20])
            self.assertEqual(len(allocation.routes), 1545)
            self.assertEqual(tuple(r.ordinal for r in allocation.routes), tuple(range(1545)))
            self.assertEqual(tuple(r.record_id for r in allocation.routes), tuple(r.record_id for r in c.rows))
            for row in allocation.routes[314:389]:
                self.assertIn(row.role, {'DEVELOPMENT', 'CALIBRATION', 'EVALUATION'})
                self.assertFalse(row.condition_eligible)
            self.assertEqual(allocation.routes[-1].role, 'UNRESOLVED_SOURCE')
            self.assertIsNone(allocation.routes[-1].source_group)
            self.assertEqual(allocation.routes[1000].role, 'OUT_OF_SCOPE_TARGET_UNOPENED')
            self.assertEqual(allocation.sampling_premise, 'assumed_unverified')
            with self.assertRaises(m.RegistrationError):
                m.allocate_fixture(c, reg, MemoryStore(), directory, lambda _: self.fail('second draw'))

    def test_interruption_never_allows_replacement_allocation(self):
        with tempfile.TemporaryDirectory() as directory:
            def provider(_):
                raise KeyboardInterrupt
            with self.assertRaises(KeyboardInterrupt):
                m.allocate_fixture(context(), registration(), MemoryStore(), directory, provider)
            ledger = Path(directory) / ledger_key()
            self.assertTrue((ledger / 'request-001.json').exists())
            self.assertFalse((ledger / 'response-001.json').exists())
            with self.assertRaises(m.RegistrationError):
                m.allocate_fixture(context(), registration(), MemoryStore(), directory, lambda _: self.fail('replacement draw'))

    def test_reproduction_imports_exact_original_bytes_without_entropy_or_new_registry(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            original_store, replay_store = MemoryStore(), MemoryStore()
            c, reg = context(), registration()
            original = m.allocate_fixture(c, reg, original_store, base / 'original', lambda _: b'\0' * 20)
            with mock.patch.object(m.os, 'urandom', side_effect=AssertionError('OS entropy forbidden')):
                result = m.allocate_fixture(c, reg, replay_store, base / 'replay',
                    lambda _: self.fail('reproduction requested entropy'), original_allocation=original)
            self.assertIs(result, original)
            self.assertFalse((base / 'replay').exists())
            self.assertEqual(replay_store.imported,
                (original._stage_raw, original.allocation_identity, original._route_raw, original.route_identity))
            self.assertEqual(replay_store.artifacts, {})
            self.assertEqual(replay_store.stages, {})
            self.assertEqual(m.decode(original._payload_json)['execution_kind'], 'SYNTHETIC_FIXTURE')

    def test_provider_failure_preserves_prior_rejection_and_never_retries(self):
        with tempfile.TemporaryDirectory() as directory:
            calls = []
            store = MemoryStore()
            def provider(size):
                calls.append(size)
                if len(calls) == 1:
                    return (2 ** 160 - 1).to_bytes(20, 'big')
                raise RuntimeError('secret synthetic provider text')
            with self.assertRaises(m.RegistrationError) as raised:
                m.allocate_fixture(context(), registration(), store, directory, provider)
            self.assertEqual(raised.exception.code, 'ALLOCATION_PROVIDER_FAILURE')
            self.assertEqual(len(calls), 2)
            receipt = store.stages['allocation']
            self.assertEqual(receipt['status'], 'BLOCKED')
            self.assertIsNone(receipt['payload']['sampler_receipt']['permutation'])
            self.assertEqual([d['status'] for d in receipt['payload']['sampler_receipt']['draws']],
                             ['REJECTED_OUT_OF_RANGE', 'PROVIDER_EXCEPTION'])
            self.assertNotIn(b'secret', encode(receipt))
            self.assertEqual(sorted(p.name for p in (Path(directory) / ledger_key()).iterdir()),
                             ['attempt.json', 'request-001.json', 'request-002.json', 'response-001.json', 'response-002.json'])
            with self.assertRaises(m.RegistrationError):
                m.allocate_fixture(context(), registration(), MemoryStore(), directory,
                                   lambda _: self.fail('provider failure must not redraw'))

    def test_cap128_has_no_129th_draw_or_partial_allocation(self):
        with tempfile.TemporaryDirectory() as directory:
            calls = []
            store = MemoryStore()
            def provider(size):
                calls.append(size)
                return (2 ** 160 - 1).to_bytes(20, 'big')
            with self.assertRaises(m.RegistrationError) as raised:
                m.allocate_fixture(context(), registration(), store, directory, provider)
            self.assertEqual(raised.exception.code, 'ALLOCATION_DRAW_LIMIT')
            self.assertEqual(calls, [20] * 128)
            self.assertEqual(len(store.stages['allocation']['payload']['sampler_receipt']['draws']), 128)
            self.assertIsNone(store.stages['allocation']['payload']['sampler_receipt']['permutation'])
            self.assertFalse((Path(directory) / ledger_key() / 'request-129.json').exists())

    def test_response_persistence_failure_does_not_request_another_draw(self):
        with tempfile.TemporaryDirectory() as directory:
            calls = []
            store = MemoryStore()
            write = m.immutable_write
            def broken_response(path, value):
                if Path(path).name == 'response-001.json':
                    raise m.RegistrationError('CACHE_IO_FAILURE')
                return write(path, value)
            def provider(size):
                calls.append(size)
                return (2 ** 160 - 1).to_bytes(20, 'big')
            with mock.patch.object(m, 'immutable_write', side_effect=broken_response):
                with self.assertRaises(m.RegistrationError) as raised:
                    m.allocate_fixture(context(), registration(), store, directory, provider)
            self.assertEqual(raised.exception.code, 'CACHE_IO_FAILURE')
            self.assertEqual(calls, [20])
            self.assertEqual(store.stages, {})
            with self.assertRaises(m.RegistrationError):
                m.allocate_fixture(context(), registration(), MemoryStore(), directory,
                                   lambda _: self.fail('unsealed response must not redraw'))

    def test_new_registry_ancestor_entries_are_fsynced_before_entropy(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            registry = base / 'new-parent' / 'new-registry'
            fsynced = []
            actual_fsync = m.os.fsync
            def record_fsync(fd):
                fsynced.append(Path(os.readlink('/proc/self/fd/' + str(fd))))
                return actual_fsync(fd)
            def provider(_):
                for expected in (base, base / 'new-parent', registry,
                                 registry / ledger_key(), registry / ledger_key() / '.attempt.json.pending',
                                 registry / ledger_key() / '.request-001.json.pending'):
                    self.assertIn(expected, fsynced)
                return b'\0' * 20
            with mock.patch.object(m.os, 'fsync', side_effect=record_fsync):
                m.allocate_fixture(context(), registration(), MemoryStore(), registry, provider)

    def test_new_registration_for_same_protocol_and_source_cannot_redraw(self):
        with tempfile.TemporaryDirectory() as directory:
            def interrupted(_):
                raise KeyboardInterrupt
            with self.assertRaises(KeyboardInterrupt):
                m.allocate_fixture(context(), registration(), MemoryStore(), directory, interrupted)
            with self.assertRaises(m.RegistrationError) as raised:
                m.allocate_fixture(context(), registration('b' * 64), MemoryStore(), directory,
                                   lambda _: self.fail('replacement registration requested entropy'))
            self.assertEqual(raised.exception.code, 'ALLOCATION_ALREADY_ATTEMPTED')
            marker = json.loads((Path(directory) / ledger_key() / 'attempt.json').read_bytes())
            self.assertEqual(marker['registration'], 'a' * 64)


class RegistrationReview(unittest.TestCase):
    def test_reproduction_ancestor_relation_and_original_ci_are_both_required(self):
        for head in ('d' * 40, 'e' * 40):
            self.assertEqual(m._validate_reproduction_ci(reproduction_capture(head=head), 'd' * 40, 27),
                             (101, 102, 103, 104))
        changes = [lambda v: v['comparison'].update(status='diverged'),
                   lambda v: v['comparison'].update(status='behind'),
                   lambda v: v['comparison'].update(ahead_by=0),
                   lambda v: v['comparison'].update(ahead_by=True),
                   lambda v: v['comparison'].update(behind_by=1),
                   lambda v: v['comparison']['base_commit'].update(sha='c' * 40),
                   lambda v: v['comparison']['merge_base_commit'].update(sha='c' * 40),
                   lambda v: v.update(comparison_endpoint='repos/other/repo/compare/a...b'),
                   lambda v: v.update(branch_head='not-a-commit'),
                   lambda v: v['run'].update(head_sha='e' * 40),
                   lambda v: v['jobs']['jobs'][0].update(conclusion='failure')]
        for mutation_id, change in enumerate(changes):
            value = reproduction_capture()
            change(value)
            with self.subTest(mutation_id=mutation_id), self.assertRaises(m.RegistrationError):
                m._validate_reproduction_ci(value, 'd' * 40, 27)

    def test_ancestor_factory_worker_preserve_registration_and_refuse_new_draw(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            commit, capture, manifest = fixture_repository(root)
            request = fixture_request(root, commit, capture, manifest)
            original_request = request.read_bytes()
            advanced = reproduction_capture(commit=commit)
            approved = hashlib.sha256((root / 'engineering.json').read_bytes()).hexdigest()
            with mock.patch.object(m, 'REPO', root), mock.patch.object(m, '_official_reproduction_capture', return_value=advanced), mock.patch.object(m, '_official_public_tag', side_effect=lambda: public_tag(m._request(request, root)[1], 27)):
                parent = m.verify_reproduction_registration(request, approved_engineering_sha256=approved)
            self.assertEqual(parent.mode, 'REPRODUCTION_PARENT_LIVE')
            self.assertEqual(request.read_bytes(), original_request)
            path = root / 'reproduction-parent.json'
            path.write_bytes(parent.parent_capture)
            with mock.patch.object(m, 'REPO', root), mock.patch.object(m, '_official_reproduction_capture', side_effect=AssertionError('offline ancestry network')):
                worker = m.verify_worker_registration(request, path, hashlib.sha256(parent.parent_capture).hexdigest())
            self.assertEqual(worker.mode, 'REPRODUCTION_WORKER_PARENT_TRUST')
            self.assertEqual(parent.binding, worker.binding)
            declared = dataclasses.replace(context(), mode='REGISTERED')
            for authority in (parent, worker):
                with mock.patch.object(m.os, 'urandom', side_effect=AssertionError('reproduction authority drew entropy')):
                    with self.assertRaises(m.RegistrationError):
                        m.allocate(declared, authority, MemoryStore(), 'PRODUCTION_ARCHIVE')
            cap = json.loads(path.read_bytes())
            cap.pop('content_sha256')
            cap['authorization_kind'] = 'ORIGINAL_ALLOCATION'
            path.write_bytes(encode(m.sealed(cap)))
            with mock.patch.object(m, 'REPO', root), self.assertRaises(m.RegistrationError):
                m.verify_worker_registration(request, path, hashlib.sha256(path.read_bytes()).hexdigest())

    def test_original_production_transport_still_rejects_advanced_head(self):
        with mock.patch.object(m, '_git', return_value=('e' * 40 + '\trefs/heads/' + m.BRANCH + '\n').encode()), \
             mock.patch.object(m, '_api', side_effect=AssertionError('advanced original gate reached API')):
            with self.assertRaises(m.RegistrationError):
                m._official_capture('d' * 40, 27)

    def test_reproduction_still_requires_original_local_checkout(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            commit, capture, manifest = fixture_repository(root)
            request = fixture_request(root, commit, capture, manifest)
            subprocess.check_call(['git', '-C', str(root), '-c', 'user.name=Fixture',
                                   '-c', 'user.email=fixture@invalid.example', 'commit', '--allow-empty', '-qm', 'advanced'])
            with mock.patch.object(m, 'REPO', root), mock.patch.object(m, '_official_reproduction_capture', side_effect=AssertionError('wrong checkout reached API')):
                with self.assertRaises(m.RegistrationError):
                    m.verify_reproduction_registration(request,
                        approved_engineering_sha256=hashlib.sha256((root / 'engineering.json').read_bytes()).hexdigest())

    def test_decoder_rejects_float_duplicate_deep_and_oversized_string(self):
        values = [b'{"count":1.0}', b'{"count":1,"count":1}',
                  b'[' * 34 + b'0' + b']' * 34, encode({'text': 'x' * 2049})]
        for case, raw in enumerate(values):
            with self.subTest(case=case), self.assertRaises(m.RegistrationError):
                m.decode(raw)

    def test_decoder_exact_8192_bit_integer_boundary(self):
        boundary = 2 ** 8192 - 1
        self.assertEqual(m.decode(encode({'integer': boundary}))['integer'], boundary)
        for value in (2 ** 8192, -(2 ** 8192)):
            with self.assertRaises(m.RegistrationError):
                m.decode(encode({'integer': value}))

    def test_sink_rejects_symlink_ancestor_before_creating_descendants(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            outside = base / 'outside'
            outside.mkdir()
            (base / 'link').symlink_to(outside, target_is_directory=True)
            with self.assertRaises(m.RegistrationError):
                m.immutable_write(base / 'link' / 'created' / 'result.json', {'fixture': True})
            self.assertEqual(list(outside.iterdir()), [])

    def test_sink_preserves_existing_bytes_and_no_pending_file_on_conflict(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'result.json'
            m.immutable_write(path, {'fixture': 1})
            original = path.read_bytes()
            with self.assertRaises(m.RegistrationError):
                m.immutable_write(path, {'fixture': 2})
            self.assertEqual(path.read_bytes(), original)
            self.assertEqual(sorted(p.name for p in path.parent.iterdir()), ['result.json'])

    def test_ci_exact_repository_commit_run_workflow_and_four_distinct_jobs(self):
        value = ci_capture()
        self.assertEqual(m._validate_ci(value, 'd' * 40, 27), (101, 102, 103, 104))
        mutators = [lambda v: v.update(remote_commit='e' * 40),
                    lambda v: v['run'].update(head_sha='e' * 40),
                    lambda v: v['run'].update(head_branch='main'),
                    lambda v: v['run'].update(path='.github/workflows/other.yml'),
                    lambda v: v['run'].update(status='in_progress'),
                    lambda v: v['run'].update(conclusion='failure'),
                    lambda v: v['run']['repository'].update(full_name='fixture/other'),
                    lambda v: v['jobs']['jobs'][0].update(conclusion='skipped'),
                    lambda v: v['jobs']['jobs'][0].update(run_id=28),
                    lambda v: v['jobs']['jobs'][0].update(id=102),
                    lambda v: v['jobs']['jobs'][0].update(name='unrelated'),
                    lambda v: v['jobs']['jobs'].pop()]
        for mutation_id, change in enumerate(mutators):
            value = ci_capture()
            change(value)
            with self.subTest(mutation_id=mutation_id), self.assertRaises(m.RegistrationError):
                m._validate_ci(value, 'd' * 40, 27)

    def test_malformed_ci_returns_closed_error(self):
        for replacement in (None, [], 'repository'):
            value = ci_capture()
            value['run']['repository'] = replacement
            with self.subTest(replacement=replacement), self.assertRaises(m.RegistrationError):
                m._validate_ci(value, 'd' * 40, 27)

    def test_ci_boolean_run_id_is_rejected_even_when_equal_to_one(self):
        value = ci_capture(run_id=1)
        value['run']['id'] = True
        value['jobs']['jobs'][0]['run_id'] = True
        with self.assertRaises(m.RegistrationError):
            m._validate_ci(value, 'd' * 40, 1)

    def test_fixture_registration_does_not_call_live_transport_or_authorize_production(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            commit, capture, manifest = fixture_repository(root)
            request = fixture_request(root, commit, capture, manifest)
            with mock.patch.object(m, '_official_capture', side_effect=AssertionError('live API forbidden')):
                reg = m.verify_registration_fixture(request, root, capture)
            self.assertEqual(reg.mode, 'SYNTHETIC')
            with self.assertRaises(m.RegistrationError):
                m.load_public_metadata(reg)
            relabeled = dataclasses.replace(reg, mode='PARENT_LIVE')
            with mock.patch.object(m, 'captured', side_effect=AssertionError('fixture relabel opened metadata')):
                with self.assertRaises(m.RegistrationError):
                    m.load_public_metadata(relabeled)
                with self.assertRaises(m.RegistrationError):
                    m.verify_registered_sources(relabeled)

    def test_missing_header_manifest_entry_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            commit, capture, manifest = fixture_repository(root)
            manifest['files'].pop('discovery/reports/mpea-header-labels-v1.json')
            request = fixture_request(root, commit, capture, manifest)
            with self.assertRaises(m.RegistrationError):
                m.verify_registration_fixture(request, root, capture)

    def test_registered_file_change_fails_before_live_capture(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            commit, capture, manifest = fixture_repository(root)
            request = fixture_request(root, commit, capture, manifest)
            (root / 'discovery/src/constructed.py').write_bytes(b'changed\n')
            with self.assertRaises(m.RegistrationError) as raised:
                m.verify_registration_fixture(request, root, capture)
            self.assertEqual(raised.exception.code, 'IMPLEMENTATION_MISMATCH')

    def test_parent_compares_frozen_four_job_identities_to_injected_official_capture(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            commit, capture, manifest = fixture_repository(root)
            request = fixture_request(root, commit, capture, manifest)
            changed = copy.deepcopy(capture)
            changed['jobs']['jobs'][0]['id'] = 999
            with mock.patch.object(m, 'REPO', root), mock.patch.object(m, '_official_capture', return_value=changed) as official:
                with self.assertRaises(m.RegistrationError) as raised:
                    m.verify_registration(request, approved_engineering_sha256=hashlib.sha256((root / 'engineering.json').read_bytes()).hexdigest())
                official.assert_called_once_with(commit, 27)
            self.assertEqual(raised.exception.code, 'CI_NOT_PASSED')

    def test_offline_worker_requires_launch_hash_and_never_calls_official_transport(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            commit, capture, manifest = fixture_repository(root)
            request = fixture_request(root, commit, capture, manifest)
            with mock.patch.object(m, 'REPO', root), mock.patch.object(m, '_official_capture', return_value=capture), mock.patch.object(m, '_official_public_tag', side_effect=lambda: public_tag(m._request(request, root)[1], 27)):
                parent = m.verify_registration(request, approved_engineering_sha256=hashlib.sha256((root / 'engineering.json').read_bytes()).hexdigest())
            captured = root / 'parent-authorization.json'
            captured.write_bytes(parent.parent_capture)
            expected = hashlib.sha256(parent.parent_capture).hexdigest()
            with mock.patch.object(m, 'REPO', root), mock.patch.object(m, '_official_capture', side_effect=AssertionError('offline network forbidden')):
                worker = m.verify_worker_registration(request, captured, expected)
            self.assertEqual(worker.mode, 'WORKER_PARENT_TRUST')
            self.assertEqual(worker.binding, parent.binding)
            with mock.patch.object(m, '_request', side_effect=AssertionError('hash failure must precede request processing')):
                with self.assertRaises(m.RegistrationError):
                    m.verify_worker_registration(request, captured, '0' * 64)
            captured.write_bytes(parent.parent_capture + b' ')
            with self.assertRaises(m.RegistrationError):
                m.verify_worker_registration(request, captured, expected)

    def test_parent_rejects_engineering_without_exact_trusted_approval(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            commit, capture, manifest = fixture_repository(root)
            request = fixture_request(root, commit, capture, manifest)
            with mock.patch.object(m, 'REPO', root), mock.patch.object(m, '_official_capture', side_effect=AssertionError('unapproved engineering reached network')):
                with self.assertRaises(m.RegistrationError) as raised:
                    m.verify_registration(request, approved_engineering_sha256='0' * 64)
            self.assertEqual(raised.exception.code, 'ENGINEERING_NOT_PASSED')


    def test_resealed_engineering_source_mismatch_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            commit, capture, manifest = fixture_repository(root)
            request = fixture_request(root, commit, capture, manifest)
            engineering = json.loads((root / 'engineering.json').read_bytes())
            engineering.pop('content_sha256')
            engineering['source_after']['discovery/src/constructed.py'] = '0' * 64
            raw = encode(m.sealed(engineering)) + b'\n'
            (root / 'engineering.json').write_bytes(raw)
            registration_value = json.loads(request.read_bytes())
            registration_value.pop('content_sha256')
            registration_value['engineering']['sha256'] = hashlib.sha256(raw).hexdigest()
            request.write_bytes(encode(m.sealed(registration_value)) + b'\n')
            with self.assertRaises(m.RegistrationError) as raised:
                m.verify_registration_fixture(request, root, capture)
            self.assertEqual(raised.exception.code, 'ENGINEERING_NOT_PASSED')


class OriginalBytesReview(unittest.TestCase):
    def setUp(self):
        self.store_module = m._store_verifier()
        self.directory = tempfile.TemporaryDirectory(prefix='independent-allocation-')
        self.addCleanup(self.directory.cleanup)
        self.base = Path(self.directory.name)
        self.patch = mock.patch.object(self.store_module, 'OUTPUT_ROOT', self.base / 'attempts')
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.binding = {'commit': '1' * 40, 'protocol_sha256': '2' * 64,
                        'contract_sha256': '3' * 64, 'operational_amendment_sha256': '4' * 64,
                        'implementation_manifest_sha256': '5' * 64,
                        'engineering_receipt_sha256': '6' * 64, 'ci_receipt_sha256': '7' * 64,
                        'receipt': {'bytes_sha256': '8' * 64, 'content_sha256': 'a' * 64,
                                    'scientific_sha256': None}}
        self.reg = m.RegistrationIdentity(encode(self.binding), 'SYNTHETIC')
        self.context = context()
        self.registry = self.base / 'registry'
        self.first = self.store_module.ProductionStageStore('constructed-original', self.binding,
            {'bytes': 12, 'md5': 'b' * 32, 'sha256': SYNTHETIC_SHA}, execution_kind='PRODUCTION_ARCHIVE')
        self.addCleanup(self.first.close)
        self.original = m.allocate_fixture(self.context, self.reg, self.first, self.registry, lambda _: b'\0' * 20)

    def load_bytes(self, stage_raw=None, stage_identity=None, route_raw=None, route_identity=None):
        return m.load_original_allocation_bytes(self.context, self.reg,
            self.original._stage_raw if stage_raw is None else stage_raw,
            self.original.allocation_identity if stage_identity is None else stage_identity,
            self.original._route_raw if route_raw is None else route_raw,
            self.original.route_identity if route_identity is None else route_identity,
            registry=self.registry)

    def reseal(self, value):
        value = copy.deepcopy(value)
        value.pop('content_sha256', None)
        value.pop('scientific_sha256', None)
        value['scientific_sha256'] = self.store_module.io.digest(self.store_module.scientific_preimage(value))
        value['content_sha256'] = self.store_module.io.digest(value)
        raw = self.store_module.io.canonical(value)
        return raw, {'bytes_sha256': hashlib.sha256(raw).hexdigest(),
                     'content_sha256': value['content_sha256'], 'scientific_sha256': value['scientific_sha256']}

    def test_fresh_bytes_loader_retains_identity_after_original_store_closed(self):
        self.first.close()
        with mock.patch.object(m.os, 'urandom', side_effect=AssertionError('freshbytes requested entropy')):
            loaded = self.load_bytes()
        self.assertEqual(loaded._stage_raw, self.original._stage_raw)
        self.assertEqual(loaded._route_raw, self.original._route_raw)
        self.assertEqual(loaded.allocation_identity, self.original.allocation_identity)
        self.assertEqual(loaded.routes, self.original.routes)

    def test_fully_resealed_original_route_bool_int_change_is_rejected(self):
        for field, value in [('ordinal', False), ('condition_eligible', 1)]:
            sidecar = json.loads(self.original._route_raw)
            sidecar['payload']['original_row_routes'][0][field] = value
            route_raw, route_identity = self.reseal(sidecar)
            stage = json.loads(self.original._stage_raw)
            stage['inputs']['label_routes'] = route_identity
            stage['payload']['route_artifact'] = route_identity
            stage['payload']['role_map_sha256'] = route_identity['bytes_sha256']
            stage_raw, stage_identity = self.reseal(stage)
            with self.subTest(field=field), self.assertRaises(m.RegistrationError):
                self.load_bytes(stage_raw, stage_identity, route_raw, route_identity)

    def test_matching_bytes_cannot_hide_changed_durable_first_draw(self):
        path = self.registry / ledger_key() / 'response-001.json'
        value = json.loads(path.read_bytes())
        value.pop('content_sha256')
        value['raw_hex'] = (1).to_bytes(20, 'big').hex()
        path.write_bytes(encode(m.sealed(value)))
        with self.assertRaises(m.RegistrationError):
            self.load_bytes()

    def test_any_late_entropy_request_invalidates_original_transcript(self):
        path = self.registry / ledger_key() / 'request-003.json'
        path.write_bytes(encode(m.sealed({'ordinal': 3, 'requested_bytes': 20, 'registration': 'a' * 64})))
        with self.assertRaises(m.RegistrationError):
            self.load_bytes()



if __name__ == '__main__':
    unittest.main()
