"""Independent constructed-fixture checks; no real source or production entry."""
from dataclasses import dataclass
from fractions import Fraction
from hashlib import sha256
import json
import importlib.util
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

REVIEW = Path(__file__).resolve().parent
SCRIPTS = REVIEW.parent / 'scripts'
sys.path.insert(0, str(SCRIPTS))
import mpea_stage_store as storemod
import mpea_target_custody as custody

EXPECTED_STAGES = ('allocation', 'input_freeze', 'development', 'rank_freeze',
                   'reserved', 'calibration', 'replay', 'evaluation')


def canonical_independent(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'),
                       ensure_ascii=False, allow_nan=False) + '\n').encode('utf-8')


class StageStoreReview(unittest.TestCase):
    def setUp(self):
        storemod.WORKSPACE.mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(prefix='synthetic-', dir=storemod.WORKSPACE)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.attempts = self.root / 'attempts'
        self.patch = patch.object(storemod, 'ATTEMPTS', self.attempts)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.source = custody.FixtureSource.from_bytes(b'constructed fixture, never archive')
        self.impl = {'constructed_driver.py': '1'*64, 'constructed_parser.py': '2'*64}
        self.serial = 0

    def new(self):
        self.serial += 1
        instance = storemod.FixtureStageStore(f'attempt-{self.serial}', self.source, self.impl)
        if hasattr(instance, 'close'): self.addCleanup(instance.close)
        return instance

    def code(self, expected, function, *args, **kwargs):
        with self.assertRaises(storemod.StageError) as caught:
            function(*args, **kwargs)
        self.assertEqual(caught.exception.code, expected)
        self.assertEqual(str(caught.exception), expected)

    def test_eight_stage_chain_and_independent_seals(self):
        self.assertEqual(storemod.STAGES, EXPECTED_STAGES)
        instance = self.new()
        self.assertEqual(instance.stages, ())
        self.assertIsNone(instance.verify())
        self.code('STAGE_ORDER_VIOLATION', instance.require, 'allocation')
        previous = None
        scientific = []
        for index, stage in enumerate(EXPECTED_STAGES):
            snapshot = instance.commit(stage, {'ordinal': index, 'exact': Fraction(index, 3)})
            raw = (instance.path / f'{index:02d}-{stage}.json').read_bytes()
            parsed = json.loads(raw)
            self.assertEqual(raw, canonical_independent(parsed))
            self.assertEqual(snapshot, parsed)
            self.assertEqual(parsed['previous_sha256'], previous)
            content = dict(parsed); claimed_content = content.pop('content_sha256')
            self.assertEqual(claimed_content, sha256(canonical_independent(content)).hexdigest())
            claimed_scientific = content.pop('scientific_sha256')
            self.assertEqual(claimed_scientific, sha256(canonical_independent(content)).hexdigest())
            self.assertEqual(parsed['payload']['exact'], f'{Fraction(index, 3).numerator}/{Fraction(index, 3).denominator}')
            previous = sha256(raw).hexdigest()
            self.assertEqual(instance.verify(), previous)
            instance.require(stage)
            scientific.append((stage, claimed_scientific))
        self.assertEqual(instance.scientific_digests(), tuple(scientific))
        self.code('STAGE_ORDER_VIOLATION', instance.commit, 'evaluation', {})

    def test_deterministic_across_attempts_and_identity_sensitivity(self):
        first, second = self.new(), self.new()
        for index, stage in enumerate(EXPECTED_STAGES):
            first.commit(stage, {'rows': [index, {'value': Fraction(2, 7)}]})
            second.commit(stage, {'rows': [index, {'value': Fraction(2, 7)}]})
        self.assertEqual(first.scientific_digests(), second.scientific_digests())
        self.assertNotEqual(first.path, second.path)
        for path in sorted(first.path.iterdir()):
            self.assertEqual(path.read_bytes(), (second.path / path.name).read_bytes())
        changed = self.new()
        changed.commit('allocation', {'rows': [99]})
        self.assertNotEqual(changed.scientific_digests()[0], first.scientific_digests()[0])
        other = storemod.FixtureStageStore('different-source', custody.FixtureSource.from_bytes(b'other fixture'), self.impl)
        other.commit('allocation', {'rows': [0, {'value': Fraction(2, 7)}]})
        self.assertNotEqual(other.scientific_digests()[0], first.scientific_digests()[0])
        revised_code = storemod.FixtureStageStore('different-code', self.source, {'constructed_driver.py': '3'*64})
        revised_code.commit('allocation', {'rows': [0, {'value': Fraction(2, 7)}]})
        self.assertNotEqual(revised_code.scientific_digests()[0], first.scientific_digests()[0])

    def test_returned_snapshot_input_and_hashmap_mutations_are_isolated(self):
        instance = self.new()
        original_source = dict(instance._source)
        payload = {'nested': {'list': [1, 2]}, 'rational': Fraction(1, 3)}
        snapshot = instance.commit('allocation', payload)
        before = instance.scientific_digests()
        payload['nested']['list'][0] = 999
        self.impl['constructed_driver.py'] = 'f'*64
        snapshot['source']['sha256'] = 'e'*64
        snapshot['implementation']['constructed_driver.py'] = 'd'*64
        snapshot['scope']['production_authorized'] = True
        snapshot['payload']['nested']['list'].append('changed')
        snapshot['reasons'].append('PRIVATE_CANARY')
        self.assertEqual(instance.scientific_digests(), before)
        following = instance.commit('input_freeze', {})
        self.assertEqual(following['source'], original_source)
        self.assertEqual(following['implementation']['constructed_driver.py'], '1'*64)
        self.assertFalse(following['scope']['production_authorized'])
        with self.assertRaises(AttributeError):
            instance.path = self.root / 'elsewhere'

    def test_no_skip_duplicate_or_continue_after_each_terminal_status(self):
        instance = self.new()
        for invalid in ('development', '', None, True, 0, [], {}):
            self.code('STAGE_ORDER_VIOLATION', instance.commit, invalid, {})
        instance.commit('allocation', {})
        self.code('STAGE_ORDER_VIOLATION', instance.commit, 'allocation', {})
        self.code('STAGE_ORDER_VIOLATION', instance.require, 'input_freeze')
        for status in ('BLOCKED', 'INCOMPLETE', 'NO_GO_INSUFFICIENT_DEVELOPMENT'):
            terminal = self.new()
            receipt = terminal.commit('allocation', {'partial': None}, status=status, reasons=('WALL_TIME_LIMIT',))
            self.assertEqual(receipt['status'], status)
            terminal.verify()
            self.code('STAGE_ORDER_VIOLATION', terminal.require, 'allocation')
            self.code('STAGE_ORDER_VIOLATION', terminal.commit, 'input_freeze', {})

    def test_status_reasons_and_implementation_types_rejected_without_file(self):
        instance = self.new()
        bad = [(True, ()), (1, ()), ([], ()), ({}, ()), ('UNKNOWN', ()),
               ('COMPLETE', ('WALL_TIME_LIMIT',)), ('BLOCKED', ()), ('BLOCKED', []),
               ('BLOCKED', ('PRIVATE_CANARY',)), ('BLOCKED', (True,))]
        for status, reasons in bad:
            self.code('SCHEMA_INVALID', instance.commit, 'allocation', {}, status=status, reasons=reasons)
            self.assertEqual(instance.stages, ())
            self.assertFalse((instance.path / '00-allocation.json').exists())
        for badmap in ({}, [], {'x': True}, {'x': 'A'*64}, {'': '1'*64}, {True: '1'*64}, {'x': '1'*63}):
            self.code('SCHEMA_INVALID', storemod.FixtureStageStore, 'bad-map', self.source, badmap)
        self.code('SYNTHETIC_FIXTURE_REQUIRED', storemod.FixtureStageStore, 'bad-source', {'bytes': 1}, self.impl)
        instance.commit('allocation', {})

    def test_traversal_existing_destinations_and_symlinks(self):
        for name in ('../escape', '/absolute', '.', '..', 'a/b', 'a\\b', 'a\x00b', 'a'*81, '', True):
            self.code('OUTPUT_PATH_INVALID', storemod.FixtureStageStore, name, self.source, self.impl)
        instance = self.new()
        initial = (instance.path / 'attempt-start.json').read_bytes()
        self.code('OUTPUT_ALREADY_EXISTS', storemod.FixtureStageStore, instance.path.name, self.source, self.impl)
        self.assertEqual(initial, (instance.path / 'attempt-start.json').read_bytes())
        target = self.root / 'unrelated'; target.mkdir()
        symlink = self.attempts / 'linked'; symlink.symlink_to(target, target_is_directory=True)
        self.code('OUTPUT_ALREADY_EXISTS', storemod.FixtureStageStore, 'linked', self.source, self.impl)
        original = instance.path
        original.rename(self.root / 'preserved-attempt')
        original.symlink_to(target, target_is_directory=True)
        self.code('INPUT_IDENTITY_MISMATCH', instance.verify)
        self.assertEqual(list(target.iterdir()), [])

    def test_predecessor_missing_changed_or_symlink_never_allows_next_stage(self):
        for operation in ('delete', 'replace', 'symlink'):
            instance = self.new()
            instance.commit('allocation', {})
            predecessor = instance.path / '00-allocation.json'
            original = predecessor.read_bytes()
            predecessor.unlink()
            if operation == 'replace': predecessor.write_bytes(original.replace(b'COMPLETE', b'BLOCKED_'))
            if operation == 'symlink':
                copy = self.root / f'copy-{self.serial}'; copy.write_bytes(original)
                predecessor.symlink_to(copy)
            self.code('INPUT_IDENTITY_MISMATCH', instance.commit, 'input_freeze', {})
            self.assertFalse((instance.path / '01-input_freeze.json').exists())
        instance = self.new()
        (instance.path / 'attempt-start.json').write_bytes(b'{}\n')
        self.code('INPUT_IDENTITY_MISMATCH', instance.commit, 'allocation', {})

    def test_existing_stage_sentinel_not_overwritten(self):
        instance = self.new()
        stage = instance.path / '00-allocation.json'
        stage.write_bytes(b'UNRELATED_SENTINEL')
        self.code('OUTPUT_ALREADY_EXISTS', instance.commit, 'allocation', {})
        self.assertEqual(stage.read_bytes(), b'UNRELATED_SENTINEL')
        self.assertEqual(instance.stages, ())
        stage.unlink()
        target = self.root / 'sentinel'; target.write_bytes(b'UNRELATED_SENTINEL')
        stage.symlink_to(target)
        self.code('OUTPUT_ALREADY_EXISTS', instance.commit, 'allocation', {})
        self.assertEqual(target.read_bytes(), b'UNRELATED_SENTINEL')

    def test_canonical_reader_rejects_duplicates_nonfinite_float_and_noncanonical(self):
        invalid = [b'{"x":1,"x":2}\n', b'{"x":NaN}\n', b'{"x":Infinity}\n',
                   b'{"x":-Infinity}\n', b'{"x":1.0}\n', b'{"x":1e0}\n',
                   b'{"x": 1}\n', b'{"x":1}', b'{}\n\n', b'\xef\xbb\xbf{}\n',
                   b'{"x":"\xff"}\n', b'{"x":01}\n', b'{"x":true,"x":false}\n']
        for raw in invalid:
            self.code('SCHEMA_INVALID', storemod._loads, raw)
        for value in ({'z': True, 'a': None}, [0, -2, '2/3'], {'unicode': 'λ'}):
            self.assertEqual(storemod._loads(canonical_independent(value)), value)

    def test_exact_normalization_resource_and_type_boundaries(self):
        @dataclass(frozen=True)
        class Record:
            exact: Fraction
            flag: bool
        self.assertEqual(storemod.normalize(Record(Fraction(4, 6), False)), {'exact': '2/3', 'flag': False})
        self.assertEqual(storemod.normalize((1, Fraction(0), Fraction(-6, 2))), [1, '0/1', '-3/1'])
        for value in (1.0, float('nan'), float('inf'), b'bytes', {1: 'bad'}, {True: 'bad'}, set(), object(), {'x'*257: 1}):
            self.code('SCHEMA_INVALID', storemod.canonical, value)
        for value in ('x'*5001, 1 << 8192, Fraction(1, 1 << 8192), '\ud800'):
            self.code('SCHEMA_INVALID', storemod.canonical, value)
        self.assertEqual(storemod.normalize((1 << 8192)-1), (1 << 8192)-1)
        self.assertEqual(storemod.normalize('x'*5000), 'x'*5000)
        nested = 0
        for _ in range(32): nested = [nested]
        storemod.canonical(nested)
        self.code('SCHEMA_INVALID', storemod.canonical, [nested])
        self.code('SCHEMA_INVALID', storemod.canonical, [None] * 1000000)
        self.code('SCHEMA_INVALID', storemod.canonical, ['x'*5000]*6800)
        cycle = []; cycle.append(cycle)
        self.code('SCHEMA_INVALID', storemod.canonical, cycle)

    def test_canonical_exact_byte_and_node_limits_and_type_distinction(self):
        cap = 32*1048576
        count = (cap-5)//5003
        final_length = cap-(count*5003+5)
        value = ['x'*5000]*count + ['y'*final_length]
        self.assertEqual(len(storemod.canonical(value)), cap)
        value[-1] += 'z'
        self.code('SCHEMA_INVALID', storemod.canonical, value)
        self.assertEqual(len(storemod.normalize([None]*999999)), 999999)
        self.code('SCHEMA_INVALID', storemod.normalize, [None]*1000000)
        self.assertNotEqual(storemod.digest({'value': True}), storemod.digest({'value': 1}))
        self.assertEqual(storemod.digest(Fraction(1)), storemod.digest('1/1'))

    def test_receipt_file_size_preflight_prevents_open(self):
        instance = self.new()
        path = instance.path / 'attempt-start.json'
        with path.open('wb') as stream:
            stream.truncate(32*1048576+1)
        with patch.object(storemod.os, 'read', side_effect=AssertionError('oversized file must not be read')):
            self.code('INPUT_IDENTITY_MISMATCH', instance.verify)

    def test_parent_swap_during_publication_cannot_return_complete_elsewhere(self):
        instance = self.new()
        destination = self.root / 'unrelated-destination'; destination.mkdir()
        original_open = storemod.os.open
        fired = False
        def replace_before_open(path, flags, *args, **kwargs):
            nonlocal fired
            if str(path).endswith('00-allocation.json') and not fired:
                fired = True
                instance.path.rename(self.root / 'original-attempt')
                instance.path.symlink_to(destination, target_is_directory=True)
            return original_open(path, flags, *args, **kwargs)
        with patch.object(storemod.os, 'open', side_effect=replace_before_open):
            with self.assertRaises(storemod.StageError):
                instance.commit('allocation', {'synthetic': True})
        self.assertTrue(fired)
        self.assertFalse((destination / '00-allocation.json').exists())
        self.assertEqual(instance.stages, ())

    def test_failed_flush_cannot_leave_completion_named_receipt(self):
        instance = self.new()
        with patch.object(storemod.os, 'fsync', side_effect=OSError('PRIVATE_SYNTHETIC_CANARY')):
            self.code('CACHE_IO_FAILURE', instance.commit, 'allocation', {'synthetic': True})
        self.assertFalse((instance.path / '00-allocation.json').exists())
        self.assertEqual(instance.stages, ())

    def test_directory_flush_failure_and_short_writes_leave_no_false_completion(self):
        instance = self.new()
        original_fsync = storemod.os.fsync
        def fail_directory(descriptor):
            import stat
            if stat.S_ISDIR(os.fstat(descriptor).st_mode):
                raise OSError('PRIVATE_SYNTHETIC_CANARY')
            return original_fsync(descriptor)
        with patch.object(storemod.os, 'fsync', side_effect=fail_directory):
            self.code('CACHE_IO_FAILURE', instance.commit, 'allocation', {'synthetic': True})
        self.assertFalse((instance.path / '00-allocation.json').exists())
        self.assertFalse((instance.path / '.pending-00-allocation.json').exists())
        self.assertEqual(instance.stages, ())
        second = self.new()
        original_write = storemod.os.write
        calls = 0
        def short_write(descriptor, value):
            nonlocal calls
            calls += 1
            return original_write(descriptor, value[:7])
        with patch.object(storemod.os, 'write', side_effect=short_write):
            second.commit('allocation', {'synthetic': True})
        self.assertGreater(calls, 1)
        second.verify()
        third = self.new()
        with patch.object(storemod.os, 'write', return_value=0):
            self.code('CACHE_IO_FAILURE', third.commit, 'allocation', {})
        self.assertFalse((third.path / '00-allocation.json').exists())
        self.assertFalse((third.path / '.pending-00-allocation.json').exists())
        self.assertEqual(third.stages, ())

    def test_pending_name_replacement_cannot_publish_foreign_bytes_as_complete(self):
        instance = self.new()
        original_fsync = storemod.os.fsync
        fired = False
        def replace_pending(descriptor):
            nonlocal fired
            pending = instance.path / '.pending-00-allocation.json'
            if pending.exists() and not fired:
                fired = True
                pending.rename(instance.path / 'preserved-original-pending')
                pending.write_bytes(b'FOREIGN_PRIVATE_SYNTHETIC_BYTES')
            return original_fsync(descriptor)
        with patch.object(storemod.os, 'fsync', side_effect=replace_pending):
            with self.assertRaises(storemod.StageError):
                instance.commit('allocation', {'synthetic': True})
        self.assertTrue(fired)
        self.assertEqual(instance.stages, ())

    def test_anchored_cleanup_preserves_unrelated_same_named_pending(self):
        instance = self.new()
        other = self.root / 'unrelated'; other.mkdir()
        sentinel = other / '.pending-00-allocation.json'
        sentinel.write_bytes(b'UNRELATED_SENTINEL')
        original = self.root / 'preserved-original'
        original_write = storemod.os.write
        fired = False
        def swap_during_write(descriptor, value):
            nonlocal fired
            if not fired:
                fired = True
                instance.path.rename(original)
                instance.path.symlink_to(other, target_is_directory=True)
                raise OSError('PRIVATE_SYNTHETIC_CANARY')
            return original_write(descriptor, value)
        with patch.object(storemod.os, 'write', side_effect=swap_during_write):
            self.code('CACHE_IO_FAILURE', instance.commit, 'allocation', {'synthetic': True})
        self.assertTrue(fired)
        self.assertEqual(sentinel.read_bytes(), b'UNRELATED_SENTINEL')
        self.assertFalse((original / '.pending-00-allocation.json').exists())
        self.assertFalse((other / '00-allocation.json').exists())
        self.assertEqual(instance.stages, ())

    def test_fifo_marker_and_replaced_named_inode_are_rejected(self):
        instance = self.new()
        marker = instance.path / 'attempt-start.json'
        marker.unlink()
        os.mkfifo(marker)
        self.code('INPUT_IDENTITY_MISMATCH', instance.verify)
        second = self.new()
        second_marker = second.path / 'attempt-start.json'
        original_read = storemod.os.read
        fired = False
        def replace_after_read(descriptor, size):
            nonlocal fired
            raw = original_read(descriptor, size)
            if not fired:
                fired = True
                replacement = second.path / 'replacement'
                replacement.write_bytes(second_marker.read_bytes())
                replacement.replace(second_marker)
            return raw
        with patch.object(storemod.os, 'read', side_effect=replace_after_read):
            self.code('INPUT_IDENTITY_MISMATCH', second.verify)
        self.assertTrue(fired)

    def test_created_inode_content_corruption_is_rejected_before_success(self):
        instance = self.new()
        original_fsync = storemod.os.fsync
        fired = False
        def corrupt_created_inode(descriptor):
            nonlocal fired
            pending = instance.path / '.pending-00-allocation.json'
            if pending.exists() and not fired:
                fired = True
                pending.write_bytes(b'CORRUPTED_SYNTHETIC_BYTES')
            return original_fsync(descriptor)
        with patch.object(storemod.os, 'fsync', side_effect=corrupt_created_inode):
            self.code('INPUT_IDENTITY_MISMATCH', instance.commit, 'allocation', {})
        self.assertTrue(fired)
        self.assertFalse((instance.path / '00-allocation.json').exists())
        self.assertFalse((instance.path / '.pending-00-allocation.json').exists())
        self.assertEqual(instance.stages, ())

    def test_ancestor_symlink_and_closed_store_are_rejected(self):
        instance = self.new()
        instance.close()
        instance.close()
        self.code('INPUT_IDENTITY_MISMATCH', instance.verify)
        self.code('INPUT_IDENTITY_MISMATCH', instance.commit, 'allocation', {})
        elsewhere = self.root / 'unrelated-parent'; elsewhere.mkdir()
        alias = self.root / 'ancestor-alias'; alias.symlink_to(elsewhere, target_is_directory=True)
        with patch.object(storemod, 'ATTEMPTS', alias / 'attempts'):
            with self.assertRaises(storemod.StageError):
                storemod.FixtureStageStore('new', self.source, self.impl)
        self.assertEqual(list(elsewhere.iterdir()), [])

    def test_relocated_main_and_scratch_layouts_keep_fresh_outputs_ignored(self):
        source = (SCRIPTS / 'mpea_stage_store.py').read_bytes()
        for layout in ('main', 'scratch'):
            with self.subTest(layout=layout):
                root = self.root / ('relocated-' + layout)
                (root / 'src/lupine_discovery').mkdir(parents=True)
                (root / 'scripts').mkdir()
                (root / 'src/lupine_discovery/decision_pool.py').write_text('# synthetic marker only\n')
                (root / 'scripts/mpea_features.py').write_text('# synthetic marker only\n')
                location = (root / 'scripts' if layout == 'main' else
                            root / '.cache/mpea-study-custody/scripts')
                location.mkdir(parents=True, exist_ok=True)
                module_path = location / 'mpea_stage_store.py'
                module_path.write_bytes(source)
                spec = importlib.util.spec_from_file_location('relocated_store_' + layout, module_path)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                expected = root / '.cache/mpea-study-custody/attempts'
                self.assertEqual(module.ROOT, root)
                self.assertEqual(module.ATTEMPTS, expected)
                if layout == 'main': self.assertFalse((root / '.cache').exists())
                relocated = module.FixtureStageStore('fresh', self.source, self.impl)
                try:
                    relocated.commit('allocation', {'synthetic': True})
                    relocated.verify()
                    self.assertEqual(relocated.path, expected / 'fresh')
                    self.assertTrue((expected / 'fresh/00-allocation.json').is_file())
                    self.assertFalse((root / 'attempts').exists())
                    self.assertFalse((root / 'scripts/attempts').exists())
                finally:
                    relocated.close()
        symlink_root = self.root / 'relocated-symlink'
        (symlink_root / 'src/lupine_discovery').mkdir(parents=True)
        (symlink_root / 'scripts').mkdir()
        (symlink_root / 'src/lupine_discovery/decision_pool.py').write_text('# synthetic marker\n')
        (symlink_root / 'scripts/mpea_features.py').write_text('# synthetic marker\n')
        module_path = symlink_root / 'scripts/mpea_stage_store.py'
        module_path.write_bytes(source)
        outside = self.root / 'outside-cache'; outside.mkdir()
        (symlink_root / '.cache').symlink_to(outside, target_is_directory=True)
        spec = importlib.util.spec_from_file_location('relocated_symlink_store', module_path)
        module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        with self.assertRaises(module.StageError):
            module.FixtureStageStore('blocked', self.source, self.impl)
        self.assertEqual(list(outside.iterdir()), [])

    def test_read_replacement_symlink_is_not_followed(self):
        instance = self.new()
        marker = instance.path / 'attempt-start.json'
        other = self.root / 'copied-marker'; other.write_bytes(marker.read_bytes())
        original_open = storemod.os.open
        fired = False
        def replace(path, flags, *args, **kwargs):
            nonlocal fired
            if str(path) == marker.name and not fired:
                fired = True
                marker.unlink()
                marker.symlink_to(other)
            return original_open(path, flags, *args, **kwargs)
        with patch.object(storemod.os, 'open', side_effect=replace):
            with self.assertRaises(storemod.StageError): instance.verify()
        self.assertTrue(fired)


if __name__ == '__main__':
    unittest.main()
