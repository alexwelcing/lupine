"""Statistical wire custody and fail-closed isolated worker integration."""
from copy import deepcopy
from importlib.resources import files
import io
import json
import unittest
from unittest.mock import patch

from lupine_discovery import coupled_worker as worker
from lupine_discovery import decision_pool, decision_pool_io
from lupine_discovery.evidence import digest


def resource(kind, name='decision-pool-ranked-ties'):
    return files('lupine_discovery').joinpath('resources', kind, name + '.json').read_text()


def envelope(value):
    return json.dumps({'schema': worker.TRANSPORT_SCHEMA, 'ok': True, 'result': value}).encode()


def reseal(value, key='certificate_digest'):
    value[key] = digest({k: v for k, v in value.items() if k != key})
    return value


@unittest.skipUnless(worker.guard_available(), 'Linux resource guards required')
class DecisionPoolWorkerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw = resource('problems')
        cls.problem = json.loads(cls.raw)
        cls.receipt = json.loads(resource('certificates'))
        cls.truth = resource('outcomes')

    def assert_failure(self, call, expected='worker_invalid_response'):
        with self.assertRaises(worker.CoupledWorkerError) as caught:
            call()
        self.assertEqual(caught.exception.code, expected)
        self.assertEqual(set(caught.exception.payload()), {'error'})
        self.assertFalse(caught.exception.payload()['error']['decision_receipt_available'])
        self.assertTrue(worker._SLOT.acquire(blocking=False))
        worker._SLOT.release()

    def test_real_child_round_trips_full_statistical_receipt_and_negative_replay(self):
        for name in ('decision-pool-ranked-ties', 'decision-pool-missing-label', 'decision-pool-feasible-failure'):
            with self.subTest(name=name):
                raw = resource('problems', name)
                receipt = worker.run_coupled('select', raw)
                self.assertEqual(receipt, json.loads(resource('certificates', name)))
                verified = worker.run_coupled('verify', raw, raw_certificate=json.dumps(receipt))
                self.assertTrue(verified['verified'])
                report = worker.run_coupled('replay', raw, resource('outcomes', name))
                self.assertEqual(report['decision']['certificate'], receipt)
                self.assertEqual(report['decision']['selection'], receipt['selection'])
                if name != 'decision-pool-missing-label':
                    self.assertFalse(report['outcome_audit']['all_true_minimizers_retained'])
                    self.assertEqual(report['outcome_audit']['retention_test'], 'feasible_failure')

    def test_parent_never_constructs_calibration_or_selection_models(self):
        with (patch.object(decision_pool, 'PoolProtocol', side_effect=AssertionError('parent protocol')),
             patch.object(decision_pool, 'calibrate_panels', side_effect=AssertionError('parent calibration')),
             patch.object(decision_pool, 'select_pool', side_effect=AssertionError('parent decision')),
             patch.object(decision_pool, 'assess_panel', side_effect=AssertionError('parent assessment')),
             patch.object(decision_pool_io, 'decision_pool_certificate', side_effect=AssertionError('parent adapter'))):
            self.assertEqual(worker.run_coupled('select', self.raw), self.receipt)
            self.assertTrue(worker.run_coupled('verify', self.raw, raw_certificate=json.dumps(self.receipt))['verified'])
            self.assertFalse(worker.run_coupled('replay', self.raw, self.truth)['outcome_audit']['all_true_minimizers_retained'])

    def test_outcome_bytes_read_only_after_complete_original_receipt_seal(self):
        frame = worker._frame('replay', self.raw, self.truth)
        offset = frame.index(b'\n') + 1 + len(self.raw.encode())
        events = []
        class GuardedStream(io.BytesIO):
            def read(self, size=-1):
                if self.tell() >= offset and 'sealed' not in events:
                    raise AssertionError('future bytes opened before decision seal')
                return super().read(size)
        original = decision_pool_io._selection_receipt
        def sealed(parsed):
            receipt = original(parsed)
            self.assertEqual(receipt, self.receipt)
            self.assertEqual(receipt['certificate_digest'], digest({k: v for k, v in receipt.items() if k != 'certificate_digest'}))
            events.append('sealed')
            return receipt
        with patch.object(decision_pool_io, '_selection_receipt', side_effect=sealed):
            report = worker._dispatch(GuardedStream(frame))
        self.assertEqual(events, ['sealed'])
        self.assertFalse(report['outcome_audit']['all_true_minimizers_retained'])

    def test_invalid_original_does_not_read_future_bytes(self):
        bad = deepcopy(self.problem)
        bad['future_panel']['ranked_ids'] = []
        raw = json.dumps(bad)
        frame = worker._frame('replay', raw, b'private future canary')
        offset = frame.index(b'\n') + 1 + len(raw.encode())
        class GuardedStream(io.BytesIO):
            def read(self, size=-1):
                if self.tell() >= offset:
                    raise AssertionError('future bytes read after invalid problem')
                return super().read(size)
        with self.assertRaises(ValueError):
            worker._dispatch(GuardedStream(frame))

    def test_stale_select_and_replay_results_do_not_match_changed_wire(self):
        changed = deepcopy(self.problem)
        changed['description'] = 'changed original metadata only'
        with patch.object(worker, '_bounded_process', return_value=(0, envelope(self.receipt))):
            self.assert_failure(lambda: worker.run_coupled('select', json.dumps(changed)))
        replay = decision_pool_io.decision_pool_replay_report(self.problem, json.loads(self.truth))
        truth = json.loads(self.truth)
        truth['source_reference'] += ' changed'
        with patch.object(worker, '_bounded_process', return_value=(0, envelope(replay))):
            self.assert_failure(lambda: worker.run_coupled('replay', self.raw, json.dumps(truth)))

    def test_recycled_verification_success_cannot_change_original_or_supplied_seal(self):
        verified = worker.run_coupled('verify', self.raw, raw_certificate=json.dumps(self.receipt))
        changed = deepcopy(self.problem)
        changed['description'] = 'unrelated original'
        with patch.object(worker, '_bounded_process', return_value=(0, envelope(verified))):
            self.assert_failure(lambda: worker.run_coupled('verify', json.dumps(changed), raw_certificate=json.dumps(self.receipt)))
            bad = deepcopy(self.receipt)
            bad['certificate_digest'] = '0' * 64
            self.assert_failure(lambda: worker.run_coupled('verify', self.raw, raw_certificate=json.dumps(bad)))

    def test_inner_graph_and_boolean_counts_cannot_be_fixed_with_outer_reseal(self):
        variants = []
        for key, value in (('n', True), ('complete_count', True), ('calibration_digest', '0' * 64)):
            bad = deepcopy(self.receipt)
            bad['calibration'][key] = value
            variants.append(reseal(bad))
        bad = deepcopy(self.receipt)
        bad['calibration']['panels'][0]['outcomes']['source_reference'] += ' changed'
        variants.append(reseal(bad))
        bad = deepcopy(self.receipt)
        bad['selection']['decision_digest'] = '0' * 64
        variants.append(reseal(bad))
        for bad in variants:
            with patch.object(worker, '_bounded_process', return_value=(0, envelope(bad))):
                self.assert_failure(lambda: worker.run_coupled('select', self.raw))

    def test_resealed_stronger_claim_text_is_rejected_without_parent_recalibration(self):
        forged = deepcopy(self.receipt)
        forged['calibration']['reasons'].append('physically_verified_universal_accuracy')
        forged['selection']['reasons'].append('physically_verified_universal_accuracy')
        cal = forged['calibration']
        cal_values = {k: v for k, v in cal.items() if k not in {'panels', 'calibration_digest'}}
        cal['calibration_digest'] = digest({'contract': 'decision_pool.python.v1', 'kind': 'calibration',
            'protocol_digest': forged['protocol']['protocol_digest'],
            'panel_assessments': [x['assessment']['assessment_digest'] for x in cal['panels']],
            'assumptions': forged['assumptions'], 'physical_attestation': forged['physical_attestation'], **cal_values})
        selection = forged['selection']
        selected_values = {k: v for k, v in selection.items() if k not in {
            'ranked_ids', 'not_retained', 'retained_count', 'retained_fraction', 'decision_digest'}}
        selection['decision_digest'] = digest({'contract': 'decision_pool.python.v1', 'kind': 'decision',
            'calibration_digest': cal['calibration_digest'], 'panel_digest': forged['future_panel']['panel_digest'],
            'assumptions': forged['assumptions'], 'physical_attestation': forged['physical_attestation'], **selected_values})
        reseal(forged)
        with patch.object(worker, '_bounded_process', return_value=(0, envelope(forged))):
            self.assert_failure(lambda: worker.run_coupled('select', self.raw))
        replay = decision_pool_io.decision_pool_replay_report(self.problem, json.loads(self.truth))
        replay['interpretation'] = ['The model has established universal physical accuracy.']
        reseal(replay, 'replay_digest')
        with patch.object(worker, '_bounded_process', return_value=(0, envelope(replay))):
            self.assert_failure(lambda: worker.run_coupled('replay', self.raw, self.truth))

    def test_real_profile_rejects_float_duplicate_keys_and_domains(self):
        for raw in (self.raw.replace('"alpha": "1/2"', '"alpha": 0.5'),
                    self.raw[:-2] + ',"schema":"duplicate"}'):
            # A formatting-independent malformed-number fixture follows too.
            if raw != self.raw:
                self.assert_failure(lambda: worker.run_coupled('select', raw), 'invalid_input')
        bad = deepcopy(self.problem)
        bad['alpha'] = 0.5
        self.assert_failure(lambda: worker.run_coupled('select', json.dumps(bad)), 'invalid_input')
        self.assert_failure(lambda: worker.run_coupled('domains', self.raw), 'invalid_input')

    def test_shared_slot_caps_and_guard_failure_never_recycle_prior_success(self):
        worker._SLOT.acquire()
        try:
            with self.assertRaises(worker.CoupledWorkerError) as caught:
                worker.run_coupled('select', self.raw)
            self.assertEqual((caught.exception.code, caught.exception.http_status), ('worker_busy', 429))
        finally:
            worker._SLOT.release()
        with patch.object(worker, '_bounded_process') as process:
            self.assert_failure(lambda: worker.run_coupled('select', 'x' * (worker.MAX_DOCUMENT_BYTES + 1)), 'input_limit')
            process.assert_not_called()
        with patch.object(worker, 'guard_available', return_value=False):
            self.assert_failure(lambda: worker.run_coupled('select', self.raw), 'guard_unavailable')
        with patch.object(worker, '_bounded_process', return_value=(9, envelope(self.receipt))):
            self.assert_failure(lambda: worker.run_coupled('select', self.raw), 'worker_crashed')
        with patch.object(worker, '_bounded_process', side_effect=worker.CoupledWorkerError('worker_timeout', 'synthetic timeout')):
            self.assert_failure(lambda: worker.run_coupled('select', self.raw), 'worker_timeout')


if __name__ == '__main__':
    unittest.main()
