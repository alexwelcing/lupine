"""Independent exact companion metadata and consumer-boundary controls.

All sources and features are constructed; no actual source or entropy is used.
The producer's builders are checked against independently written wire views.
"""
from copy import deepcopy
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
ROOT = next(p for p in HERE.parents if (p/'src/lupine_discovery').is_dir())
sys.path[:0] = [str(ROOT/'src'), str(ROOT/'scripts'), str(ROOT/'tests'), str(HERE)]
CONTROL_ROOT = ROOT/'.cache/reviewer-controls'
from mpea_archive_review_constructed_case import make_case
from test_mpea_production_store_review import registration
import mpea_archive_driver as d
import mpea_archive_custody as c

ROLES = ('DEVELOPMENT', 'CALIBRATION', 'EVALUATION')
COUNT_FIELDS = ('accumulated_row_counts', 'decoded_row_counts', 'interpreted_row_counts')
MATRIX = {
    'label-routes.json': 'allocation',
    'development-targets.json': 'development',
    'rank-summary.json': 'rank_freeze',
    'calibration-vault.json': 'reserved',
    'evaluation-vault.json': 'reserved',
    'secondary-membership.json': 'reserved',
    'completeness.json': 'reserved',
}


def usage(stage):
    return {
        'schema': 'lupine.discovery.mpea.companion_usage.v1',
        'enclosing_stage': stage,
        'measurement_scope': 'included_in_enclosing_stage_entry_to_prepublication_observation',
        'independent_artifact_measurement': False,
        'artifact_wall_seconds': None, 'artifact_cpu_seconds': None,
        'artifact_peak_rss_bytes': None,
        'artifact_measurement_status': 'NOT_SEPARATELY_MEASURED',
        'stage_observation_may_be_unavailable': True,
    }


def target_access(roles, counts, byte_count):
    return {
        'actor': 'target_custodian',
        'stage': 'development' if roles == ('DEVELOPMENT',) else 'reserved',
        'counter_scope': 'completed_authorized_role_parse_snapshot',
        'counter_unit': 'co_recorded_target_row_bundle_two_cells',
        'mixed_source_counter_scope': 'cumulative_worker_custodian_source_capture',
        'mixed_source_captures': 1, 'mixed_source_captured_bytes': byte_count,
        'authorized_target_positions': [11, 13], 'authorized_roles': list(roles),
        **{field: dict(counts) for field in COUNT_FIELDS},
        'unselected_target_values_decoded': False,
    }


def zero_access(stage):
    out = {
        'actor': 'allocation_manager' if stage == 'allocation' else 'public_rank_projector',
        'stage': stage, 'authorized_target_positions': [11, 13],
        'counter_scope': ('cumulative_worker_custodian_completed_role_parse_or_unknown'
                          if stage == 'allocation' else 'local_projector_no_source_capture_or_target_decode'),
        'counter_unit': 'co_recorded_target_row_bundle_two_cells',
        **{field: {role: 0 for role in ROLES} for field in COUNT_FIELDS},
        'mixed_source_captures': 0, 'mixed_source_captured_bytes': 0,
    }
    if stage == 'allocation':
        out.update(target_access_actor='target_custodian', unselected_target_values_decoded=False)
    else:
        out['scope'] = 'projection_of_already_frozen_development_model_aggregates_no_target_decode'
    return out


