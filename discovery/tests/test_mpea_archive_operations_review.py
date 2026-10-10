"""Independent pure operational identity/status checks; synthetic digests only."""
import builtins
import copy
import hashlib
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest import mock

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'src/lupine_discovery/decision_pool.py').is_file())
SOURCE = Path(__file__).resolve().parents[1] / 'scripts/mpea_archive_operations.py'
spec = importlib.util.spec_from_file_location('independent_archive_operations', SOURCE)
m = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = m
spec.loader.exec_module(m)

EXPECTED_STAGES = ('allocation', 'input_freeze', 'development', 'rank_freeze', 'reserved', 'calibration', 'replay', 'evaluation')
EXPECTED_NAMES = tuple(f'stage-{i:02d}-{name.replace("_", "-")}.json' for i, name in enumerate(EXPECTED_STAGES)) + (
    'label-routes.json', 'development-targets.json', 'calibration-vault.json', 'evaluation-vault.json',
    'secondary-membership.json', 'completeness.json', 'rank-summary.json', 'public-report.json', 'attempt-result.json')
EXPECTED_REASONS = frozenset('''REGISTRATION_MISSING REGISTRATION_MISMATCH CI_NOT_PASSED ENGINEERING_NOT_PASSED
IMPLEMENTATION_MISMATCH SOURCE_IDENTITY_MISMATCH INPUT_IDENTITY_MISMATCH METADATA_LINKAGE_CONFLICT
METADATA_COUNT_MISMATCH SCHEMA_INVALID CSV_FRAMING_INVALID CSV_COUNT_MISMATCH OUTPUT_PATH_INVALID
OUTPUT_ALREADY_EXISTS CACHE_IO_FAILURE ALLOCATION_ALREADY_ATTEMPTED ALLOCATION_TRANSCRIPT_INVALID
ALLOCATION_PROVIDER_FAILURE ALLOCATION_DRAW_LIMIT ALLOCATION_INTERRUPTED FEATURE_PROFILE_MISMATCH
STAGE_ORDER_VIOLATION UNAUTHORIZED_TARGET_ACCESS DEVELOPMENT_ROWS_BELOW_50 DEVELOPMENT_GROUPS_BELOW_15
DOCUMENTED_ENDPOINT_CONFLICT ARITHMETIC_LIMIT WALL_TIME_LIMIT RSS_LIMIT WORKER_INTERRUPTED
STALE_OR_INVALID_DECISION REPLAY_REQUEST_INVALID REPLAY_INCOMPLETE INTERNAL_FAILURE'''.split())
SAFE_FAILURE = {'study_status': 'BLOCKED', 'study_reason': 'INTERNAL_FAILURE'}


def digest(text):
    return hashlib.sha256(text.encode()).hexdigest()


def identity(name, *, science=True):
    return {'bytes_sha256': digest('bytes:' + name), 'content_sha256': digest('content:' + name),
            'scientific_sha256': digest('science:' + name) if science else None}


def full_map():
    return {name: identity(name, science=name != 'attempt-result.json') for name in EXPECTED_NAMES}


