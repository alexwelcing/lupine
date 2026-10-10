from copy import deepcopy
from io import StringIO
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from lupine_discovery.cli import certificate, main, replay_report, verify_certificate
from lupine_discovery.evidence import digest
import lupine_discovery.projection_io as wire


def fixture():
    context = {'scenario_id': 'projection-wire-test', 'material_id': 'synthetic-material',
               'composition_id': 'fixed-composition', 'structure_id': 'fixed-structure', 'operating_conditions_id': 'fixed-conditions'}
    field_scope = {'context': context, 'model_id': 'synthetic-model', 'model_version': 'v1',
                   'observation_family': 'energy', 'reference_method': 'fixture-reference', 'descriptor_id': 'fixed-map'}
    source_scope = {'scenario_id': 'projection-wire-test', 'quantity': 'source', 'unit': 'u', 'reference': 'source quantity'}
    output_scope = dict(source_scope, quantity='score', reference='minimize source quantity')
    block = {'block_id': 'shared', 'scope': field_scope, 'parameter_ids': ['theta'], 'parameter_units': ['u'],
             'offset': ['1'], 'matrix': [['1']], 'latent_ids': ['z'], 'latent_bounds': [['-1', '1']],
             'parameterization_reference': 'theta=1+z is a declared common-image premise',
             'field_bound_reference': 'declared normalized enclosure', 'source_ids': ['premise'],
             'premise_status': 'assumed_unverified', 'field_bound_basis': 'declared_bound'}
    observations = [{'observation_id': name, 'block_id': 'shared', 'field_scope': field_scope,
                     'source_scope': source_scope, 'nominal': nominal, 'weights': ['1'], 'discrepancy_radius': radius,
                     'bound_reference': 'declared global discrepancy premise', 'source_ids': ['premise'],
                     'bound_basis': 'declared_bound', 'premise_status': 'assumed_unverified'}
                    for name, nominal, radius in [('A-score', '5', '1/4'), ('B-score', '4', '1/4'), ('reference', '3', '0')]]
    def use(name):
        return {'observation_id': name, 'scale': '1', 'offset': '0', 'output_scope': output_scope,
                'conversion_reference': 'whole-expression identity target', 'source_ids': ['premise']}
    value = {'schema': wire.PROBLEM_SCHEMA, 'projection': {
        'scenario_id': 'projection-wire-test', 'objective_scope': output_scope, 'constraint_scopes': {},
        'blocks': [block], 'observations': observations,
        'candidates': [{'candidate_id': 'A', 'context': context, 'score': use('A-score'), 'constraints': {}},
                       {'candidate_id': 'B', 'context': context, 'score': use('B-score'), 'constraints': {}}],
        'relation_reference': 'joint synthetic relation; no physical attestation',
        'anchors': [{'anchor_id': 'reference-range', 'observation_id': 'reference', 'source_scope': source_scope,
                     'interval': ['1', '3'], 'reference': 'independently declared uncertain reference',
                     'source_ids': ['premise'], 'premise_status': 'assumed_unverified'}],
        'sources': [{'source_id': 'premise', 'reference': 'synthetic only', 'source_uri': 'urn:synthetic', 'sha256': 'a' * 64}],
        'premise_status': 'assumed_unverified'},
        'screening': {'consistency_point': ['0', '0', '0', '0'], 'proofs': [], 'limits': dict(wire.WORK_CEILINGS)}}
    # JSON trees contain independent object records even where a constructor
    # helper reused a Python mapping to express identical metadata.
    return json.loads(json.dumps(value))


def outcomes(problem, scores=('4', '3'), point=None):
    receipt = wire.projection_certificate(problem)
    value = {'schema': wire.OUTCOMES_SCHEMA, 'scenario_id': problem['projection']['scenario_id'],
             'problem_digest': receipt['problem_digest'], 'certificate_digest': receipt['certificate_digest'],
             'outcomes': [{'id': candidate['candidate_id'], 'score': score, 'constraints': {}}
                          for candidate, score in zip(problem['projection']['candidates'], scores)]}
    if point is not None:
        value['latent_world'] = {'kind': 'hypothetical_model_world', 'point': point}
    return value