class CompanionObservabilityReview(unittest.TestCase):
    def setUp(self):
        CONTROL_ROOT.mkdir(mode=0o700, parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=CONTROL_ROOT, prefix='constructed-companion-')
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name)/'attempts'
        self.output_patch = patch.object(d.persistence, 'OUTPUT_ROOT', self.output)
        self.output_patch.start(); self.addCleanup(self.output_patch.stop)

    def store(self, name, *, kind='SYNTHETIC_FIXTURE'):
        store = d.persistence.ProductionStageStore(name, registration(),
            {'bytes': 12, 'md5': 'a'*32, 'sha256': 'b'*64}, execution_kind=kind)
        self.addCleanup(store.close)
        return store

    def expected_access(self, stage):
        if stage in ('allocation', 'rank_freeze'): return zero_access(stage)
        roles = ('DEVELOPMENT',) if stage == 'development' else ('CALIBRATION', 'EVALUATION')
        counts = {'DEVELOPMENT': 63} if stage == 'development' else {'CALIBRATION': 120, 'EVALUATION': 131}
        return target_access(roles, counts, 123456)

    def test_usage_has_exact_unknown_independent_costs_and_no_claimed_peak(self):
        for stage in set(MATRIX.values()):
            self.assertEqual(c.companion_usage(stage), usage(stage))
            a = c.companion_usage(stage); a['artifact_wall_seconds'] = '0/1'
            self.assertIsNone(c.companion_usage(stage)['artifact_wall_seconds'])
        for bad in (None, True, 0, '', 'evaluation', 'DEVELOPMENT'):
            with self.subTest(stage=bad), self.assertRaises(d.persistence.ProductionError):
                c.companion_usage(bad)

    def test_role_parse_counts_and_actual_capture_are_separate_exact_views(self):
        for roles, counts in ((('DEVELOPMENT',), {'DEVELOPMENT': 63}),
                             (('CALIBRATION', 'EVALUATION'), {'CALIBRATION': 120, 'EVALUATION': 131})):
            actual = c.target_companion_access(roles, counts, captures=1, captured_bytes=123456)
            self.assertEqual(actual, target_access(roles, counts, 123456))
            counts_copy = dict(counts)
            actual['decoded_row_counts'][roles[0]] = 0
            self.assertEqual(counts, counts_copy)
            self.assertEqual(actual['interpreted_row_counts'], counts)
        for captures, byte_count in ((True, 12), (0, 12), (2, 12), (1, True), (1, 0), (1, 332127)):
            with self.subTest(captures=captures, byte_count=byte_count), self.assertRaises(d.persistence.ProductionError):
                c.target_companion_access(('DEVELOPMENT',), {'DEVELOPMENT': 1}, captures=captures, captured_bytes=byte_count)
        with self.assertRaises(d.persistence.ProductionError):
            c.target_companion_access(('DEVELOPMENT',), {'DEVELOPMENT': True}, captures=1, captured_bytes=12)
        self.assertEqual(c.allocation_access(), zero_access('allocation'))
        self.assertEqual(c.rank_summary_access(), zero_access('rank_freeze'))

    def test_all_seven_closed_metadata_views_reject_resealed_shape_type_and_scope_mutations(self):
        for name, stage in MATRIX.items():
            expected = self.expected_access(stage)
            envelope = {'stage': stage, 'access': dict(expected, execution_scope='synthetic_fixture'), 'usage': usage(stage)}
            c.validate_companion_observability(envelope, stage, expected)
            mutations = []
            for section in ('access', 'usage'):
                altered = deepcopy(envelope); altered[section]['undeclared'] = None; mutations.append(altered)
                for key in envelope[section]:
                    altered = deepcopy(envelope); del altered[section][key]; mutations.append(altered)
            for key, value in (('independent_artifact_measurement', 0), ('stage_observation_may_be_unavailable', 1),
                               ('artifact_wall_seconds', '0/1'), ('artifact_peak_rss_bytes', 0),
                               ('enclosing_stage', 'evaluation')):
                altered = deepcopy(envelope); altered['usage'][key] = value; mutations.append(altered)
            for key, value in (('actor', 'invented'), ('authorized_target_positions', [13, 11]),
                               ('mixed_source_captures', bool(expected['mixed_source_captures'])),
                               ('mixed_source_captured_bytes', 0 if stage in ('development', 'reserved') else 1)):
                altered = deepcopy(envelope); altered['access'][key] = value; mutations.append(altered)
            role = next(iter(expected['decoded_row_counts']))
            altered = deepcopy(envelope); altered['access']['decoded_row_counts'][role] = True; mutations.append(altered)
            for index, altered in enumerate(mutations):
                with self.subTest(companion=name, mutation=index), self.assertRaises(d.persistence.ProductionError):
                    c.validate_companion_observability(altered, stage, expected)

    def test_allocation_writer_owns_metadata_and_refuses_overrides_before_write(self):
        store = self.store('fixed-writer'); proxy = d.AllocationUsageStore(store)
        for name, kwargs in (
            ('other.json', {'schema': 'lupine.discovery.mpea.label_routes.v1'}),
            ('label-routes.json', {'schema': 'lupine.discovery.mpea.target_vault.v1'}),
            ('label-routes.json', {'schema': 'lupine.discovery.mpea.label_routes.v1', 'access': {}}),
            ('label-routes.json', {'schema': 'lupine.discovery.mpea.label_routes.v1', 'usage': {}})):
            with self.subTest(name=name, kwargs=kwargs), self.assertRaises(d.persistence.ProductionError):
                proxy.write_artifact(name, {}, **kwargs)
            self.assertFalse((store.path/'label-routes.json').exists())
        identity = proxy.write_artifact('label-routes.json', {}, schema='lupine.discovery.mpea.label_routes.v1')
        envelope = store.read_artifact('label-routes.json', identity)
        self.assertEqual(envelope['access'], dict(zero_access('allocation'), execution_scope='synthetic_fixture'))
        self.assertEqual(envelope['usage'], usage('allocation'))

    def test_original_allocation_and_route_bytes_keep_descriptor_on_import_without_entropy(self):
        original = self.store('original', kind='PRODUCTION_ARCHIVE'); proxy = d.AllocationUsageStore(original)
        route = proxy.write_artifact('label-routes.json', {'original_row_routes': []}, schema='lupine.discovery.mpea.label_routes.v1')
        proxy.commit('allocation', {'route_artifact': route, 'role_map_sha256': route['bytes_sha256'],
                     'execution_kind': 'PRODUCTION_ARCHIVE', 'allocation_attempt_id': 'constructed-original'}, inputs={'label_routes': route})
        stage_raw = original.stage_bytes('allocation'); route_raw = original.artifact_bytes('label-routes.json', route)
        copied = self.store('reproduced', kind='REPRODUCTION_FIXED_ALLOCATION'); importing = d.AllocationUsageStore(copied)
        with patch.object(d.persistence.os, 'urandom', side_effect=AssertionError('entropy forbidden')):
            importing.import_original_allocation(stage_raw, original.stage_identity('allocation'), route_raw, route)
        self.assertEqual(copied.stage_bytes('allocation'), stage_raw)
        self.assertEqual(copied.artifact_bytes('label-routes.json', route), route_raw)
        self.assertEqual(copied.read_artifact('label-routes.json', route)['usage'], usage('allocation'))
        self.assertIsNotNone(importing.import_usage)

    def check_consumer_refusal(self, name, *, expected_decoded, forbidden_consumer):
        original_write = d.persistence.ProductionStageStore.write_artifact
        original_parse = c.parser.parse_target
        touched = []; decoded = []
        def write(store, artifact_name, payload, **kwargs):
            if artifact_name == name:
                kwargs = deepcopy(kwargs)
                # The store computes new valid scientific/content/byte seals.
                # The downstream gate must still reject the false metadata.
                if name in ('label-routes.json', 'calibration-vault.json', 'secondary-membership.json'):
                    kwargs['access']['actor'] = 'incorrect_actor'
                else:
                    kwargs['usage']['artifact_peak_rss_bytes'] = 0
                touched.append(artifact_name)
            return original_write(store, artifact_name, payload, **kwargs)
        def parse(raw, target):
            decoded.append(target); return original_parse(raw, target)
        with patch.object(d.persistence.ProductionStageStore, 'write_artifact', new=write), \
             patch.object(c.parser, 'parse_target', side_effect=parse), \
             patch.object(d.helpers.kernel, forbidden_consumer, side_effect=AssertionError('consumer_before_metadata_gate')) as consumer:
            result = d.run_synthetic(make_case(), 'rejected-'+name.replace('.json', ''), registration())
        self.addCleanup(result.store.close)
        self.assertEqual(touched, [name])
        self.assertEqual((result.status, result.reasons), ('BLOCKED', ('INPUT_IDENTITY_MISMATCH',)))
        self.assertEqual(len(decoded), expected_decoded)
        consumer.assert_not_called()
        self.assertEqual(result.source_captures, int(expected_decoded > 0))
        self.assertFalse(any(actor == 'EVALUATION_VAULT_OPEN' for actor, _ in result.access))
        if name != 'evaluation-vault.json':
            self.assertFalse(any(actor == 'CALIBRATION_VAULT_OPEN' for actor, _ in result.access))
        # Real store verification accepts this newly sealed prefix; schema gates
        # reject it. This is stronger than a stale whole-file hash mutation.
        result.store.verify()

    def test_false_route_access_blocks_before_capture_or_target_decode(self):
        self.check_consumer_refusal('label-routes.json', expected_decoded=0, forbidden_consumer='fit_development')

    def test_false_development_usage_blocks_before_model(self):
        self.check_consumer_refusal('development-targets.json', expected_decoded=126, forbidden_consumer='fit_development')

    def test_false_rank_usage_blocks_before_reserved_decode(self):
        self.check_consumer_refusal('rank-summary.json', expected_decoded=126, forbidden_consumer='calibrate_population')

    def test_false_calibration_vault_access_blocks_before_calibrator(self):
        self.check_consumer_refusal('calibration-vault.json', expected_decoded=628, forbidden_consumer='calibrate_population')

    def test_false_evaluation_vault_usage_blocks_before_replay(self):
        self.check_consumer_refusal('evaluation-vault.json', expected_decoded=628, forbidden_consumer='audit_replay')

    def test_false_secondary_access_blocks_before_calibrator(self):
        self.check_consumer_refusal('secondary-membership.json', expected_decoded=628, forbidden_consumer='calibrate_population')

    def test_false_completeness_usage_blocks_before_calibrator(self):
        self.check_consumer_refusal('completeness.json', expected_decoded=628, forbidden_consumer='calibrate_population')


if __name__ == '__main__': unittest.main(verbosity=2)
