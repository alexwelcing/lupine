"""Generated-only author fixtures; no actual custody/source operation."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
spec = importlib.util.spec_from_file_location('reference_projector', HERE / 'reference_projector.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)
FRAME_RAW = (ROOT / p.FRAME_PATH).read_bytes()
FRAME = json.loads(FRAME_RAW)


def documents():
    docs = {s['path']: {'schema': 'lupine.y_matrix_targets.v1', 'family': s['family'],
                       'entries': [{'value': -9876.12345, 'unused': 'UNMATCHED_PRIVATE_CANARY'}
                                   for _ in range(s['entries'])]} for s in p.FILES}
    for loc in FRAME['reference_locations']:
        ctx = loc['metadata_context']
        docs[loc['path']]['entries'][loc['source_ordinal']] = {
            'material': ctx['material'], 'structure': ctx['structure'],
            'method': ctx['method'], 'property': p.TARGETS[ctx['property']],
            'unit': 'eV' if ctx['property'] == 'vacancy_formation_energy' else 'J/m^2',
            'value': -9876.12345, 'source': {'citation': 'PRIVATE_CITATION_CANARY 123.45',
              'doi_or_url': 'https://example.invalid/PRIVATE_LOCATOR_CANARY/123.45',
              'notes': 'PRIVATE_NOTES_CANARY numerical outcome 123.45',
              'unprojected': 'IGNORED_SOURCE_CANARY'}}
    return docs


def payloads(docs=None):
    return {name: json.dumps(value, separators=(',', ':')).encode()
            for name, value in (documents() if docs is None else docs).items()}


def selected(docs, index=0):
    loc = FRAME['reference_locations'][index]
    return docs[loc['path']]['entries'][loc['source_ordinal']]


class ProjectionTests(unittest.TestCase):
    def run_docs(self, docs):
        return p.inspect_synthetic(payloads(docs), FRAME_RAW)

    def blocked(self, report, private, reason):
        self.assertEqual(report['status'], 'BLOCKED')
        self.assertEqual(report['reason'], reason)
        self.assertIsNone(private)
        self.assertIsNone(report['locations'])
        self.assertEqual(report['actual_bound_reference_choice'], 'UNKNOWN')

    def test_complete_graph_and_private_canaries(self):
        report, private = self.run_docs(documents())
        self.assertEqual(report['status'], 'PROJECTED_DOCUMENTARY_ONLY')
        self.assertEqual(len(report['locations']), 43)
        self.assertEqual(len(report['units']), 36)
        self.assertEqual(sum(len(x['uses']) for x in report['locations']), 172)
        self.assertEqual(len(private['locations']), 43)
        public_text = json.dumps(report)
        for canary in ('PRIVATE_CITATION_CANARY', 'PRIVATE_LOCATOR_CANARY', 'PRIVATE_NOTES_CANARY',
                       'UNMATCHED_PRIVATE_CANARY', 'IGNORED_SOURCE_CANARY', '-9876.12345'):
            self.assertNotIn(canary, public_text)
        private_text = json.dumps(private)
        for canary in ('PRIVATE_CITATION_CANARY', 'PRIVATE_LOCATOR_CANARY', 'PRIVATE_NOTES_CANARY'):
            self.assertIn(canary, private_text)
        for canary in ('UNMATCHED_PRIVATE_CANARY', 'IGNORED_SOURCE_CANARY', '-9876.12345'):
            self.assertNotIn(canary, private_text)
        self.assertTrue(report['exposure']['whole_json_parse_completed'])
        self.assertTrue(report['exposure']['private_projection_returned'])
        self.assertFalse(report['numeric_completeness_checked'])

    def test_opaque_value_invariance(self):
        a = documents(); b = copy.deepcopy(a)
        for doc in b.values():
            for entry in doc['entries']:
                entry['value'] = {'unexpected': [None, True, 'IGNORED_TARGET_CANARY']}
        ra, pa = self.run_docs(a); rb, pb = self.run_docs(b)
        ra.pop('input_bindings'); rb.pop('input_bindings')
        self.assertEqual(ra, rb); self.assertEqual(pa, pb)

    def test_duplicate_escaped_key(self):
        data = payloads(); name = p.FILES[0]['path']
        data[name] = data[name].replace(b'{"schema":', b'{"schem\\u0061":"x","schema":', 1)
        self.blocked(*p.inspect_synthetic(data, FRAME_RAW), 'JSON_DUPLICATE_KEY')

    def test_json_syntax_cases(self):
        for bad in (b'NaN', b'Infinity', b'-Infinity', b'01', b'+1', b'.1', b'1.', b'1e',
                    b'[1,]', b'{"a":1,}', b'{} trailing', b'\xef\xbb\xbf{}'):
            with self.subTest(bad=bad), self.assertRaises(p.ProjectionError):
                p.BoundedJSON(bad).parse()

    def test_utf8_and_surrogate(self):
        for bad, reason in ((b'"\xff"', 'JSON_UTF8'), (b'"\\ud800"', 'JSON_SURROGATE'),
                            (b'"\\udc00"', 'JSON_SURROGATE')):
            with self.subTest(bad=bad), self.assertRaisesRegex(p.ProjectionError, reason):
                p.BoundedJSON(bad).parse()
        self.assertEqual(p.BoundedJSON(b'"\\ud83d\\ude00"').parse(), '\U0001f600')

    def test_depth_boundary(self):
        p.BoundedJSON(b'[' * 31 + b'0' + b']' * 31).parse()
        with self.assertRaisesRegex(p.ProjectionError, 'JSON_DEPTH_LIMIT'):
            p.BoundedJSON(b'[' * 32 + b'0' + b']' * 32).parse()

    def test_node_boundary_and_keys(self):
        p.BoundedJSON(b'[' + b'0,' * 19998 + b'0]').parse()
        with self.assertRaisesRegex(p.ProjectionError, 'JSON_NODE_LIMIT'):
            p.BoundedJSON(b'[' + b'0,' * 19999 + b'0]').parse()
        parser = p.BoundedJSON(b'{"a":[0]}'); parser.parse()
        self.assertEqual(parser.nodes, 4)

    def test_string_boundary_including_keys(self):
        for template in (b'"%s"', b'{"%s":null}'):
            p.BoundedJSON(template % (b'x' * 16384)).parse()
            with self.assertRaisesRegex(p.ProjectionError, 'JSON_STRING_LIMIT'):
                p.BoundedJSON(template % (b'x' * 16385)).parse()

    def test_numeric_grammar_opaque_not_finiteness(self):
        for token in (b'-0', b'1.25', b'1e9999999999', b'-12E-7'):
            self.assertIs(p.BoundedJSON(token).parse(), p.OPAQUE_NUMBER)

    def test_container_and_entry_count(self):
        for mutation, reason in ((lambda d: d.pop('schema'), 'CONTAINER_LAYOUT'),
                                 (lambda d: d.update(family='other'), 'CONTAINER_LAYOUT'),
                                 (lambda d: d['entries'].pop(), 'ENTRY_COUNT'),
                                 (lambda d: d['entries'].__setitem__(0, None), 'CONTAINER_LAYOUT')):
            docs = documents(); mutation(docs[p.FILES[0]['path']])
            self.blocked(*self.run_docs(docs), reason)

    def test_all_exact_context_fields(self):
        for field in ('material', 'structure', 'method', 'property', 'unit'):
            for bad in ('WRONG_PRIVATE_CONTEXT', None, 1, False):
                docs = documents(); selected(docs)[field] = bad
                with self.subTest(field=field, bad=bad):
                    self.blocked(*self.run_docs(docs), 'CONTEXT_MISMATCH')

    def test_missing_empty_null_documentary_fields(self):
        docs = documents()
        selected(docs)['source'] = {'citation': '', 'doi_or_url': None}
        report, private = self.run_docs(docs)
        self.assertEqual(report['status'], 'PROJECTED_DOCUMENTARY_ONLY')
        self.assertEqual(report['locations'][0]['documentary_field_status'],
                         {'citation': 'EMPTY', 'doi_or_url': 'NULL', 'notes': 'MISSING'})
        selected(docs).pop('source')
        report, private = self.run_docs(docs)
        self.assertEqual(set(report['locations'][0]['documentary_field_status'].values()), {'MISSING'})

    def test_documentary_types(self):
        for field in ('citation', 'doi_or_url', 'notes'):
            for bad in (False, 1, {}, []):
                docs = documents(); selected(docs)['source'][field] = bad
                self.blocked(*self.run_docs(docs), 'DOCUMENTARY_FIELD_TYPE')
        docs = documents(); selected(docs)['source'] = None
        self.blocked(*self.run_docs(docs), 'DOCUMENTARY_FIELD_TYPE')

    def test_late_failure_is_atomic_but_not_unexposed(self):
        data = payloads(); data[p.FILES[1]['path']] = b'{bad'
        report, private = p.inspect_synthetic(data, FRAME_RAW)
        self.blocked(report, private, 'JSON_SYNTAX')
        self.assertTrue(report['exposure']['objects'][0]['projection_completed'])
        self.assertEqual(report['exposure']['objects'][0]['selected_locations_materialized'], 27)
        self.assertTrue(report['exposure']['selected_documentary_strings_materialized'])
        self.assertFalse(report['exposure']['private_projection_returned'])
        self.assertFalse(report['exposure']['whole_json_parse_completed'])

    def test_frame_identity_before_processing(self):
        report, private = p.inspect_synthetic(payloads(), FRAME_RAW + b' ')
        self.blocked(report, private, 'FRAME_IDENTITY')
        self.assertEqual(report['exposure']['objects'], [])

    def test_fixture_binding_limits_and_actual_hash_branch(self):
        data = payloads(); data[p.FILES[0]['path']] = b'x' * 44141
        self.blocked(*p.inspect_synthetic(data, FRAME_RAW), 'SOURCE_BINDING')
        data = payloads(); original = p.sha
        def fake_sha(raw):
            return p.FILES[0]['sha256'] if raw == data[p.FILES[0]['path']] else original(raw)
        with mock.patch.object(p, 'sha', side_effect=fake_sha):
            self.blocked(*p.inspect_synthetic(data, FRAME_RAW), 'ACTUAL_INPUT_FORBIDDEN')


class FileTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=HERE)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data = payloads()
        self.paths = {}
        for i, (name, raw) in enumerate(self.data.items()):
            self.paths[name] = self.root / f'{i}.json'
            self.paths[name].write_bytes(raw)
        self.specs = p._fixture_specs(self.data)
        self.slot = self.root / 'slot'

    def run_fixture(self):
        return p.run_synthetic_files(self.paths, self.specs, FRAME_RAW, self.slot)

    def test_exactly_two_bounded_reads_and_replay_reservation(self):
        with mock.patch.object(p, '_read_once', wraps=p._read_once) as read:
            report = self.run_fixture()
            self.assertEqual(read.call_count, 2)
            self.assertEqual([c.args[1] for c in read.call_args_list], [s['bytes'] for s in self.specs])
        self.assertEqual(report['status'], 'PROJECTED_DOCUMENTARY_ONLY')
        self.assertTrue(report['exposure']['private_projection_written'])
        before = {x.name: x.read_bytes() for x in self.slot.iterdir()}
        with mock.patch.object(p, '_read_once', side_effect=AssertionError('must not read')):
            self.assertEqual(self.run_fixture()['reason'], 'OUTPUT_RESERVATION')
        self.assertEqual(before, {x.name: x.read_bytes() for x in self.slot.iterdir()})

    def test_changed_bytes_stops_before_parse(self):
        name = p.FILES[0]['path']; raw = self.paths[name].read_bytes()
        self.paths[name].write_bytes(raw[:-1] + b' ')
        report = self.run_fixture()
        self.assertEqual(report['reason'], 'SOURCE_IDENTITY')
        self.assertEqual(len(report['exposure']['objects']), 1)
        self.assertTrue(report['exposure']['objects'][0]['read_completed'])
        self.assertFalse(report['exposure']['objects'][0]['json_parse_started'])

    def test_oversize_file_is_bounded(self):
        name = p.FILES[0]['path']
        with self.paths[name].open('ab') as f:
            f.write(b' ' * 1000)
        self.assertEqual(self.run_fixture()['reason'], 'SOURCE_IDENTITY')

    def test_source_symlink_rejected(self):
        name = p.FILES[0]['path']; link = self.root / 'link.json'
        link.symlink_to(self.paths[name]); self.paths[name] = link
        report = self.run_fixture()
        self.assertEqual(report['reason'], 'SOURCE_PATH')
        self.assertFalse(report['exposure']['objects'][0]['read_started'])

    def test_output_symlink_rejected_before_read(self):
        self.slot.symlink_to(self.root / 'other')
        with mock.patch.object(p, '_read_once', side_effect=AssertionError('must not read')):
            self.assertEqual(self.run_fixture()['reason'], 'SOURCE_PATH')

    def test_missing_second_object_preserves_first_exposure(self):
        self.paths[p.FILES[1]['path']].unlink()
        report = self.run_fixture()
        self.assertEqual(report['reason'], 'SOURCE_READ')
        self.assertTrue(report['exposure']['objects'][0]['projection_completed'])
        self.assertTrue(report['exposure']['target_bearing_byte_access_may_have_occurred'])
        self.assertFalse((self.slot / 'private.json').exists())

    def test_public_write_failure_preserves_private_disclosure(self):
        original = p._write_new
        def write(path, value):
            if path.name == 'public.json':
                raise OSError('PRIVATE_EXCEPTION_CANARY')
            return original(path, value)
        with mock.patch.object(p, '_write_new', side_effect=write):
            report = self.run_fixture()
        self.assertEqual(report['reason'], 'OUTPUT_WRITE')
        self.assertTrue(report['exposure']['private_projection_written'])
        self.assertTrue(report['private_output_may_exist'])
        self.assertNotIn('PRIVATE_EXCEPTION_CANARY', json.dumps(report))
        self.assertTrue((self.slot / 'failure.json').exists())

    def test_processing_error_not_overwritten_by_output_failure(self):
        name = p.FILES[0]['path']; self.paths[name].write_bytes(b'bad')
        original = p._write_new
        def write(path, value):
            if path.name == 'public.json': raise OSError('do not leak')
            return original(path, value)
        with mock.patch.object(p, '_write_new', side_effect=write):
            report = self.run_fixture()
        self.assertEqual(report['reason'], 'SOURCE_IDENTITY')
        self.assertEqual(report['output_error'], 'OUTPUT_WRITE')

    def test_guard_change_before_second_read(self):
        calls = []
        def guard():
            calls.append(None)
            if len(calls) == 3: p.fail('SOURCE_BINDING')
        report = p._run_files(self.paths, self.specs, FRAME_RAW, self.slot, True, guard)
        self.assertEqual(report['reason'], 'SOURCE_BINDING')
        self.assertTrue(report['exposure']['objects'][0]['read_completed'])
        self.assertFalse(report['exposure']['objects'][1]['read_started'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
