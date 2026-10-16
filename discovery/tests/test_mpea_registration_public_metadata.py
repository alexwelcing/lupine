"""Public pinned metadata and constructed seal checks; no scientific access."""
from contextlib import ExitStack
from hashlib import sha256
import importlib.util
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = next(p for p in Path(__file__).resolve().parents
            if (p / 'src/lupine_discovery/decision_pool.py').is_file())
SOURCE = Path(__file__).resolve().parents[1] / 'scripts/mpea_registration_allocation.py'
def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module
m = load('registration_public_metadata_tested', SOURCE)
PRODUCERS = {
    'reports/mpea-header-labels-v1.json': load('public_metadata_header_producer', ROOT / 'scripts/mpea_header_labels.py'),
    'reports/mpea-row-metadata-v1.json': load('public_metadata_rows_producer', ROOT / 'scripts/mpea_row_metadata.py'),
    'reports/mpea-formula-tokens-v1.json': load('public_metadata_formula_producer', ROOT / 'scripts/mpea_formula_tokens.py'),
}


class PublicMetadataRegression(unittest.TestCase):
    def setUp(self):
        self.raw = {name: (ROOT / name).read_bytes() for name in m.METADATA_PINS}
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.opened = []
        captured = m.captured
        def only_public(path):
            name = str(Path(path).relative_to(ROOT))
            if name not in m.METADATA_PINS:
                raise AssertionError('nonpublic capture forbidden')
            self.opened.append(name)
            return captured(path)
        self.stack.enter_context(patch.object(m, 'captured', side_effect=only_public))
        for owner, name in ((m, '_allocate'), (m, '_development'), (m.os, 'urandom'),
                            (m.SAMPLER, 'sample_permutation'), (m.PARSER, 'parse_target'),
                            (m.PARSER, 'parse_fixture_targets')):
            self.stack.enter_context(patch.object(owner, name, side_effect=AssertionError('scientific operation forbidden')))

    def test_all_actual_pins_and_upstream_primitive_seals(self):
        for name, raw in self.raw.items():
            with self.subTest(path=name):
                self.assertEqual(sha256(raw).hexdigest(), m.METADATA_PINS[name])
                if name not in PRODUCERS:
                    continue
                value = m.decode(raw)
                preimage = {key: v for key, v in value.items() if key != 'content_sha256'}
                produced = PRODUCERS[name].canonical_bytes(preimage)
                self.assertEqual(produced, m.canonical(preimage) + b'\n')
                self.assertEqual(sha256(produced).hexdigest(), value['content_sha256'])
                m.verify_upstream_metadata_seal(value)
                with self.assertRaises(m.RegistrationError) as error:
                    m.verify_seal(value)
                self.assertEqual(error.exception.code, 'INPUT_IDENTITY_MISMATCH')

    def test_actual_public_metadata_shape_and_pins_pass_without_authority(self):
        context = m._read_public_metadata()
        self.assertEqual(len(context.rows), 1545)
        self.assertEqual(len(context.header), 23)
        self.assertEqual(sum(row.condition_eligible for row in context.rows), 314)
        self.assertEqual(len({row.source_group for row in context.rows if row.condition_eligible}), 75)
        self.assertEqual(context.source_sha256, m.SOURCE['sha256'])
        self.assertEqual(context.metadata_digest, m.digest(m.METADATA_PINS))
        self.assertEqual(self.opened, list(m.METADATA_PINS))
        self.assertEqual(self.raw, {name: (ROOT / name).read_bytes() for name in m.METADATA_PINS})

    def test_internal_and_upstream_serializations_are_separate(self):
        payload = {'schema': 'constructed.only', 'unicode': '\u03bb', 'nested': {'flag': False, 'count': 0}}
        internal = m.sealed(payload)
        upstream = {**payload, 'content_sha256': sha256(m.canonical(payload) + b'\n').hexdigest()}
        m.verify_seal(internal)
        m.verify_upstream_metadata_seal(upstream)
        for verify, wrong in ((m.verify_seal, upstream), (m.verify_upstream_metadata_seal, internal)):
            with self.subTest(verifier=verify.__name__), self.assertRaises(m.RegistrationError) as error:
                verify(wrong)
            self.assertEqual(error.exception.code, 'INPUT_IDENTITY_MISMATCH')
        for producer in PRODUCERS.values():
            self.assertEqual(producer.canonical_bytes(payload), m.canonical(payload) + b'\n')

    def test_alternate_line_endings_spacing_and_tampered_payload_reject(self):
        payload = {'schema': 'constructed.only', 'count': 1}
        for raw in (m.canonical(payload), m.canonical(payload) + b'\r\n',
                    m.canonical(payload) + b'\n\n', json.dumps(payload, sort_keys=True).encode() + b'\n'):
            with self.subTest(preimage=raw), self.assertRaises(m.RegistrationError) as error:
                m.verify_upstream_metadata_seal({**payload, 'content_sha256': sha256(raw).hexdigest()})
            self.assertEqual(error.exception.code, 'INPUT_IDENTITY_MISMATCH')
        sealed = {**payload, 'content_sha256': sha256(m.canonical(payload) + b'\n').hexdigest()}
        with self.assertRaises(m.RegistrationError) as error:
            m.verify_upstream_metadata_seal({**sealed, 'count': 2})
        self.assertEqual(error.exception.code, 'INPUT_IDENTITY_MISMATCH')

    def test_corrupted_and_validly_resealed_public_bytes_fail_whole_file_pins(self):
        for name, original in self.raw.items():
            value = m.decode(original)
            content = {key: v for key, v in value.items() if key != 'content_sha256'}
            content['diagnostic_constructed_extension'] = True
            resealed = {**content, 'content_sha256': sha256(m.canonical(content) + b'\n').hexdigest()}
            variants = (original + b' ', m.canonical(resealed) + b'\n')
            for replacement in variants:
                def capture(path):
                    key = str(Path(path).relative_to(ROOT))
                    return replacement if key == name else self.raw[key]
                with self.subTest(path=name, resealed=replacement != variants[0]), \
                        patch.object(m, 'captured', side_effect=capture), \
                        patch.object(m, '_context', side_effect=AssertionError('context before pins')), \
                        self.assertRaises(m.RegistrationError) as error:
                    m._read_public_metadata()
                self.assertEqual(error.exception.code, 'INPUT_IDENTITY_MISMATCH')

    def test_nonissued_registration_stops_before_public_reads(self):
        for mode in sorted(m.AUTHORIZED_MODES | {'SYNTHETIC'}):
            registration = m.RegistrationIdentity(b'{}', mode)
            with self.subTest(mode=mode), patch.object(m, '_read_public_metadata', side_effect=AssertionError('authority bypass')), \
                    self.assertRaises(m.RegistrationError) as error:
                m.load_public_metadata(registration)
            self.assertEqual(error.exception.code, 'REGISTRATION_MISMATCH')
        self.assertEqual(self.opened, [])

    def test_missing_or_invalid_seal_has_closed_failure(self):
        for value, code in ((None, 'SCHEMA_INVALID'), ({}, 'SCHEMA_INVALID'),
                            ({'content_sha256': False}, 'INPUT_IDENTITY_MISMATCH'),
                            ({'content_sha256': '0' * 64}, 'INPUT_IDENTITY_MISMATCH')):
            with self.subTest(code=code), self.assertRaises(m.RegistrationError) as error:
                m.verify_upstream_metadata_seal(value)
            self.assertEqual(error.exception.code, code)


if __name__ == '__main__':
    unittest.main()
