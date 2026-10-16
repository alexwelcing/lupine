"""Independent public-metadata seal review; no allocation or source reader."""
import ast
from contextlib import ExitStack
from copy import deepcopy
from hashlib import sha256
import importlib.util
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = next(p for p in Path(__file__).resolve().parents
            if (p / 'src/lupine_discovery/decision_pool.py').is_file())
CANDIDATE = ROOT / '.cache/mpea-preallocation-diagnosis/candidate/scripts/mpea_registration_allocation.py'
BASELINE = ROOT / '.cache/mpea-preallocation-diagnosis/before/mpea_registration_allocation.py'
spec = importlib.util.spec_from_file_location('upstream_seal_peer_candidate', CANDIDATE)
m = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = m
spec.loader.exec_module(m)

PINS = {
    'reports/mpea-header-labels-v1.json': '70f50fa99db6b39b769be392ec1c64c655f8f32d7587f04f522e6a794c4accee',
    'reports/mpea-row-metadata-v1.json': '36e9831f2a015b2c295ce6228dd9b7bce5ba7df0f2645c343da2134ab7898c55',
    'reports/mpea-formula-tokens-v1.json': 'ce2b8d12464bac1c5e9533e136f09b3b65761188609279b40a78f31dbcc6d3a7',
    'docs/mpea-column-mapping-v1.json': '812255e53cceec8c66bd2a4b11d5d1e556941a053c888a7970cf2e3ec6728f97',
}

def oracle_body(value):
    return json.dumps(value, ensure_ascii=True, sort_keys=True,
                      separators=(',', ':'), allow_nan=False).encode('ascii')

def oracle_seal(payload, ending=b'\n'):
    return {**payload, 'content_sha256': sha256(oracle_body(payload) + ending).hexdigest()}