class ProjectionIOTests(unittest.TestCase):
    def test_finite_receipt_preserves_original_relation_and_actual_nested_pool(self):
        problem = fixture()
        before = deepcopy(problem)
        receipt = wire.projection_certificate(problem)
        self.assertEqual(problem, before)
        self.assertEqual(receipt['status'], 'conditional_screened')
        self.assertEqual(receipt['selection']['retained'], ['B'])
        self.assertEqual(receipt['selection'], receipt['coupled_certificate']['selection'])
        self.assertEqual(receipt['coupled_certificate']['diagnostics']['box_selection_diagnostic']['retained'], ['A', 'B'])
        self.assertEqual(receipt['coupled_certificate']['exclusion_certificates']['A']['certificate']['improvement']['upper'], '-1/2')
        self.assertEqual(receipt['projection']['relation_record']['declarations']['sources'], problem['projection']['sources'])
        self.assertEqual(receipt['certificate_digest'], digest({k: v for k, v in receipt.items() if k != 'certificate_digest'}))
        self.assertTrue(verify_certificate(problem, receipt)['verified'])
        self.assertTrue(verify_certificate(receipt['prepared_problem'], receipt['coupled_certificate'])['verified'])

    def test_metadata_only_changes_rebind_wrapper_and_derived_wire_but_not_numeric_kernel(self):
        original = fixture()
        first = wire.projection_certificate(original)
        mutations = [lambda p: p['projection']['sources'][0].update(sha256='b' * 64),
                     lambda p: p['projection']['candidates'][0]['score'].update(conversion_reference='changed conversion provenance'),
                     lambda p: p['projection']['blocks'][0].update(field_bound_reference='changed enclosure provenance'),
                     lambda p: p['projection']['anchors'][0].update(reference='changed anchor provenance')]
        for mutate in mutations:
            changed = deepcopy(original)
            mutate(changed)
            receipt = wire.projection_certificate(changed)
            self.assertNotEqual(receipt['problem_digest'], first['problem_digest'])
            self.assertNotEqual(receipt['projection']['input_digest'], first['projection']['input_digest'])
            self.assertNotEqual(receipt['projection']['relation_digest'], first['projection']['relation_digest'])
            self.assertNotEqual(receipt['coupled_certificate']['problem_digest'], first['coupled_certificate']['problem_digest'])
            self.assertEqual(receipt['coupled_certificate']['model_identity']['kernel_model_digest'],
                             first['coupled_certificate']['model_identity']['kernel_model_digest'])
            with self.assertRaises(ValueError): verify_certificate(changed, first)

    def test_wire_spelling_and_order_remain_outer_identity_while_adapter_normalizes(self):
        original = fixture()
        changed = deepcopy(original)
        changed['projection']['observations'][0]['nominal'] = 5
        changed['projection']['observations'].reverse()
        first, second = (wire.projection_certificate(p) for p in (original, changed))
        self.assertNotEqual(first['problem_digest'], second['problem_digest'])
        self.assertEqual(first['projection']['input_digest'], second['projection']['input_digest'])
        self.assertEqual(first['projection']['relation_digest'], second['projection']['relation_digest'])
        self.assertEqual(first['prepared_problem'], second['prepared_problem'])
        self.assertNotEqual(first['certificate_digest'], second['certificate_digest'])

    def test_unsupported_path_constructs_no_numerical_standin(self):
        problem = fixture()
        problem['projection']['observations'][0]['discrepancy_radius'] = None
        with patch.object(wire, '_prepare_coupled', side_effect=AssertionError('no model may be exported')), \
                patch.object(wire, 'coupled_certificate', side_effect=AssertionError('kernel route must not run')):
            receipt = wire.projection_certificate(problem)
        self.assertEqual(receipt['status'], 'unsupported_all_retained')
        self.assertEqual(receipt['projection']['build_status'], 'unsupported_all_retained')
        self.assertIsNone(receipt['prepared_problem'])
        self.assertIsNone(receipt['coupled_certificate'])
        self.assertEqual(receipt['selection']['retained'], ['A', 'B'])
        self.assertEqual(receipt['execution']['kernel_operations_used'], 0)
        for key in ('certified_feasible', 'interval_infeasible', 'interval_dominated', 'coupled_infeasible', 'coupled_dominated'):
            self.assertEqual(receipt['selection'][key], [])
        self.assertTrue(receipt['projection']['reasons'])

    def test_explicit_missing_and_empirical_basis_never_become_hard_bounds(self):
        for location in ('blocks', 'observations'):
            for basis in ('missing', 'empirical_residual'):
                problem = fixture()
                key = 'field_bound_basis' if location == 'blocks' else 'bound_basis'
                problem['projection'][location][0][key] = basis
                receipt = wire.projection_certificate(problem)
                self.assertIsNone(receipt['prepared_problem'])
                self.assertEqual(receipt['selection']['retained'], ['A', 'B'])
        for location in ('blocks', 'observations', 'anchors'):
            problem = fixture()
            problem['projection'][location][0]['premise_status'] = 'unsupported'
            self.assertIsNone(wire.projection_certificate(problem)['prepared_problem'])

    def test_nonempty_proofs_rejected_before_conversion_even_when_adapter_would_abstain(self):
        for proofs in ([{}], {}, None, '[]'):
            problem = fixture()
            problem['projection']['premise_status'] = 'unsupported'
            problem['screening']['proofs'] = proofs
            with patch.object(wire._Numbers, 'convert', side_effect=AssertionError('conversion must not start')), \
                    patch.object(wire, 'build_projection', side_effect=AssertionError('build must not start')):
                with self.assertRaises(ValueError): wire.projection_certificate(problem)

    def test_expansion_guards_count_unused_zero_radius_and_unsupported_records_before_arithmetic(self):
        problem = fixture()
        block = problem['projection']['blocks'][0]
        block.update(latent_ids=[f'z{i}' for i in range(14)], matrix=[['0'] * 14], latent_bounds=[None] * 14,
                     field_bound_basis='missing')
        for row in problem['projection']['observations']: row['discrepancy_radius'] = '0'
        problem['screening']['consistency_point'] = None
        with patch.object(wire._Numbers, 'convert', side_effect=AssertionError('conversion must not start')), \
                patch.object(wire, 'FieldBlock', side_effect=AssertionError('records must not be constructed')), \
                patch.object(wire, 'build_projection', side_effect=AssertionError('expansion must not start')):
            with self.assertRaisesRegex(ValueError, 'expanded.*dimension'): wire.projection_certificate(problem)
        too_many_anchors = fixture()
        too_many_anchors['projection']['anchors'] = [dict(deepcopy(too_many_anchors['projection']['anchors'][0]), anchor_id=str(i)) for i in range(33)]
        with patch.object(wire._Numbers, 'convert', side_effect=AssertionError('conversion must not start')):
            with self.assertRaises(ValueError): wire.projection_certificate(too_many_anchors)

    def test_large_exact_derived_coefficient_is_rejected_not_rounded_or_abstained(self):
        problem = fixture()
        large = str(2**400)
        problem['projection']['blocks'][0]['matrix'] = [[large]]
        problem['projection']['observations'][0]['weights'] = [large]
        with patch('lupine_discovery.coupled_io.screen_coupled', side_effect=AssertionError('oversized derived model must not screen')):
            with self.assertRaisesRegex(ValueError, '512 bits'): wire.projection_certificate(problem)

    def test_preparation_must_preserve_the_generated_numerical_model_identity(self):
        original = wire._prepare_coupled
        def changed(parsed, build):
            value = original(parsed, build)
            value['candidates'][0]['score']['constant'] = '-100'
            return value
        with patch.object(wire, '_prepare_coupled', side_effect=changed):
            with self.assertRaisesRegex(ValueError, 'differs from the generated projection model'):
                wire.projection_certificate(fixture())

    def test_strict_fields_scopes_links_dimensions_and_scalar_profile(self):
        mutations = [lambda p: p.update(prepared_problem={}), lambda p: p['projection'].update(outcomes=[]),
                     lambda p: p['projection']['blocks'][0].pop('field_bound_basis'),
                     lambda p: p['projection']['candidates'][0]['context'].update(structure_id='other-structure'),
                     lambda p: p['projection']['observations'][0]['field_scope'].update(model_version='other-version'),
                     lambda p: p['projection']['anchors'][0]['source_scope'].update(unit='other-unit'),
                     lambda p: p['projection']['sources'].clear(),
                     lambda p: p['projection']['blocks'][0].update(matrix=[[]]),
                     lambda p: p['projection']['observations'].append(deepcopy(p['projection']['observations'][0])),
                     lambda p: p['projection']['blocks'][0].update(block_id='x' * 41),
                     lambda p: p['screening']['limits'].update(max_operations=100001)]
        for mutate in mutations:
            problem = fixture()
            mutate(problem)
            with self.assertRaises(ValueError): wire.projection_certificate(problem)
        for invalid in (True, 0.1, '1e3', ' 1', '1/0', '7' * 513, 2**53):
            problem = fixture()
            problem['projection']['observations'][0]['nominal'] = invalid
            with self.assertRaises(ValueError): wire.projection_certificate(problem)
        for raw in ('{"x":1,"x":2}', '{"x":1.0}', '{"x":NaN}', '[' * 25 + ']' * 25):
            with self.assertRaises(ValueError): wire.loads_projection(raw)

    def test_false_common_world_exposes_actual_lost_optimum_despite_marginal_coverage(self):
        problem = fixture()
        truth = outcomes(problem, ('4', '21/5'), ['0', '0', '0', '0'])
        report = wire.projection_replay_report(problem, truth)
        self.assertEqual(report['decision']['selection']['retained'], ['B'])
        self.assertFalse(report['outcome_audit']['all_true_minimizers_retained'])
        self.assertEqual(report['outcome_audit']['lost_optimum_ids'], ['A'])
        self.assertEqual(report['diagnostics']['marginal_coverage']['score_coverage']['rate'], '1')
        self.assertEqual(report['provided_world_audit']['status'], 'provided_point_mismatch')
        self.assertEqual(report['outcomes_digest'], digest(truth))
        self.assertEqual(report['replay_digest'], digest({k: v for k, v in report.items() if k != 'replay_digest'}))

    def test_exact_tied_minima_and_provided_world_are_retained_after_projection(self):
        problem = fixture()
        for row in problem['projection']['observations'][:2]: row['discrepancy_radius'] = '1/2'
        truth = outcomes(problem, ('9/2', '9/2'), ['-1', '-1', '1', '0'])
        report = wire.projection_replay_report(problem, truth)
        self.assertEqual(report['outcome_audit']['true_minimizer_ids'], ['A', 'B'])
        self.assertTrue(report['outcome_audit']['all_true_minimizers_retained'])
        self.assertEqual(report['provided_world_audit']['status'], 'provided_point_matches_reported_values')
        self.assertEqual(report['provided_world_audit']['scientific_validity'], 'unestablished')

    def test_no_model_replay_audits_only_original_truth_and_reports_unavailable_diagnostics(self):
        problem = fixture()
        problem['projection']['blocks'][0]['latent_bounds'] = [None]
        truth = outcomes(problem, ('1', '1'), ['0', '0', '0', '0'])
        with patch.object(wire, '_prepare_coupled', side_effect=AssertionError('no finite standin')), \
                patch.object(wire, 'coupled_replay_report', side_effect=AssertionError('no nested replay')):
            report = wire.projection_replay_report(problem, truth)
        self.assertEqual(report['outcome_audit']['true_minimizer_ids'], ['A', 'B'])
        self.assertTrue(report['outcome_audit']['all_true_minimizers_retained'])
        world = report['provided_world_audit']
        self.assertEqual(world['status'], 'unavailable_no_prepared_model')
        self.assertTrue(world['point_supplied'])
        self.assertEqual(world['checked_quantity_count'], 0)
        self.assertEqual(world['mismatches'], [])
        self.assertIsNone(report['diagnostics']['box_selection_diagnostic'])
        self.assertIsNone(report['diagnostics']['marginal_coverage']['score_coverage'])
        self.assertIsNone(report['decision']['certificate']['prepared_problem'])
        for partial in ([], [truth['outcomes'][0]], [dict(truth['outcomes'][0], score=None)]):
            current = deepcopy(truth)
            current['outcomes'] = partial
            audit = wire.projection_replay_report(problem, current)['outcome_audit']
            self.assertIsNone(audit['true_minimizer_ids'])
            self.assertIsNone(audit['all_true_minimizers_retained'])

    def test_no_model_unknown_constraints_empty_and_infeasible_universes(self):
        problem = fixture()
        problem['projection']['premise_status'] = 'unsupported'
        scope = dict(problem['projection']['objective_scope'], quantity='g')
        problem['projection']['constraint_scopes'] = {'g': scope}
        for row in problem['projection']['candidates']:
            row['constraints'] = {'g': dict(deepcopy(row['score']), output_scope=deepcopy(scope))}
        truth = outcomes(problem)
        truth['outcomes'][0]['constraints'] = {'g': '1'}
        audit = wire.projection_replay_report(problem, truth)['outcome_audit']
        self.assertIs(audit['per_candidate']['A']['true_feasible'], False)
        self.assertIsNone(audit['per_candidate']['B']['true_feasible'])
        self.assertIsNone(audit['all_true_minimizers_retained'])
        truth['outcomes'][1]['constraints'] = {'g': '1'}
        audit = wire.projection_replay_report(problem, truth)['outcome_audit']
        self.assertEqual(audit['retention_status'], 'undefined_no_feasible_candidate')
        problem['projection']['candidates'] = []
        audit = wire.projection_replay_report(problem, outcomes(problem))['outcome_audit']
        self.assertEqual(audit['retention_status'], 'not_evaluated_empty_universe')
        self.assertIsNone(audit['all_true_minimizers_retained'])

    def test_unsupported_outcome_world_still_requires_exact_syntax_and_expanded_dimension(self):
        problem = fixture()
        problem['projection']['observations'][0]['discrepancy_radius'] = None
        truth = outcomes(problem, point=['0', '0', '0', '0'])
        for point in ([], ['0'], ['0', '0', '0', 0.1], ['0', '0', '0', '1e2']):
            current = deepcopy(truth)
            current['latent_world']['point'] = point
            with self.assertRaises(ValueError): wire.projection_replay_report(problem, current)

    def test_outer_seals_checked_before_any_inner_outcome_rebinding(self):
        problem = fixture()
        receipt = wire.projection_certificate(problem)
        truth = outcomes(problem)
        truth['problem_digest'] = receipt['coupled_certificate']['problem_digest']
        truth['certificate_digest'] = receipt['coupled_certificate']['certificate_digest']
        with patch.object(wire, 'coupled_replay_report', side_effect=AssertionError('outer seal must be checked first')):
            with self.assertRaisesRegex(ValueError, 'original projection decision'):
                wire.projection_replay_report(problem, truth)
        changed = deepcopy(problem)
        changed['projection']['sources'][0]['reference'] = 'new source declaration'
        with self.assertRaises(ValueError): wire.projection_replay_report(changed, outcomes(problem))

    def test_deferred_loader_and_cli_truth_open_follow_complete_outer_seal(self):
        problem = fixture()
        truth = outcomes(problem)
        events = []
        original = wire._selection_receipt
        def seal(parsed):
            receipt = original(parsed)
            events.append('outer_sealed')
            return receipt
        def load():
            self.assertEqual(events, ['outer_sealed'])
            events.append('outcomes_loaded')
            return truth
        with patch.object(wire, '_selection_receipt', side_effect=seal):
            report = wire.projection_replay_report(problem, load)
        self.assertEqual(events, ['outer_sealed', 'outcomes_loaded'])
        self.assertEqual(report['decision']['selection']['retained'], ['B'])
        with tempfile.TemporaryDirectory() as temporary:
            source, truth_path = Path(temporary) / 'problem.json', Path(temporary) / 'truth.json'
            source.write_text(json.dumps(problem))
            truth_path.write_text(json.dumps(truth))
            original_open = Path.open
            events.clear()
            def opened(path, *args, **kwargs):
                if path == truth_path:
                    self.assertEqual(events, ['outer_sealed'])
                    events.append('outcomes_opened')
                return original_open(path, *args, **kwargs)
            with patch.object(wire, '_selection_receipt', side_effect=seal), patch.object(Path, 'open', opened), \
                    patch('sys.stdout', new_callable=StringIO):
                self.assertEqual(main(['replay', str(source), str(truth_path)]), 0)
            self.assertEqual(events, ['outer_sealed', 'outcomes_opened'])

    def test_outcome_point_never_repairs_a_missing_selection_point(self):
        problem = fixture()
        problem['screening']['consistency_point'] = None
        report = wire.projection_replay_report(problem, outcomes(problem, point=['0', '0', '0', '0']))
        self.assertEqual(report['decision']['certificate']['status'], 'consistency_unresolved_all_retained')
        self.assertEqual(report['decision']['selection']['retained'], ['A', 'B'])
        self.assertEqual(report['provided_world_audit']['status'], 'provided_point_matches_reported_values')
        self.assertIsNone(report['decision']['certificate']['coupled_certificate']['coupling']['supplied_consistency_point'])

    def test_tampered_versions_prepared_models_and_type_equal_counts_fail_verification(self):
        problem = fixture()
        receipt = certificate(problem)
        for key in ('engine_version', 'adapter_version', 'profile_id'):
            changed = deepcopy(receipt)
            changed[key] = 'different'
            changed['certificate_digest'] = digest({k: v for k, v in changed.items() if k != 'certificate_digest'})
            with self.assertRaises(ValueError): verify_certificate(problem, changed)
        changed = deepcopy(receipt)
        changed['prepared_problem']['candidates'][0]['score']['constant'] = '-100'
        changed['certificate_digest'] = digest({k: v for k, v in changed.items() if k != 'certificate_digest'})
        with self.assertRaises(ValueError): verify_certificate(problem, changed)
        problem['projection']['premise_status'] = 'unsupported'
        receipt = certificate(problem)
        receipt['execution']['kernel_operations_used'] = False
        # Keep original digest: Python considers False equal to 0, exact JSON does not.
        with self.assertRaises(ValueError): verify_certificate(problem, receipt)

    def test_cli_select_verify_replay_preserves_original_wrapper(self):
        problem = fixture()
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            source, truth_path, cert_path = (base / name for name in ('problem.json', 'truth.json', 'receipt.json'))
            source.write_text(json.dumps(problem))
            truth_path.write_text(json.dumps(outcomes(problem)))
            for arguments, schema in ((['select', str(source), '--output', str(cert_path)], None),
                                      (['verify', str(source), str(cert_path)], 'lupine.discovery.verification.v1'),
                                      (['replay', str(source), str(truth_path)], 'lupine.discovery.projection_replay.v1')):
                result = subprocess.run([sys.executable, '-m', 'lupine_discovery', *arguments], capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                if schema: self.assertEqual(json.loads(result.stdout)['schema'], schema)
            self.assertEqual(json.loads(cert_path.read_text()), wire.projection_certificate(problem))
            self.assertEqual(json.loads(source.read_text()), problem)
        self.assertEqual(replay_report(problem, outcomes(problem))['decision']['selection'], certificate(problem)['selection'])

    def test_cli_output_cap_rejects_before_writing_an_unverifiable_receipt(self):
        with tempfile.TemporaryDirectory() as temporary:
            source, target = Path(temporary) / 'problem.json', Path(temporary) / 'receipt.json'
            source.write_text(json.dumps(fixture()))
            with patch('lupine_discovery.cli.certificate', return_value={'oversized': 'x' * (2 * 1024 * 1024)}), \
                    patch('sys.stderr', new_callable=StringIO) as errors:
                self.assertEqual(main(['select', str(source), '--output', str(target)]), 2)
            self.assertIn('output exceeds 2 MiB', errors.getvalue())
            self.assertFalse(target.exists())


if __name__ == '__main__':
    unittest.main()
