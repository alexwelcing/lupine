"""Actual-shaped constructed data only, no source cache, entropy or network."""
from dataclasses import replace
from hashlib import sha256
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parent))
from mpea_constructed_fixture import driver as d, make_case

ROOT = d.storemod.WORKSPACE


class DriverTests(unittest.TestCase):
    def setUp(self):
        ROOT.mkdir(parents=True,exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=ROOT, prefix='driver-test-')
        self.addCleanup(self.temp.cleanup)
        self.attempts = Path(self.temp.name) / 'attempts'
        self.patch = patch.object(d.storemod, 'ATTEMPTS', self.attempts)
        self.patch.start(); self.addCleanup(self.patch.stop)

    def test_actual_shape_complete_order_boundaries_no_nested_fit_explosion(self):
        case = make_case()
        markers, parse_stages, vault_stages = [], [], []
        parse = d.custody.parse_fixture_targets
        fit_development = d.kernel.fit_development
        def fit(rows):
            self.assertTrue((self.attempts/'complete'/'02-development.json').is_file())
            return fit_development(rows)
        open_vault = d.FixtureCustodian._open
        def parser(raw, routes, roles):
            stage_files = sorted((self.attempts / 'complete').glob('[0-9][0-9]-*.json'))
            parse_stages.append((roles, stage_files[-1].name))
            return parse(raw, routes, roles)
        def vault(instance, role, stage):
            vault_stages.append((role, stage))
            return open_vault(instance, role, stage)
        with patch.object(d.custody, 'parse_fixture_targets', side_effect=parser), patch.object(d.FixtureCustodian, '_open', vault), patch.object(d.kernel, 'fit_development', side_effect=fit):
            result = d.run_fixture(case, 'complete', sampling_premise='assumed_unverified', checkpoint=markers.append)
        self.addCleanup(result.store.close)
        self.assertEqual(result.status, 'COMPLETE')
        self.assertEqual(result.store.stages, d.storemod.STAGES)
        self.assertEqual(len(result.ranks), 75)
        self.assertEqual(len(result.plans), 2)
        self.assertEqual(sum(len(p.schedules) for p in result.plans), 960)
        self.assertEqual(parse_stages, [(frozenset({'DEVELOPMENT'}), '01-input_freeze.json'),
            (frozenset({'CALIBRATION','EVALUATION'}), '03-rank_freeze.json')])
        self.assertEqual(vault_stages, [('CALIBRATION','reserved'), ('EVALUATION','calibration'), ('EVALUATION','replay')])
        self.assertEqual(markers[2], {'event':'TARGET_PHASE_BEGIN'})
        self.assertEqual([m['stage'] for m in markers if m['event']=='STAGE_SEALED'], list(d.storemod.STAGES))
        self.assertEqual(result.aggregates['DEVELOPMENT']['row_count'], 63)
        self.assertEqual(sum(result.aggregates[r]['row_count'] for r in d.ROLES), 314)
        self.assertTrue(result.completeness.all_defined)
        sizes = {p.name: p.stat().st_size for p in result.store.path.iterdir()}
        self.assertLess(max(sizes.values()), 8*1024*1024)
        self.assertLess(sum(sizes.values()), 12*1024*1024)
        rank = json.loads((result.store.path/'03-rank_freeze.json').read_bytes())
        self.assertNotIn('development', rank['payload']['ranks'][0])
        self.assertEqual(len(rank['payload']['ranks'][0]['fit_digest']), 64)
        self.assertNotIn('fit', rank['payload']['ranks'][0]['predictions'][0])
        result.store.verify()

    def test_inadequate_development_is_durable_terminal_no_reserved_interpretation(self):
        case = make_case(missing_development=True)
        roles = []
        parse = d.custody.parse_fixture_targets
        def parser(raw, routes, allowed):
            roles.append(allowed)
            return parse(raw, routes, allowed)
        with patch.object(d.custody, 'parse_fixture_targets', side_effect=parser):
            result = d.run_fixture(case, 'inadequate')
        self.addCleanup(result.store.close)
        self.assertEqual(result.status, 'NO_GO_INSUFFICIENT_DEVELOPMENT')
        self.assertEqual(result.store.stages, ('allocation','input_freeze','development'))
        self.assertEqual(roles, [frozenset({'DEVELOPMENT'})])
        self.assertIsNone(result.aggregates['CALIBRATION'])
        self.assertIsNone(result.evaluation)
        self.assertIsNone(result.fit)
        self.assertFalse((result.store.path/'evaluation-vault.json').exists())
        self.assertEqual(json.loads((result.store.path/'02-development.json').read_bytes())['status'], result.status)

    def test_case_rejects_removed_rows_roles_and_wrong_feature_identity(self):
        case = make_case()
        with self.assertRaises(d.storemod.StageError):
            replace(case, features=case.features[:-1])
        with self.assertRaises(d.storemod.StageError):
            replace(case, features=(replace(case.features[0], source_group='999'),) + case.features[1:])
        with self.assertRaises(d.custody.CustodyError):
            replace(case, raw=case.raw[:-1])
        with self.assertRaises(d.storemod.StageError):
            d.run_fixture({}, 'bad')

    def test_stage_custodian_denies_early_or_repeat_access(self):
        case = make_case()
        store = d.storemod.FixtureStageStore('gates', case.routes.source, d.implementation_identity())
        self.addCleanup(store.close)
        custodian = d.FixtureCustodian(case, store)
        for call in (custodian.development, custodian.calibration,
                     lambda: custodian.evaluator(()), lambda: custodian.reserved((), 'a'*64)):
            with self.assertRaises(d.storemod.StageError): call()
        store.commit('allocation', d._allocation_payload(case,store._source))
        store.commit('input_freeze', d._input_payload(case))
        self.assertEqual(len(custodian.development()), 63)
        with self.assertRaises(d.storemod.StageError): custodian.development()
        with self.assertRaises(d.storemod.StageError): custodian.calibration()

    def test_numerical_class_origin_boundary_reconstructs_using_kernel_class(self):
        import mpea_feature_reader as reader
        name = 'lupine_discovery.representation'
        original = sys.modules[name]
        try:
            # This is the frozen reader's exact source-module reload operation,
            # without load_context metadata or a private feature/source read.
            replaced = reader._module(reader.CODE_ROOT / 'src/lupine_discovery/representation.py',
                reader.KERNEL_PINS['src/lupine_discovery/representation.py'], name)
            self.assertIsNot(replaced.NormalizedVector, d.kernel.NormalizedVector)
            case = make_case()
            self.assertIs(type(case.features[0].composition), d.kernel.NormalizedVector)
            self.assertIsNot(type(case.features[0].composition), replaced.NormalizedVector)
            d.implementation_identity()
        finally:
            sys.modules[name] = original

    def test_closed_rational_vault_reader_and_source_change_before_seal(self):
        for value in (True, 1, '1', '01/1','1/0','1/00','-1/1','1/01','2/2','1.0/1','1/'+'9'*156):
            with self.assertRaises(d.storemod.StageError): d._rational(value)
        self.assertEqual(d._rational('0/1'), 0)
        case = make_case()
        identity = d.implementation_identity()
        altered = dict(identity); altered['mpea_fixture_driver']='e'*64
        with patch.object(d, 'implementation_identity', side_effect=[identity,altered,altered]):
            with self.assertRaises(d.storemod.StageError) as caught:
                d.run_fixture(case, 'changed')
        self.assertEqual(caught.exception.code, 'IMPLEMENTATION_MISMATCH')
        self.assertFalse((self.attempts/'changed'/'00-allocation.json').exists())

    def test_reserved_unknowns_preserve_primary_and_empty_secondary_panels(self):
        result = d.run_fixture(make_case(missing_reserved=True), 'unknown', sampling_premise='assumed_unverified')
        self.addCleanup(result.store.close)
        self.assertFalse(result.completeness.all_defined)
        primary, secondary = result.plans
        self.assertEqual(primary.protocol.premise_status, 'unsupported')
        self.assertTrue(all(len(decision.retained) == len(decision.original_ids) for decision in primary.decisions))
        self.assertTrue(all(not panel.candidate_ids for panel in secondary.ranked_future))
        self.assertEqual(len(secondary.ranked_future), 20)
        self.assertIsNone(result.evaluation.component_verdicts['pool_usefulness'])
        self.assertEqual(result.aggregates['EVALUATION']['status_counts']['elongation']['UNSUPPORTED_LEXICAL'],
                         result.aggregates['EVALUATION']['row_count'])

    def test_per_policy_tokens_and_audit_block_before_all_runs(self):
        checked = set()
        original_policy = d.FixtureEvaluator.policy
        original_request = d.PolicyOracle.request
        original_finish = d.PolicyOracle.finish
        evaluator_holder, oracles = [], []
        def policy(instance, plan, panel, name):
            evaluator_holder[:] = [instance]
            oracle = original_policy(instance, plan, panel, name)
            oracles.append(oracle)
            return oracle
        def request(instance, record):
            token = original_request(instance, record)
            if 'tokens' not in checked:
                checked.add('tokens')
                with self.assertRaises(d.storemod.StageError): original_request(instance, record)
                with self.assertRaises(d.storemod.StageError): instance.reveal(replace(token, ordinal=True))
                with self.assertRaises(d.storemod.StageError): instance.reveal(replace(token))
                with self.assertRaises(d.storemod.StageError):
                    evaluator_holder[0]._custodian.audit_truth(evaluator_holder[0])
                with self.assertRaises(d.storemod.StageError): evaluator_holder[0]._custodian.evaluator(())
            if len(oracles) > 1 and 'foreign' not in checked:
                checked.add('foreign')
                with self.assertRaises(d.storemod.StageError): oracles[0].reveal(token)
                self.assertEqual(instance.history(), ())
            return token
        def finish(instance):
            run = original_finish(instance)
            if 'finish' not in checked:
                checked.add('finish')
                with self.assertRaises(d.storemod.StageError): original_finish(instance)
                with self.assertRaises(d.storemod.StageError): original_request(instance, 'invented')
            return run
        with patch.object(d.FixtureEvaluator,'policy',policy), patch.object(d.PolicyOracle,'request',request), patch.object(d.PolicyOracle,'finish',finish):
            result = d.run_fixture(make_case(), 'tokens')
        self.addCleanup(result.store.close)
        self.assertEqual(checked, {'tokens','finish','foreign'})

    def test_unexpected_failures_are_sanitized_and_seal_no_later_success(self):
        with patch.object(d.kernel, 'rank_panel', side_effect=RuntimeError('SECRET_TARGET_123456')):
            with self.assertRaises(d.storemod.StageError) as caught:
                d.run_fixture(make_case(), 'failure')
        self.assertEqual(str(caught.exception), 'INTERNAL_FAILURE')
        receipt = (self.attempts/'failure'/'03-rank_freeze.json').read_bytes()
        self.assertNotIn(b'SECRET', receipt)
        self.assertEqual(json.loads(receipt)['status'], 'BLOCKED')
        self.assertFalse((self.attempts/'failure'/'evaluation-vault.json').exists())

    def test_fresh_processes_have_equal_scientific_stage_identities(self):
        import subprocess
        child = ("import json,sys; from pathlib import Path; "
                 "sys.path.insert(0,sys.argv[1]); "
                 "from mpea_constructed_fixture import driver as d,make_case; "
                 "d.storemod.ATTEMPTS=Path(sys.argv[2]); "
                 "r=d.run_fixture(make_case(),sys.argv[3]); "
                 "print(json.dumps(r.store.scientific_digests())); r.store.close()")
        outputs = []
        for attempt in ('first-process','second-process'):
            completed = subprocess.run([sys.executable,'-c',child,str(Path(__file__).resolve().parent),
                str(self.attempts),attempt],stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=60)
            self.assertEqual(completed.returncode,0,completed.stderr.decode())
            outputs.append(json.loads(completed.stdout))
        self.assertEqual(outputs[0],outputs[1])
        self.assertEqual(len(outputs[0]),8)


if __name__ == '__main__': unittest.main()