class PeerSealReview(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        for owner, name in ((m, '_allocate'), (m, '_development'), (m.os, 'urandom'),
                            (m.SAMPLER, 'sample_permutation'), (m.PARSER, 'parse_target'),
                            (m.PARSER, 'parse_fixture_targets'), (m, '_git'), (m, '_api')):
            self.stack.enter_context(patch.object(owner, name, side_effect=AssertionError('forbidden operation')))

    def assert_refused(self, fn, value, code='INPUT_IDENTITY_MISMATCH'):
        with self.assertRaises(m.RegistrationError) as got:
            fn(value)
        self.assertEqual(got.exception.code, code)

    def test_existing_functions_ast_unchanged_except_metadata_dispatch(self):
        old = ast.parse(BASELINE.read_text())
        new = ast.parse(CANDIDATE.read_text())
        index = lambda tree: {node.name: node for node in tree.body
                              if isinstance(node, (ast.FunctionDef, ast.ClassDef))}
        a, b = index(old), index(new)
        self.assertEqual(set(b) - set(a), {'verify_upstream_metadata_seal', '_read_public_metadata'})
        self.assertEqual(set(a) - set(b), set())
        for name in sorted(set(a) - {'load_public_metadata'}):
            with self.subTest(name=name):
                self.assertEqual(ast.dump(a[name]), ast.dump(b[name]))
        assignments = lambda tree: [ast.dump(node) for node in tree.body
                                    if not isinstance(node, (ast.FunctionDef, ast.ClassDef))]
        self.assertEqual(assignments(old), assignments(new))

    def test_constructed_domain_separation_over_typed_values(self):
        values = [None, False, True, 0, 1, -1, '', '\n', '\\n', 'λ', 'é', 'e\u0301',
                  [False, 0], {'z': 2, 'a': 1}, {'content_sha256': 'nested-is-content'}]
        for value in values:
            payload = {'z': value, 'schema': 'independent.constructed', 'a': [1, 2]}
            original = deepcopy(payload)
            upstream, internal = oracle_seal(payload), oracle_seal(payload, b'')
            with self.subTest(value_type=type(value).__name__):
                m.verify_upstream_metadata_seal(upstream)
                m.verify_seal(internal)
                self.assertEqual(m.sealed(payload), internal)
                self.assert_refused(m.verify_seal, upstream)
                self.assert_refused(m.verify_upstream_metadata_seal, internal)
                self.assertEqual(payload, original)

    def test_exact_one_lf_and_canonical_ascii_preimage(self):
        payload = {'z': 'λ', 'a': 1}
        for ending in (b'', b'\r\n', b'\n\n', b' ', b'\x00'):
            self.assert_refused(m.verify_upstream_metadata_seal, oracle_seal(payload, ending))
        for raw in (json.dumps(payload, sort_keys=True).encode() + b'\n',
                    json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode() + b'\n',
                    json.dumps(payload, ensure_ascii=True, separators=(',', ':')).encode() + b'\n'):
            self.assert_refused(m.verify_upstream_metadata_seal,
                                {**payload, 'content_sha256': sha256(raw).hexdigest()})
        m.verify_upstream_metadata_seal(dict(reversed(list(oracle_seal(payload).items()))))

    def test_seal_covers_values_types_and_nested_content_key(self):
        payload = {'count': 1, 'flag': False, 'rows': [{'content_sha256': 'inner', 'x': None}]}
        sealed = oracle_seal(payload)
        for path, value in (('count', True), ('flag', 0), ('rows', []),
                            ('rows', [{'content_sha256': 'other', 'x': None}])):
            changed = deepcopy(sealed)
            changed[path] = value
            self.assert_refused(m.verify_upstream_metadata_seal, changed)
        altered = {**sealed, 'new_key': None}
        self.assert_refused(m.verify_upstream_metadata_seal, altered)
        del sealed['count']
        self.assert_refused(m.verify_upstream_metadata_seal, sealed)

    def test_malformed_outer_seals_are_rejected(self):
        for value in (None, [], (), 1, False, {}, {'payload': 1}):
            self.assert_refused(m.verify_upstream_metadata_seal, value, 'SCHEMA_INVALID')
        for seal in (None, False, 0, [], {}, '0' * 64, 'F' * 64, 'short'):
            self.assert_refused(m.verify_upstream_metadata_seal, {'content_sha256': seal})

    def test_actual_public_pins_pass_independent_seal_oracle(self):
        self.assertEqual(m.METADATA_PINS, PINS)
        for name, expected in PINS.items():
            raw = (ROOT / name).read_bytes()
            self.assertEqual(sha256(raw).hexdigest(), expected)
            value = json.loads(raw)
            if name.startswith('reports/'):
                body = {k: v for k, v in value.items() if k != 'content_sha256'}
                self.assertEqual(oracle_seal(body), value)
                m.verify_upstream_metadata_seal(value)
                self.assert_refused(m.verify_seal, value)

    def test_real_public_reader_uses_only_four_captured_buffers(self):
        seen = []
        captured = m.captured
        def allowed(path):
            name = str(Path(path).relative_to(ROOT))
            self.assertIn(name, PINS)
            seen.append(name)
            return captured(path)
        with patch.object(m, 'captured', side_effect=allowed):
            context = m._read_public_metadata()
        self.assertEqual(seen, list(PINS))
        self.assertEqual(len(context.rows), 1545)
        self.assertEqual(tuple(row.ordinal for row in context.rows), tuple(range(1545)))
        self.assertEqual(len(context.header), 23)
        self.assertEqual(sum(row.condition_eligible for row in context.rows), 314)
        self.assertEqual(len({row.source_group for row in context.rows if row.condition_eligible}), 75)
        self.assertEqual(context.metadata_digest, sha256(oracle_body(PINS)).hexdigest())

    def test_each_whole_file_pin_precedes_that_documents_decode(self):
        public = {name: (ROOT / name).read_bytes() for name in PINS}
        for name, raw in public.items():
            content = json.loads(raw)
            body = {k: v for k, v in content.items() if k != 'content_sha256'}
            body['constructed_change'] = 'resealed'
            for changed in (raw + b' ', oracle_body(oracle_seal(body)) + b'\n', b'not-json'):
                decoded = []
                def capture(path):
                    key = str(Path(path).relative_to(ROOT))
                    self.assertIn(key, PINS)
                    return changed if key == name else public[key]
                decode = m.decode
                def record_decode(value):
                    self.assertNotEqual(value, changed)
                    decoded.append(value)
                    return decode(value)
                with self.subTest(name=name), patch.object(m, 'captured', side_effect=capture), \
                        patch.object(m, 'decode', side_effect=record_decode), \
                        patch.object(m, '_context', side_effect=AssertionError('tamper reached context')):
                    with self.assertRaises(m.RegistrationError) as got:
                        m._read_public_metadata()
                    self.assertEqual(got.exception.code, 'INPUT_IDENTITY_MISMATCH')
                    self.assertEqual(len(decoded), list(PINS).index(name))

    def test_public_read_does_not_supply_registration_authority(self):
        context = m._read_public_metadata()
        self.assertEqual(context.mode, 'REGISTERED')
        for mode in sorted(m.AUTHORIZED_MODES | {'SYNTHETIC', 'other'}):
            unissued = m.RegistrationIdentity(b'{}', mode)
            with patch.object(m, '_read_public_metadata', side_effect=AssertionError('unissued authority')):
                self.assert_refused(m.load_public_metadata, unissued, 'REGISTRATION_MISMATCH')

    def test_decode_still_rejects_duplicate_keys_floats_and_nonfinite(self):
        for raw in (b'{"content_sha256":"a","content_sha256":"b"}',
                    b'{"x":1.0}', b'{"x":1e0}', b'{"x":NaN}', b'{"x":Infinity}'):
            self.assert_refused(m.decode, raw, 'SCHEMA_INVALID')

if __name__ == '__main__':
    unittest.main()