class StatusReview(unittest.TestCase):
    def test_exact_closed_reason_set_and_logical_inventory(self):
        self.assertEqual(m.STUDY_REASONS, EXPECTED_REASONS)
        self.assertEqual(m.STAGES, EXPECTED_STAGES)
        self.assertEqual(m.ARTIFACT_NAMES, EXPECTED_NAMES)
        self.assertEqual(len(set(m.ARTIFACT_NAMES)), 17)

    def test_every_valid_stop_reason_preserves_blocked_and_incomplete(self):
        for status in ('BLOCKED', 'INCOMPLETE'):
            for reason in EXPECTED_REASONS:
                with self.subTest(status=status, reason=reason):
                    self.assertEqual(m.study_outcome(status, reason), {'study_status': status, 'study_reason': reason})

    def test_early_no_go_requires_exact_adequacy_reason_and_never_gets_verdict(self):
        for reason in ('DEVELOPMENT_ROWS_BELOW_50', 'DEVELOPMENT_GROUPS_BELOW_15'):
            value = m.study_outcome('NO_GO_INSUFFICIENT_DEVELOPMENT', reason)
            self.assertEqual(value, {'study_status': 'NO_GO_INSUFFICIENT_DEVELOPMENT', 'study_reason': reason})
        for reason in EXPECTED_REASONS - {'DEVELOPMENT_ROWS_BELOW_50', 'DEVELOPMENT_GROUPS_BELOW_15'}:
            value = m.study_outcome('NO_GO_INSUFFICIENT_DEVELOPMENT', reason)
            self.assertEqual(value['study_status'], 'BLOCKED')
            self.assertEqual(set(value), {'study_status', 'study_reason'})

    def test_internal_operational_cause_maps_exactly_without_echo_or_inferred_oom(self):
        internal = ('UNSUPPORTED_PLATFORM', 'NETWORK_ISOLATION_UNAVAILABLE', 'NETWORK_ISOLATION_FAILED',
                    'STARTUP_TIMEOUT', 'WORKER_SIGNALLED', 'WORKER_FAILED', 'SUPERVISOR_FAILURE')
        for reason in internal:
            self.assertEqual(m.study_outcome('BLOCKED', reason), SAFE_FAILURE)
        for reason in ('MARKER_INVALID', 'MARKER_ORDER_INVALID', 'MARKER_INCOMPLETE'):
            self.assertEqual(m.study_outcome('BLOCKED', reason), {'study_status': 'BLOCKED', 'study_reason': 'STAGE_ORDER_VIOLATION'})
        for reason in ('WALL_TIME_LIMIT', 'RSS_LIMIT', 'WORKER_INTERRUPTED'):
            self.assertEqual(m.study_outcome('BLOCKED', reason), {'study_status': 'BLOCKED', 'study_reason': reason})

    def test_only_exact_complete_pair_becomes_operational_complete(self):
        self.assertEqual(m.study_outcome('COMPLETE', 'COMPLETE'), {'study_status': 'COMPLETE', 'study_reason': None})
        for reason in (*EXPECTED_REASONS, None, True, '', 'GO_DESIGN_INDEPENDENT_STUDY', 'COMPLETE\n'):
            self.assertEqual(m.study_outcome('COMPLETE', reason)['study_status'], 'BLOCKED')
        # This helper does not establish terminal validity or scientific success.
        self.assertNotIn('overall_verdict', m.study_outcome('COMPLETE', 'COMPLETE'))

    def test_malformed_unknown_and_subclass_status_inputs_have_constant_failure(self):
        class String(str): pass
        class Hostile:
            def __repr__(self): raise AssertionError('repr must not be called')
            def __str__(self): raise AssertionError('str must not be called')
        for status, reason in [(True, 'COMPLETE'), ('COMPLETE', True), (None, 'COMPLETE'),
                (String('COMPLETE'), 'COMPLETE'), ('COMPLETE', String('COMPLETE')),
                ({'status': 'COMPLETE', 'extra': 'SENSITIVE'}, 'COMPLETE'),
                ('UNKNOWN_STATE', 'SECRET_TARGET_TOKEN'), (Hostile(), 'COMPLETE'),
                ('BLOCKED', Hostile()), ('BLOCKED', '\ud800')]:
            self.assertEqual(m.study_outcome(status, reason), SAFE_FAILURE)


