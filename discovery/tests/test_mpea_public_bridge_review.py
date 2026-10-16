"""Independent constructed records only; no scientific archive, targets or entropy."""
from copy import deepcopy
from dataclasses import replace
from fractions import Fraction
from hashlib import sha256
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
ROOT = next(parent for parent in HERE.parents if (parent/'src/lupine_discovery/decision_pool.py').is_file())
MAIN_LOCATION = HERE == ROOT/'tests'
LANE = ROOT if MAIN_LOCATION else ROOT/'.cache/mpea-study-custody'
HELPERS = ROOT/'tests' if MAIN_LOCATION else LANE/'review_production'
TEMP_ROOT = ROOT/'.cache/mpea-public-bridge-tests' if MAIN_LOCATION else LANE/'review_public_bridge'
LEGACY_PATH = ROOT/'tests/fixtures/mpea_bridge_review/bridge-before-binding-fix.py' if MAIN_LOCATION else LANE/'review_public_bridge/bridge-before-binding-fix.py'
for path in (LANE/'scripts', HELPERS):
    sys.path.insert(0, str(path))
if MAIN_LOCATION:
    from mpea_archive_review_constructed_case import make_case
    from test_mpea_production_store_review import registration, identity
else:
    from constructed_archive_case import make_case
    from test_production_store_review import registration, identity
import mpea_archive_driver as driver
import mpea_archive_report as bridge


# Match the declared public-metadata identities of this constructed case.
# Keep them independent of a possibly corrupted result/store so corruption
# assertions still exercise bridge.project, not a fixture-side receipt read.
_CONSTRUCTED_HEADER_HEX = [part.hex() for part in make_case().routes.header]
METADATA = {name: {
    'bytes_sha256': driver.io.digest({'synthetic_metadata': name, 'header_hex': _CONSTRUCTED_HEADER_HEX}),
    'content_sha256': None, 'scientific_sha256': None,
} for name in ('mapping', 'metadata_b', 'formula_c')}


class IndependentPublicBridgeReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        TEMP_ROOT.mkdir(parents=True, exist_ok=True)
        cls.temp = tempfile.TemporaryDirectory(dir=TEMP_ROOT, prefix='constructed-')
        cls.patch = patch.object(driver.persistence, 'OUTPUT_ROOT', Path(cls.temp.name) / 'attempts')
        cls.patch.start()
        cls.case = make_case()
        cls.complete = driver.run_synthetic(cls.case, 'complete', registration(), sampling_premise='assumed_unverified')
        cls.unsupported = driver.run_synthetic(cls.case, 'unsupported', registration(), sampling_premise='unsupported')
        cls.inadequate = driver.run_synthetic(make_case(missing_development=True), 'inadequate', registration())
        cls.unknown = driver.run_synthetic(make_case(all_reserved_missing=True), 'unknown', registration(), sampling_premise='assumed_unverified')
        for result, expected in ((cls.complete, 'COMPLETE'), (cls.unsupported, 'COMPLETE'),
                                 (cls.inadequate, 'NO_GO_INSUFFICIENT_DEVELOPMENT'), (cls.unknown, 'COMPLETE')):
            if result.status != expected:
                raise AssertionError((result.status, result.reasons, expected))
        cls.projection = bridge.project(cls.complete, metadata_identities=METADATA)

    @classmethod
    def tearDownClass(cls):
        for result in (cls.complete, cls.unsupported, cls.inadequate, cls.unknown):
            result.store.close()
        cls.patch.stop()
        cls.temp.cleanup()

    def project(self, result, **kwargs):
        return bridge.project(result, metadata_identities=METADATA, **kwargs)

    def test_constructed_complete_all_960_runs_costs_and_source_scope(self):
        value = self.projection.as_dict()
        self.assertEqual(value['execution_kind'], 'synthetic_fixture')
        self.assertEqual(value['payload']['run_accounting'], dict(scheduled_runs=960, completed_runs=960,
            populations=2, assigned_panels_per_population=20, policies_per_panel=24))
        self.assertEqual(value['payload']['costs'], dict(self.complete.evaluation.costs))
        self.assertEqual(value['access']['counts']['policy_bundle_requests'], self.complete.policy_requests)
        self.assertEqual(value['payload']['kernel_evaluation_sha256'], self.complete.evaluation.evaluation_digest)
        raw = self.projection.canonical_bytes()
        self.assertNotIn(self.case.features[0].record_id.encode(), raw)
        for token in (b'UNAUTHORIZED_YS', b'UNAUTHORIZED_ELONGATION', b'"neighbors":', b'"original_row_routes":'):
            self.assertFalse(token in raw, 'private field or synthetic canary found')

    def test_inadequate_stops_publish_no_evaluation_or_superiority(self):
        value = self.project(self.inadequate).as_dict()
        self.assertEqual(value['status'], 'NO_GO_INSUFFICIENT_DEVELOPMENT')
        self.assertEqual(value['payload']['last_sealed_stage'], 'development')
        for key in ('calibration_summary', 'population_metrics', 'policy_metrics', 'gate_denominators',
                    'gate_margins', 'gate_checks', 'component_verdicts', 'overall_verdict'):
            self.assertIsNone(value['payload'][key])
        counts = value['access']['counts']
        for key in ('model_visible_bundles', 'calibrator_visible_bundles', 'policy_bundle_requests', 'auditor_unique_bundles'):
            self.assertEqual(counts[key], 0)
        self.assertEqual(counts['interpreted_bundles'], dict(DEVELOPMENT=63, CALIBRATION=0, EVALUATION=0))

    def test_complete_result_cannot_claim_fewer_completed_runs_than_its_sealed_replay(self):
        with self.assertRaises((driver.persistence.ProductionError, bridge.report.ReportError)):
            self.project(replace(self.complete, completed_policy_runs=0))

    def test_corrupted_stage_blocks_projection_and_publication(self):
        path=self.complete.store.path/'stage-03-rank-freeze.json'
        original=path.read_bytes()
        try:
            path.write_bytes(original+b' ')
            with self.assertRaises((driver.persistence.ProductionError, driver.io.StageError)):
                self.project(self.complete)
            with self.assertRaises((driver.persistence.ProductionError, driver.io.StageError)):
                bridge.write(self.complete,self.projection)
            self.assertFalse((self.complete.store.path/'public-report.json').exists())
        finally:
            path.write_bytes(original)

    def test_evaluation_and_actual_stage_chain_cannot_be_mixed(self):
        self.assertNotEqual(self.complete.evaluation.evaluation_digest, self.unsupported.evaluation.evaluation_digest)
        mixed = replace(self.unsupported, store=self.complete.store)
        with self.assertRaises((driver.persistence.ProductionError, bridge.report.ReportError)):
            self.project(mixed)

    def test_aggregate_hidden_keys_and_unsealed_claims_are_rejected(self):
        aggregates = deepcopy(dict(self.complete.aggregates))
        aggregates['DEVELOPMENT']['status_counts']['yield_strength']['UNRECOGNIZED_TARGET_STATE'] = 7
        with self.assertRaises((driver.persistence.ProductionError, bridge.report.ReportError)):
            self.project(replace(self.complete, aggregates=aggregates))

    def test_valid_projection_cannot_be_written_into_unrelated_attempt(self):
        with self.assertRaises((driver.persistence.ProductionError, bridge.report.ReportError)):
            bridge.write(self.inadequate, self.projection)
        self.assertFalse((self.inadequate.store.path / 'public-report.json').exists())

    def test_owned_publication_is_exact_and_cannot_overwrite(self):
        recorded = bridge.write(self.complete, self.projection)
        raw = (self.complete.store.path/'public-report.json').read_bytes()
        self.assertEqual(raw,self.projection.canonical_bytes())
        self.assertEqual(recorded,dict(bytes_sha256=sha256(raw).hexdigest(),
            content_sha256=self.projection.document['content_sha256'],
            scientific_sha256=self.projection.document['scientific_sha256']))
        with self.assertRaises((driver.persistence.ProductionError,driver.io.StageError)):
            bridge.write(self.complete,self.projection)
        self.assertEqual((self.complete.store.path/'public-report.json').read_bytes(),raw)

    def test_reserved_seal_separates_semantic_vault_ids_and_exact_input_identities(self):
        store=self.complete.store
        receipt=store.read_artifact('stage-04-reserved.json',store.stage_identity('reserved'))
        self.assertEqual(set(receipt['payload']['vault_identities']),{'CALIBRATION','EVALUATION'})
        for role,semantic in receipt['payload']['vault_identities'].items():
            exact=receipt['inputs'][role.lower()+'_vault']
            self.assertEqual(set(exact),{'bytes_sha256','content_sha256','scientific_sha256'})
            self.assertEqual(semantic,exact['scientific_sha256'])
            self.assertEqual(store.read_artifact(role.lower()+'-vault.json',exact)['scientific_sha256'],semantic)

    def test_all_policies_caps_and_same_cost_preserve_exact_numerators(self):
        value = self.projection.as_dict()
        for population in ('primary', 'secondary'):
            replay = getattr(self.complete.evaluation, population)
            summaries = value['payload']['policy_metrics'][population]
            self.assertEqual(set(summaries), set(driver.helpers.kernel.POLICIES))
            for policy, summary in summaries.items():
                self.assertEqual((summary['scheduled_runs'], summary['completed_runs']), (20, 20))
                self.assertEqual(tuple(s['requested_cap'] for s in summary['budget_snapshots']), driver.helpers.kernel.BUDGETS)
                checks = [(item['metrics'], tuple(p.policies[policy].snapshots[item['requested_cap']] for p in replay.panels))
                          for item in summary['budget_snapshots']]
                checks.append((summary['same_actual_pool_cost'], tuple(p.policies[policy].at_pool_cost for p in replay.panels)))
                for public, metrics in checks:
                    assigned = public['assigned_panels']
                    self.assertEqual(assigned['panel_count'], 20)
                    self.assertEqual(Fraction(assigned['actual_bundle_cost']['sum']), sum(m.actual_cost for m in metrics))
                    for name in ('any_optimum_hit', 'all_optima_retained', 'feasible_hit'):
                        known = [getattr(m, name) for m in metrics if getattr(m, name) is not None]
                        self.assertEqual(assigned[name]['success_count'], sum(known))
                        self.assertEqual(assigned[name]['known_count'], len(known))
                        self.assertEqual(assigned[name]['unavailable_count'], 20-len(known))
                        rate = assigned[name]['rate']
                        self.assertEqual(None if rate is None else Fraction(rate), None if not known else Fraction(sum(known), len(known)))

    def test_unknown_primary_and_empty_secondary_never_become_success_or_superiority(self):
        value = self.project(self.unknown).as_dict()['payload']
        self.assertFalse(value['all_40_primary_endpoints_defined'])
        self.assertEqual(value['run_accounting']['completed_runs'], 960)
        self.assertEqual(value['overall_verdict'], 'NO_GO_ARCHIVAL_USEFULNESS')
        self.assertIsNone(value['component_verdicts']['pool_usefulness'])
        self.assertIsNone(value['component_verdicts']['ranking_usefulness'])
        for name in ('pool_recall', 'pool_size', 'ranking_random', 'ranking_processing', 'ranking_objective_only'):
            self.assertIsNone(value['gate_margins'][name])
        self.assertEqual(value['calibration_summary']['primary']['status'], 'unsupported_premise')
        for population, expected in (('primary', (20, 0)), ('secondary', (0, 20))):
            counts = value['population_metrics'][population]['pool']['assigned_panels']
            self.assertEqual((counts['truth_unknown_count'], counts['empty_count']), expected)
        primary = value['policy_metrics']['primary']['primary']['budget_snapshots'][0]['metrics']['assigned_panels']
        self.assertEqual(primary['any_optimum_hit']['unavailable_count'], 20)
        self.assertIsNone(primary['any_optimum_hit']['rate'])

    def test_usage_changes_content_but_not_scientific_identity(self):
        one = self.project(self.complete, usage=bridge.report.Usage(Fraction(1), Fraction(1, 2), 4000))
        two = self.project(self.complete, usage=bridge.report.Usage(Fraction(100), Fraction(70), 9000))
        self.assertEqual(one.document['scientific_sha256'], two.document['scientific_sha256'])
        self.assertNotEqual(one.document['content_sha256'], two.document['content_sha256'])

    def test_preserved_pre_fix_bridge_demonstrates_binding_regressions(self):
        path = LEGACY_PATH
        self.assertEqual(sha256(path.read_bytes()).hexdigest(), '4cd0feb5a3ae20b45aa7a5fc9128dd8010a5cd09f1d5a1051fb6bf3148361d24')
        spec = importlib.util.spec_from_file_location('review_pre_fix_bridge', path)
        old = importlib.util.module_from_spec(spec); spec.loader.exec_module(old)
        changed = replace(self.complete, completed_policy_runs=0)
        accepted = old.project(changed, metadata_identities=METADATA)
        self.assertEqual(accepted.document['payload']['run_accounting']['completed_runs'], 960)
        mixed = old.project(replace(self.unsupported, store=self.complete.store), metadata_identities=METADATA)
        self.assertEqual(mixed.document['payload']['kernel_evaluation_sha256'], self.unsupported.evaluation.evaluation_digest)
        self.assertEqual(mixed.document['inputs']['evaluation']['bytes_sha256'], self.complete.store.stage_identity('evaluation')['bytes_sha256'])
        aggregates = deepcopy(dict(self.complete.aggregates))
        aggregates['DEVELOPMENT']['status_counts']['yield_strength']['UNRECOGNIZED_TARGET_STATE'] = 7
        self.assertEqual(old.project(replace(self.complete, aggregates=aggregates), metadata_identities=METADATA).canonical_bytes(), self.projection.canonical_bytes())
        store = driver.persistence.ProductionStageStore('pre-fix-wrong-sink', registration(),
            dict(bytes=12, md5='a'*32, sha256='b'*64), execution_kind='SYNTHETIC_FIXTURE')
        try:
            identity_ = old.write(replace(self.inadequate, store=store), self.projection)
            self.assertEqual(identity_['bytes_sha256'], sha256(self.projection.canonical_bytes()).hexdigest())
            self.assertTrue((store.path/'public-report.json').is_file())
        finally:
            store.close()


if __name__ == '__main__':
    unittest.main()
