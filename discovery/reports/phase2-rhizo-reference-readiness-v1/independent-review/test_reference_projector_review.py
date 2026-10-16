"""Independent generated-input challenges. No real source operation is invoked."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from generated_fixtures import FRAME, SURFACE, VACANCY, encoded, generated_inputs

CANDIDATE = Path('/workspace/lupine-discovery-branch/discovery/.cache/phase2-rhizo-reference-projector-v1/reference_projector.py')
SPEC = importlib.util.spec_from_file_location('rhizo_projector_under_independent_review', CANDIDATE)
projector = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(projector)


def source_specs(payloads):
    result = []
    for base in projector.FILES:
        raw = payloads[base['path']]
        result.append({**base, 'bytes': len(raw),
                       'sha256': hashlib.sha256(raw).hexdigest(),
                       'git_blob_sha1': hashlib.sha1(b'blob ' + str(len(raw)).encode('ascii') + b'\0' + raw).hexdigest()})
    return result


def stable_projection(report):
    return {key: report[key] for key in ('units', 'locations', 'counts', 'scientific_status',
            'actual_bound_reference_choice', 'numeric_completeness_checked', 'reference_choice_made',
            'historical_map_is_re_relaxed_calculator', 'source_readiness', 'primary_source_rights',
            'fits', 'splits', 'labels_compared', 'status', 'reason')}


class IndependentProjectorReview(unittest.TestCase):
    def setUp(self):
        self.frame_raw, self.frame, self.documents, self.payloads = generated_inputs()
        self.first = self.frame['reference_locations'][0]

    def inspect(self, documents=None):
        return projector.inspect_synthetic(encoded(self.documents if documents is None else documents), self.frame_raw)

    def assert_blocked(self, public, private, reason):
        self.assertEqual(public['status'], 'BLOCKED')
        self.assertEqual(public['reason'], reason)
        self.assertIsNone(private)
        self.assertEqual(public['actual_bound_reference_choice'], 'UNKNOWN')
        self.assertEqual(public['scientific_status'], 'NOT_ADMITTED')
        self.assertFalse(public['reference_choice_made'])
        self.assertFalse(public['numeric_completeness_checked'])

    def temporary_sources(self, directory):
        paths = {}
        for index, (logical, raw) in enumerate(self.payloads.items()):
            path = Path(directory) / f'generated-{index}.json'
            path.write_bytes(raw)
            paths[logical] = path
        return paths

    def test_complete_graph_and_private_public_boundary(self):
        public, private = self.inspect()
        self.assertEqual(public['status'], 'PROJECTED_DOCUMENTARY_ONLY')
        self.assertEqual(public['counts']['projected_locations'], 43)
        self.assertEqual(len(public['units']), 36)
        self.assertEqual(sum(len(row['uses']) for row in public['locations']), 172)
        self.assertEqual(public['units'], self.frame['units'])
        self.assertEqual([(r['path'], r['source_ordinal']) for r in private['locations']],
                         [(r['path'], r['source_ordinal']) for r in self.frame['reference_locations']])
        text = json.dumps(public)
        for canary in ('PRIVATE_CITATION_CANARY', 'PRIVATE_LOCATOR_CANARY', 'PRIVATE_NOTES_CANARY',
                       'UNSELECTED_CITATION_CANARY', 'UNSELECTED_NOTES_CANARY', 'OPAQUE_FIELD_CANARY'):
            self.assertNotIn(canary, text)
        private_text = json.dumps(private)
        self.assertIn('PRIVATE_CITATION_CANARY', private_text)
        self.assertIn('PRIVATE_NOTES_CANARY', private_text)
        for canary in ('UNSELECTED_CITATION_CANARY', 'UNSELECTED_NOTES_CANARY', 'OPAQUE_FIELD_CANARY'):
            self.assertNotIn(canary, private_text)
        self.assertTrue(public['exposure']['whole_json_parse_completed'])
        self.assertTrue(public['exposure']['selected_strings_may_contain_outcomes'])
        self.assertEqual(public['exposure']['researcher_inspection'], 'NOT_OBSERVED_BY_THIS_PROGRAM')
        self.assertTrue(all(r['actual_bound_reference_choice'] == 'UNKNOWN' for r in public['locations']))

    def test_opaque_values_and_unselected_notes_do_not_change_conclusions(self):
        original, original_private = self.inspect()
        varied = copy.deepcopy(self.documents)
        selected = {(r['path'], r['source_ordinal']) for r in self.frame['reference_locations']}
        for path, document in varied.items():
            for ordinal, row in enumerate(document['entries']):
                row['value'] = 9
                row['opaque'] = 'OTHER_OPAQUE_CANARY'
                if (path, ordinal) not in selected:
                    row['source']['notes'] = 'OTHER_UNSELECTED_CANARY 999'
        changed, private = self.inspect(varied)
        self.assertEqual(stable_projection(original), stable_projection(changed))
        self.assertEqual(original_private, private)
        self.assertNotEqual(original['input_bindings'], changed['input_bindings'])
        # Legal JSON exponents are syntax-only; no float conversion or finiteness claim.
        huge = {path: raw.replace(b'"value":0', b'"value":1e999999999') for path, raw in self.payloads.items()}
        result, _ = projector.inspect_synthetic(huge, self.frame_raw)
        self.assertEqual(result['status'], 'PROJECTED_DOCUMENTARY_ONLY')
        self.assertFalse(result['numeric_completeness_checked'])

    def test_late_second_object_failure_preserves_exposure_not_partial_projection(self):
        last = [r for r in self.frame['reference_locations'] if r['path'] == VACANCY][-1]
        self.documents[VACANCY]['entries'][last['source_ordinal']]['unit'] = 'WRONG_UNIT_CANARY'
        public, private = self.inspect()
        self.assert_blocked(public, private, 'CONTEXT_MISMATCH')
        first, second = public['exposure']['objects']
        self.assertTrue(first['projection_completed'])
        self.assertTrue(second['json_parse_completed'])
        self.assertTrue(public['exposure']['whole_json_parse_completed'])
        self.assertTrue(second['projection_started'])
        self.assertFalse(second['projection_completed'])
        self.assertGreater(second['selected_locations_materialized'], 0)
        self.assertTrue(public['exposure']['selected_documentary_strings_materialized'])
        self.assertFalse(public['exposure']['private_projection_returned'])
        self.assertIsNone(public['locations'])
        self.assertEqual(public['counts']['projected_locations'], 0)

    def test_documentary_absence_null_empty_and_wrong_type(self):
        row = self.documents[self.first['path']]['entries'][self.first['source_ordinal']]
        row['source'] = {'doi_or_url': None, 'notes': ''}
        public, private = self.inspect()
        self.assertEqual(public['locations'][0]['documentary_field_status'],
                         {'citation': 'MISSING', 'doi_or_url': 'NULL', 'notes': 'EMPTY'})
        self.assertEqual(private['locations'][0]['source'], {'citation': None, 'doi_or_url': None, 'notes': ''})
        for invalid in (True, 7, [], {}):
            with self.subTest(invalid=type(invalid).__name__):
                row['source']['citation'] = invalid
                self.assert_blocked(*self.inspect(), 'DOCUMENTARY_FIELD_TYPE')

    def test_context_is_exact_and_frame_is_bound(self):
        row = self.documents[self.first['path']]['entries'][self.first['source_ordinal']]
        for key, invalid in (('method', 'dft-pbe'), ('unit', 'j/m^2'), ('material', True), ('property', 'gamma_100')):
            original = row[key]
            row[key] = invalid
            with self.subTest(key=key):
                self.assert_blocked(*self.inspect(), 'CONTEXT_MISMATCH')
            row[key] = original
        modified_frame = self.frame_raw + b' '
        with patch.object(projector, 'BoundedJSON', side_effect=AssertionError('source JSON must not parse')):
            self.assert_blocked(*projector.inspect_synthetic(self.payloads, modified_frame), 'FRAME_IDENTITY')

    def test_duplicate_keys_utf8_and_surrogate_contract(self):
        cases = [(b'{"x":1,"\\u0078":2}', 'JSON_DUPLICATE_KEY'),
                 (b'"\xff"', 'JSON_UTF8'), (b'"\\ud800"', 'JSON_SURROGATE'),
                 (b'NaN', 'JSON_SYNTAX'), (b'Infinity', 'JSON_SYNTAX'),
                 (b'01', 'JSON_SYNTAX'), (b'1.', 'JSON_SYNTAX'),
                 (b'[1,]', 'JSON_SYNTAX'), (b'{"a":1,}', 'JSON_SYNTAX')]
        for raw, reason in cases:
            with self.subTest(raw=raw):
                with self.assertRaises(projector.ProjectionError) as caught:
                    projector.BoundedJSON(raw).parse()
                self.assertEqual(str(caught.exception), reason)
        self.assertEqual(projector.BoundedJSON(b'"\\ud83d\\ude00"').parse(), '\U0001f600')

    def test_depth_string_and_node_boundaries(self):
        projector.BoundedJSON(b'[' * 31 + b'0' + b']' * 31).parse()
        with self.assertRaisesRegex(projector.ProjectionError, '^JSON_DEPTH_LIMIT$'):
            projector.BoundedJSON(b'[' * 32 + b'0' + b']' * 32).parse()
        self.assertEqual(len(projector.BoundedJSON(b'"' + b'a' * 16384 + b'"').parse()), 16384)
        with self.assertRaisesRegex(projector.ProjectionError, '^JSON_STRING_LIMIT$'):
            projector.BoundedJSON(b'"' + b'a' * 16385 + b'"').parse()
        projector.BoundedJSON(b'[' + b','.join([b'0'] * 19999) + b']').parse()
        with self.assertRaisesRegex(projector.ProjectionError, '^JSON_NODE_LIMIT$'):
            projector.BoundedJSON(b'[' + b','.join([b'0'] * 20000) + b']').parse()
        # An object contributes one node plus one key and one value per pair.
        pairs = [b'"k' + str(i).encode('ascii') + b'":0' for i in range(10000)]
        projector.BoundedJSON(b'{' + b','.join(pairs[:-1]) + b'}').parse()
        with self.assertRaisesRegex(projector.ProjectionError, '^JSON_NODE_LIMIT$'):
            projector.BoundedJSON(b'{' + b','.join(pairs) + b'}').parse()

    def test_known_actual_identity_rejected_before_json(self):
        original_sha = projector.sha
        raw = self.payloads[SURFACE]
        actual_identity = projector.FILES[0]['sha256']
        with patch.object(projector, 'sha', side_effect=lambda x: actual_identity if x is raw else original_sha(x)):
            with patch.object(projector, 'BoundedJSON', side_effect=AssertionError('must not parse forbidden identity')):
                public, private = projector.inspect_synthetic(self.payloads, self.frame_raw)
        self.assert_blocked(public, private, 'ACTUAL_INPUT_FORBIDDEN')
        self.assertFalse(public['exposure']['whole_json_parse_started'])

    def test_generated_file_wrapper_reads_each_once_and_separates_outputs(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = self.temporary_sources(directory)
            slot = Path(directory) / 'output'
            with patch.object(projector, '_read_once', wraps=projector._read_once) as reader:
                report = projector.run_synthetic_files(paths, source_specs(self.payloads), self.frame_raw, slot)
            self.assertEqual(report['status'], 'PROJECTED_DOCUMENTARY_ONLY')
            self.assertEqual(len(reader.call_args_list), 2)
            self.assertEqual([c.args[0] for c in reader.call_args_list], [paths[SURFACE], paths[VACANCY]])
            self.assertEqual([c.args[1] for c in reader.call_args_list], [len(self.payloads[SURFACE]), len(self.payloads[VACANCY])])
            self.assertTrue(report['exposure']['private_projection_written'])
            self.assertFalse(report['exposure']['private_projection_returned'])
            self.assertIn('PRIVATE_NOTES_CANARY', (slot / 'private.json').read_text())
            self.assertNotIn('PRIVATE_NOTES_CANARY', (slot / 'public.json').read_text())
            self.assertEqual(json.loads((slot / 'public.json').read_bytes()), report)
            self.assertTrue((slot / 'reservation.json').is_file())

    def test_occupied_slot_and_source_symlink_block(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = self.temporary_sources(directory)
            slot = Path(directory) / 'occupied'
            slot.mkdir()
            with patch.object(projector, '_read_once', side_effect=AssertionError('no source access')):
                report = projector.run_synthetic_files(paths, source_specs(self.payloads), self.frame_raw, slot)
            self.assertEqual(report['reason'], 'OUTPUT_RESERVATION')
            self.assertFalse(report['exposure']['target_bearing_byte_access_may_have_occurred'])
            alias = Path(directory) / 'source-alias'
            alias.symlink_to(paths[SURFACE])
            paths[SURFACE] = alias
            report = projector.run_synthetic_files(paths, source_specs(self.payloads), self.frame_raw, Path(directory) / 'fresh')
            self.assertEqual(report['reason'], 'SOURCE_PATH')
            self.assertFalse(report['exposure']['whole_json_parse_started'])

    def test_changed_generated_object_stops_before_second_read(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = self.temporary_sources(directory)
            raw = self.payloads[SURFACE]
            paths[SURFACE].write_bytes(raw.replace(b'"value":0', b'"value":9', 1))
            with patch.object(projector, '_read_once', wraps=projector._read_once) as reader:
                report = projector.run_synthetic_files(paths, source_specs(self.payloads), self.frame_raw, Path(directory) / 'output')
            self.assertEqual(report['reason'], 'SOURCE_IDENTITY')
            self.assertEqual(reader.call_count, 1)
            self.assertTrue(report['exposure']['objects'][0]['read_completed'])
            self.assertTrue(report['exposure']['target_bearing_bytes_returned_to_projector'])
            self.assertFalse(report['exposure']['whole_json_parse_started'])

    def test_partial_write_or_later_public_failure_preserves_private_disclosure(self):
        for failing_name in ('private.json', 'public.json'):
            with self.subTest(failing_name=failing_name), tempfile.TemporaryDirectory() as directory:
                paths = self.temporary_sources(directory)
                slot = Path(directory) / 'output'
                original = projector._write_new
                def write(path, value):
                    if path.name == failing_name:
                        if failing_name == 'private.json':
                            path.write_bytes(b'PARTIAL_SYNTHETIC_PRIVATE_CANARY')
                        raise OSError('ARBITRARY_EXCEPTION_CANARY')
                    return original(path, value)
                with patch.object(projector, '_write_new', side_effect=write):
                    report = projector.run_synthetic_files(paths, source_specs(self.payloads), self.frame_raw, slot)
                self.assertEqual(report['status'], 'BLOCKED')
                self.assertEqual(report['output_error'], 'OUTPUT_WRITE')
                self.assertTrue(report['private_output_may_exist'])
                self.assertEqual(report['exposure']['private_projection_written'], failing_name == 'public.json')
                self.assertNotIn('ARBITRARY_EXCEPTION_CANARY', json.dumps(report))
                self.assertTrue((slot / 'failure.json').is_file())

    def test_source_guard_change_before_read_stops_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = self.temporary_sources(directory)
            calls = 0
            def guard():
                nonlocal calls
                calls += 1
                if calls == 2:
                    raise projector.ProjectionError('SOURCE_BINDING')
            with patch.object(projector, '_read_once', side_effect=AssertionError('guard must stop access')):
                report = projector._run_files(paths, source_specs(self.payloads), self.frame_raw,
                                              Path(directory) / 'output', True, guard)
            self.assertEqual(report['status'], 'BLOCKED')
            self.assertEqual(report['reason'], 'SOURCE_BINDING')
            self.assertFalse(report['exposure']['target_bearing_byte_access_may_have_occurred'])


if __name__ == '__main__':
    unittest.main()