class ComparisonReview(unittest.TestCase):
    def assert_closed(self, original, current):
        with self.assertRaises(m.OperationsError) as caught:
            m.compare_artifact_identities(original, current)
        self.assertEqual(str(caught.exception), 'SCHEMA_INVALID')
        self.assertEqual(caught.exception.code, 'SCHEMA_INVALID')

    def test_full_inventory_equality_and_order_independence(self):
        original = full_map(); reverse = dict(reversed(list(original.items())))
        first = m.compare_artifact_identities(original, reverse)
        second = m.compare_artifact_identities(reverse, original)
        self.assertEqual(first, second)
        self.assertEqual(list(first['files']), sorted(EXPECTED_NAMES))
        self.assertIs(first['same_artifact_universe'], True)
        self.assertIs(first['all_complete_file_bytes_identical'], True)
        self.assertIs(first['scientific_seals_identical'], True)
        self.assertEqual(first['scientific_identities_compared'], 16)
        self.assertEqual(first['complete_file_differences'], [])
        self.assertIsNone(first['files']['attempt-result.json']['scientific_identity_identical'])

    def test_all_whole_files_may_differ_with_unchanged_scientific_seals(self):
        original = full_map(); current = copy.deepcopy(original)
        for name, value in current.items():
            value['bytes_sha256'] = digest('different bytes:' + name)
            value['content_sha256'] = digest('different content:' + name)
        value = m.compare_artifact_identities(original, current)
        self.assertEqual(value['complete_file_differences'], sorted(EXPECTED_NAMES))
        self.assertIs(value['all_complete_file_bytes_identical'], False)
        self.assertIs(value['scientific_seals_identical'], True)
        self.assertTrue(all(v['content_identical'] is False for v in value['files'].values()))

    def test_scientific_mismatch_is_not_hidden_by_matching_byte_claims(self):
        original = full_map(); current = copy.deepcopy(original)
        current['stage-07-evaluation.json']['scientific_sha256'] = digest('changed scientific verdict')
        value = m.compare_artifact_identities(original, current)
        self.assertIs(value['all_complete_file_bytes_identical'], True)
        self.assertIs(value['scientific_seals_identical'], False)
        self.assertIs(value['files']['stage-07-evaluation.json']['scientific_identity_identical'], False)
        # Such contradictory supplied hashes would fail upstream file authentication.
        # The helper reports their distinctions; it cannot validate actual file bytes.

    def test_missing_counterparts_remain_explicit_in_both_directions(self):
        original = full_map(); current = copy.deepcopy(original); del current['development-targets.json']
        for left, right, left_present in [(original, current, True), (current, original, False)]:
            value = m.compare_artifact_identities(left, right)
            self.assertIs(value['same_artifact_universe'], False)
            self.assertIs(value['scientific_seals_identical'], False)
            self.assertIs(value['all_complete_file_bytes_identical'], False)
            self.assertEqual(value['complete_file_differences'], ['development-targets.json'])
            missing = value['files']['development-targets.json']
            self.assertIs(missing['original_present'], left_present)
            self.assertIs(missing['reproduction_present'], not left_present)
            self.assertIsNone(missing['reproduction_identity'] if left_present else missing['original_identity'])
            self.assertIsNone(missing['scientific_identity_identical'])

    def test_empty_and_only_nonscientific_maps_never_establish_science_equality(self):
        empty = m.compare_artifact_identities({}, {})
        self.assertEqual(empty['files'], {})
        for key in ('same_artifact_universe', 'all_complete_file_bytes_identical', 'scientific_seals_identical'):
            self.assertIs(empty[key], False)
        only = {'attempt-result.json': identity('operational', science=False)}
        value = m.compare_artifact_identities(only, only)
        self.assertIs(value['all_complete_file_bytes_identical'], True)
        self.assertEqual(value['scientific_identities_compared'], 0)
        self.assertIs(value['scientific_seals_identical'], False)

    def test_known_versus_unknown_scientific_slot_is_never_equal(self):
        original = full_map(); current = copy.deepcopy(original)
        current['stage-02-development.json']['scientific_sha256'] = None
        for left, right in ((original, current), (current, original)):
            value = m.compare_artifact_identities(left, right)
            self.assertIs(value['scientific_seals_identical'], False)
            self.assertEqual(value['scientific_identities_compared'], 15)
            cell = value['files']['stage-02-development.json']
            self.assertIs(cell['scientific_identity_comparable'], False)
            self.assertIsNone(cell['scientific_identity_identical'])

    def test_every_identity_field_required_and_extra_fields_rejected(self):
        for field in ('bytes_sha256', 'content_sha256', 'scientific_sha256'):
            bad = {'public-report.json': identity('public')}; del bad['public-report.json'][field]
            self.assert_closed(bad, {})
        bad = {'public-report.json': dict(identity('public'), target_values='SENSITIVE')}
        self.assert_closed(bad, {})

    def test_exact_digest_types_spellings_and_container_shapes_are_closed(self):
        class String(str): pass
        class Dict(dict): pass
        for field in ('bytes_sha256', 'content_sha256', 'scientific_sha256'):
            for value in (True, 1, 1.0, '', 'f'*63, 'f'*65, 'F'*64, String('f'*64), 'g'*64, ['f'*64], '\ud800'):
                bad = {'public-report.json': identity('public')}; bad['public-report.json'][field] = value
                self.assert_closed(bad, {})
        for field in ('bytes_sha256', 'content_sha256'):
            bad = {'public-report.json': identity('public')}; bad['public-report.json'][field] = None
            self.assert_closed(bad, {})
        for value in (None, [], True, Dict(full_map()), {'public-report.json': Dict(identity('public'))},
                      {String('public-report.json'): identity('public')},
                      {'public-report.json': {String(k): v for k, v in identity('public').items()}}):
            self.assert_closed(value, {})

    def test_only_exact_allowlisted_logical_names_are_accepted(self):
        for name in ('../public-report.json', '/public-report.json', 'public-report.json/extra',
                     'PUBLIC-REPORT.JSON', 'stage-02-development.json\x00', 'local-features.json',
                     'stage-8-evaluation.json', 'source.csv', 'public-report.json\n'):
            self.assert_closed({name: identity('x')}, {})
        oversized = {str(i): identity(str(i)) for i in range(18)}
        self.assert_closed(oversized, {})

    def test_original_reproduction_and_returned_views_are_detached(self):
        original = full_map(); current = copy.deepcopy(original)
        value = m.compare_artifact_identities(original, current)
        old = value['files']['public-report.json']['original_identity']['bytes_sha256']
        original['public-report.json']['bytes_sha256'] = digest('after')
        current['public-report.json']['bytes_sha256'] = digest('other after')
        self.assertEqual(value['files']['public-report.json']['original_identity']['bytes_sha256'], old)
        value['files']['public-report.json']['original_identity']['bytes_sha256'] = digest('output mutation')
        self.assertEqual(value['files']['public-report.json']['reproduction_identity']['bytes_sha256'], old)
        self.assertEqual(original['public-report.json']['bytes_sha256'], digest('after'))

    def test_pure_shape_helper_does_not_authenticate_completeness_or_read_files(self):
        supplied = {'stage-02-development.json': identity('fabricated file')}
        with mock.patch.object(builtins, 'open', side_effect=AssertionError('I/O reached')), \
             mock.patch.object(Path, 'open', side_effect=AssertionError('I/O reached')):
            result = m.compare_artifact_identities(supplied, supplied)
            terminal = m.study_outcome('COMPLETE', 'COMPLETE')
        self.assertIs(result['scientific_seals_identical'], True)
        self.assertEqual(len(result['files']), 1)
        self.assertEqual(terminal['study_status'], 'COMPLETE')
        self.assertEqual(result['scope'], 'caller_authenticated_declared_artifact_maps_only_complete_file_differences_do_not_imply_scientific_mismatch')
        # No complete run or actual terminal existed. Authentication and inventory
        # completeness are caller premises, not facts this pure helper establishes.


if __name__ == '__main__':
    unittest.main()
