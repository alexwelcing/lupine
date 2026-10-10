from copy import deepcopy
from io import StringIO
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from unittest.mock import patch
import unittest

import lupine_discovery.coupled_io as wire
from lupine_discovery.cli import certificate, main, replay_report, verify_certificate
from lupine_discovery.evidence import digest


def affine(coefficients=(1,), constant=0):
    return {'coefficients': [str(v) for v in coefficients], 'constant': str(constant)}


def fixture():
    return {
        'schema': wire.PROBLEM_SCHEMA,
        'scenario': {'id': 'coupled-wire-fixture',
                     'objective': {'direction': 'minimize', 'unit': 'utility', 'reference': 'synthetic'},
                     'constraints': {}},
        'latent_variables': [{'id': 't', 'bounds': ['0', '2'], 'unit': '1', 'reference': 'normalized fixture'}],
        'candidates': [{'id': 'A', 'score': affine(constant=1), 'constraints': {}},
                       {'id': 'B', 'score': affine(), 'constraints': {}}],
        'rows': [],
        'common_world': {'claim': 'one_common_latent_vector_represents_all_quantities',
                         'premise_status': 'assumed_unverified', 'relation_basis': 'declared_affine_assumption',
                         'reference': 'constructed mathematical relation'},
        'screening': {'consistency_point': ['0'], 'proofs': [], 'limits': dict(wire.WORK_CEILINGS)},
    }


def outcomes(problem, scores=('1', '0'), point=None):
    receipt = wire.coupled_certificate(problem)
    result = {'schema': wire.OUTCOMES_SCHEMA, 'scenario_id': problem['scenario']['id'],
              'problem_digest': receipt['problem_digest'], 'certificate_digest': receipt['certificate_digest'],
              'outcomes': [{'id': row['id'], 'score': score, 'constraints': {}}
                           for row, score in zip(problem['candidates'], scores)]}
    if point is not None:
        result['latent_world'] = {'kind': 'hypothetical_model_world', 'point': point}
    return result


def dominance_proof(problem, proof_id='proof-A'):
    manifest = wire.coupled_domains(problem)
    return {'id': proof_id, 'kind': 'dominance', 'instance_digest': manifest['instance_digest'],
            'candidate_id': 'A', 'witness_id': 'B', 'feasibility': {},
            'improvement': {'domain_id': manifest['candidate_domains']['A']['domain_id'],
                            'expression': affine((0,), -1), 'upper': '-1', 'multipliers': {}}}


class CoupledWireTests(unittest.TestCase):
    def test_exact_wire_identity_receipt_and_unmodified_input(self):
        problem = fixture()
        original = deepcopy(problem)
        receipt = wire.coupled_certificate(problem)
        self.assertEqual(problem, original)
        self.assertEqual(receipt['selection']['retained'], ['B'])
        self.assertEqual(receipt['diagnostics']['box_selection_diagnostic']['retained'], ['A', 'B'])
        self.assertEqual(receipt['exclusion_certificates']['A']['certificate']['improvement']['upper'], '-1')
        self.assertEqual(receipt['certificate_digest'], digest({k: v for k, v in receipt.items() if k != 'certificate_digest'}))
        self.assertEqual(receipt, wire.coupled_certificate(wire.loads_coupled(json.dumps(problem))))
        self.assertEqual(receipt['common_world']['scientific_validity'], 'unestablished')
        for key in ('incumbent', 'threshold', 'regret_bound'):
            self.assertNotIn(key, receipt['selection'])

    def test_four_distinct_identities_and_non_circular_domain_discovery(self):
        problem = fixture()
        manifest = wire.coupled_domains(problem)
        problem['screening']['proofs'] = [dominance_proof(problem)]
        with_proof = wire.coupled_domains(problem)
        self.assertNotEqual(manifest['problem_digest'], with_proof['problem_digest'])
        for key in ('instance_digest', 'kernel_model_digest', 'common_domain', 'candidate_domains'):
            self.assertEqual(manifest[key], with_proof[key])
        problem['latent_variables'][0]['reference'] = 'different normalization annotation'
        changed = wire.coupled_domains(problem)
        self.assertNotEqual(changed['instance_digest'], manifest['instance_digest'])
        self.assertEqual(changed['kernel_model_digest'], manifest['kernel_model_digest'])
        receipt = wire.coupled_certificate(problem)
        self.assertEqual(receipt['proof_assessments'][0]['check']['reason'], 'instance_identity_mismatch')
        self.assertIsNone(receipt['proof_assessments'][0]['certificate_digest'])

    def test_supplied_duplicate_normalized_proofs_keep_distinct_audit_ids(self):
        problem = fixture()
        proof = dominance_proof(problem)
        second = deepcopy(proof)
        second['id'] = 'second-occurrence'
        problem['screening']['proofs'] = [proof, second]
        problem['screening']['limits']['max_witness_pairs'] = 0
        receipt = wire.coupled_certificate(problem)
        assessments = [r for r in receipt['proof_assessments'] if r['source'] == 'supplied']
        self.assertEqual([r['supplied_id'] for r in assessments], ['proof-A', 'second-occurrence'])
        self.assertEqual([r['input_index'] for r in assessments], [0, 1])
        self.assertEqual([r['check']['status'] for r in assessments], ['verified', 'verified'])
        self.assertEqual(assessments[0]['certificate_digest'], assessments[1]['certificate_digest'])
        self.assertNotEqual(assessments[0]['wire_proof_digest'], assessments[1]['wire_proof_digest'])
        self.assertEqual(receipt['selection']['retained'], ['B'])
        reverse = deepcopy(problem)
        reverse['screening']['proofs'].reverse()
        self.assertNotEqual(wire.coupled_certificate(reverse)['problem_digest'], receipt['problem_digest'])

    def test_stale_envelope_never_reaches_kernel_or_borrows_automatic_success(self):
        problem = fixture()
        proof = dominance_proof(problem)
        proof['instance_digest'] = '0' * 64
        problem['screening']['proofs'] = [proof]
        with patch.object(wire, 'DominanceCertificate', side_effect=AssertionError('envelope must prevent construction')):
            receipt = wire.coupled_certificate(problem)
        self.assertEqual(receipt['selection']['retained'], ['B'])
        self.assertEqual(receipt['proof_assessments'][0]['check']['status'], 'rejected')
        self.assertEqual(receipt['proof_assessments'][0]['check']['reason'], 'instance_identity_mismatch')
        self.assertTrue(any(r['source'] == 'automatic' and r['check']['status'] == 'verified'
                            for r in receipt['proof_assessments']))

    def test_closed_gates_preserve_universe_and_mark_supplied_proofs_not_checked(self):
        for gate in ('missing', 'invalid', 'unsupported', 'learned', 'limited'):
            problem = fixture()
            problem['candidates'][0]['score']['constant'] = '3'
            if gate == 'missing': problem['screening']['consistency_point'] = None
            if gate == 'invalid': problem['screening']['consistency_point'] = ['3']
            if gate == 'unsupported': problem['common_world']['premise_status'] = 'unsupported'
            if gate == 'learned': problem['common_world']['relation_basis'] = 'learned_correlation'
            if gate == 'limited': problem['screening']['limits']['max_operations'] = 0
            proof = dominance_proof(problem)
            proof['improvement']['expression']['constant'] = '-3'
            proof['improvement']['upper'] = '-3'
            problem['screening']['proofs'] = [proof]
            receipt = wire.coupled_certificate(problem)
            self.assertEqual(receipt['selection']['retained'], ['A', 'B'])
            self.assertEqual(receipt['selection']['certified_feasible'], [])
            self.assertEqual(receipt['diagnostics']['box_selection_diagnostic']['retained'], ['B'])
            self.assertEqual(receipt['diagnostics']['box_pool_role'], 'diagnostic_only_gate_closed')
            self.assertEqual(receipt['proof_assessments'][0]['check']['status'], 'not_checked')

    def test_valid_envelope_invalid_domain_arithmetic_and_scope_are_rejections(self):
        problem = fixture()
        valid = dominance_proof(problem)
        mutations = [lambda p: p.update(candidate_id='outside'),
                     lambda p: p.update(witness_id='outside'),
                     lambda p: p['improvement'].update(domain_id='0' * 64),
                     lambda p: p['improvement'].update(upper='-2'),
                     lambda p: p['improvement'].update(multipliers={'@box-upper:0': '-1'}),
                     lambda p: p['feasibility'].update(extra=deepcopy(p['improvement']))]
        for mutate in mutations:
            current, proof = deepcopy(problem), deepcopy(valid)
            mutate(proof)
            current['screening']['proofs'] = [proof]
            current['screening']['limits']['max_witness_pairs'] = 0
            receipt = wire.coupled_certificate(current)
            self.assertEqual(receipt['selection']['retained'], ['A', 'B'])
            self.assertEqual(receipt['proof_assessments'][0]['check']['status'], 'rejected')

    def test_global_contradiction_differs_from_candidate_contradiction(self):
        problem = fixture()
        problem['rows'] = [
            {'id': 'low', 'coefficients': ['-1'], 'upper': '-1', 'unit': '1', 'reference': 'synthetic'},
            {'id': 'high', 'coefficients': ['1'], 'upper': '0', 'unit': '1', 'reference': 'synthetic'}]
        manifest = wire.coupled_domains(problem)
        global_proof = {'id': 'empty-P', 'kind': 'infeasibility', 'instance_digest': manifest['instance_digest'],
                        'candidate_id': None, 'domain_id': manifest['common_domain']['domain_id'],
                        'multipliers': {'low': '1', 'high': '1'}}
        candidate_proof = dominance_proof(problem)
        problem['screening']['proofs'] = [candidate_proof, global_proof]
        receipt = wire.coupled_certificate(problem)
        self.assertEqual(receipt['coupling']['status'], 'proved_inconsistent_all_retained')
        self.assertEqual(receipt['selection']['retained'], ['A', 'B'])
        self.assertEqual([r['check']['status'] for r in receipt['proof_assessments']], ['not_checked', 'verified'])
        model = fixture()
        model['scenario']['constraints'] = {'g': {'unit': 'margin', 'reference': 'synthetic'}}
        model['rows'] = [{'id': 'cap', 'coefficients': ['1'], 'upper': '1/4', 'unit': '1', 'reference': 'synthetic'}]
        model['candidates'][0].update(score=affine((0,), -10), constraints={'g': affine((-1,), 1)})
        model['candidates'][1].update(score=affine((0,), 0), constraints={'g': affine((0,), -1)})
        manifest = wire.coupled_domains(model)
        proof = {'id': 'empty-QA', 'kind': 'infeasibility', 'instance_digest': manifest['instance_digest'],
                 'candidate_id': 'A', 'domain_id': manifest['candidate_domains']['A']['domain_id'],
                 'multipliers': {'cap': '1', '@feasible:0': '1'}}
        model['screening']['proofs'] = [proof]
        receipt = wire.coupled_certificate(model)
        self.assertEqual(receipt['selection']['coupled_infeasible'], ['A'])
        self.assertEqual(receipt['selection']['retained'], ['B'])

    def test_exact_ties_survive_and_partial_truth_cannot_establish_global_optimum(self):
        problem = fixture()
        problem['candidates'][0]['score']['constant'] = '0'
        receipt = wire.coupled_certificate(problem)
        self.assertEqual(receipt['selection']['retained'], ['A', 'B'])
        complete = outcomes(problem, ('0', '0'))
        audit = wire.coupled_replay_report(problem, complete)['outcome_audit']
        self.assertEqual(audit['true_minimizer_ids'], ['A', 'B'])
        self.assertTrue(audit['all_true_minimizers_retained'])
        for incomplete in ([], [complete['outcomes'][0]], [dict(complete['outcomes'][0], score=None)]):
            truth = deepcopy(complete)
            truth['outcomes'] = incomplete
            report = wire.coupled_replay_report(problem, truth)
            self.assertIsNone(report['outcome_audit']['true_minimizer_ids'])
            self.assertIsNone(report['outcome_audit']['all_true_minimizers_retained'])
        empty = deepcopy(complete)
        empty['outcomes'] = []
        coverage = wire.coupled_replay_report(problem, empty)['diagnostics']['marginal_coverage']
        self.assertIsNone(coverage['score_coverage']['rate'])
        self.assertEqual(coverage['score_coverage']['checked'], 0)

    def test_false_common_world_loses_optimum_despite_full_marginal_coverage(self):
        problem = fixture()
        truth = outcomes(problem, ('1', '2'), ['0'])
        report = wire.coupled_replay_report(problem, truth)
        self.assertEqual(report['decision']['selection']['retained'], ['B'])
        self.assertEqual(report['outcome_audit']['true_minimizer_ids'], ['A'])
        self.assertEqual(report['outcome_audit']['lost_optimum_ids'], ['A'])
        self.assertFalse(report['outcome_audit']['all_true_minimizers_retained'])
        self.assertEqual(report['diagnostics']['marginal_coverage']['score_coverage']['rate'], '1')
        audit = report['provided_world_audit']
        self.assertEqual(audit['status'], 'provided_point_mismatch')
        self.assertEqual(audit['mismatches'], [{'candidate_id': 'B', 'quantity': 'score',
                                              'reported': '2', 'model_at_provided_point': '0'}])
        self.assertEqual(audit['scientific_validity'], 'unestablished')

    def test_outcome_world_never_repairs_selection_gate_and_loader_runs_after_seal(self):
        problem = fixture()
        problem['screening']['consistency_point'] = None
        truth = outcomes(problem, point=['0'])
        order = []
        original = wire._selection_receipt
        def sealed(parsed):
            receipt = original(parsed)
            order.append('sealed')
            return receipt
        def load():
            self.assertEqual(order, ['sealed'])
            order.append('truth_loaded')
            return truth
        with patch.object(wire, '_selection_receipt', side_effect=sealed):
            report = wire.coupled_replay_report(problem, load)
        self.assertEqual(order, ['sealed', 'truth_loaded'])
        self.assertEqual(report['decision']['selection']['retained'], ['A', 'B'])
        self.assertEqual(report['provided_world_audit']['status'], 'provided_point_matches_reported_values')
        self.assertIsNone(report['decision']['certificate']['coupling']['supplied_consistency_point'])

    def test_outcome_seals_hidden_fields_and_partial_constraint_semantics(self):
        problem = fixture()
        problem['scenario']['constraints'] = {key: {'unit': 'margin', 'reference': 'synthetic'} for key in ('g', 'h')}
        for row in problem['candidates']:
            row['constraints'] = {key: affine((0,), -1) for key in ('g', 'h')}
        truth = outcomes(problem)
        truth['outcomes'][0]['constraints'] = {'g': '1'}
        report = wire.coupled_replay_report(problem, truth)
        self.assertIs(report['outcome_audit']['per_candidate']['A']['true_feasible'], False)
        self.assertIsNone(report['outcome_audit']['per_candidate']['B']['true_feasible'])
        self.assertIsNone(report['outcome_audit']['all_true_minimizers_retained'])
        mutations = [lambda v: v.update(problem_digest='0' * 64), lambda v: v.update(certificate_digest='0' * 64),
                     lambda v: v.update(hidden_truth={}), lambda v: v['outcomes'][0].update(id='outside'),
                     lambda v: v['outcomes'].append(deepcopy(v['outcomes'][0])),
                     lambda v: v['outcomes'][0]['constraints'].update(extra='0')]
        for mutate in mutations:
            invalid = deepcopy(truth)
            mutate(invalid)
            with self.assertRaises(ValueError): wire.coupled_replay_report(problem, invalid)

    def test_provided_point_absent_bad_unknown_and_empty_truth_states(self):
        problem = fixture()
        self.assertEqual(wire.coupled_replay_report(problem, outcomes(problem))['provided_world_audit']['status'], 'not_supplied')
        bad = outcomes(problem, point=['3'])
        self.assertEqual(wire.coupled_replay_report(problem, bad)['provided_world_audit']['status'], 'provided_point_outside_domain')
        empty = outcomes(problem, scores=(None, None), point=['0'])
        audit = wire.coupled_replay_report(problem, empty)['provided_world_audit']
        self.assertEqual(audit['status'], 'provided_point_consistent_no_reported_values')
        self.assertEqual(audit['checked_quantity_count'], 0)
        problem['screening']['limits']['max_operations'] = 0
        limited = outcomes(problem, point=['0'])
        self.assertEqual(wire.coupled_replay_report(problem, limited)['provided_world_audit']['status'], 'unresolved_by_work_limit')

    def test_wire_rejects_unknown_fields_float_bool_duplicate_key_and_invalid_exact_syntax(self):
        for scalar in (True, 0.25, ' 1', '1 ', '1e2', '1/0', '1/-2', 'NaN', 'Infinity', '9' * 513, 2**53):
            problem = fixture()
            problem['candidates'][0]['score']['constant'] = scalar
            with self.subTest(scalar=str(scalar)[:20]), self.assertRaises(ValueError):
                wire.coupled_certificate(problem)
        mutations = [lambda p: p.update(outcomes=[]), lambda p: p['candidates'][0].update(true_score='1'),
                     lambda p: p['latent_variables'][0].update(unit='metres'),
                     lambda p: p['candidates'][0]['score'].update(coefficients=[]),
                     lambda p: p['common_world'].update(premise_status='verified'),
                     lambda p: p['screening']['limits'].update(max_operations=100001),
                     lambda p: p['candidates'].append(deepcopy(p['candidates'][0]))]
        for mutate in mutations:
            problem = fixture()
            mutate(problem)
            with self.assertRaises(ValueError): wire.coupled_certificate(problem)
        for text in ('{"x":1,"x":2}', '{"x":1.0}', '{"x":NaN}', '{"x":9007199254740992}'):
            with self.assertRaises(ValueError): wire.loads_coupled(text)

    def test_all_preflight_limits_precede_fraction_conversion(self):
        too_many = fixture()
        too_many['candidates'] = [{'id': str(i), 'score': affine(), 'constraints': {}} for i in range(65)]
        too_deep = fixture()
        nested = []
        for _ in range(25): nested = [nested]
        too_deep['description'] = nested
        too_long = fixture()
        too_long['candidates'][0]['score']['constant'] = '7' * 513
        for problem in (too_many, too_deep, too_long):
            with patch.object(wire, 'Fraction', side_effect=AssertionError('conversion must not start')):
                with self.assertRaises(ValueError): wire.coupled_certificate(problem)
        with self.assertRaises(ValueError): wire.loads_coupled('[' * 25 + ']' * 25)
        with self.assertRaises(ValueError): wire.loads_coupled(' ' * (wire.MAX_DOCUMENT_BYTES + 1))
        self.assertEqual(wire.loads_coupled('{"x":"[[[[\\\"{}"}'), {'x': '[[[["{}'})
        oversized = fixture()
        oversized['candidates'][0]['score']['constant'] = str(2**512)
        with self.assertRaisesRegex(ValueError, '512 bits'): wire.coupled_certificate(oversized)

    def test_aggregate_and_structural_limits_reject_before_any_conversion(self):
        multiplier_overflow = fixture()
        multiplier_overflow['screening']['proofs'] = [
            {'id': str(index), 'kind': 'infeasibility', 'candidate_id': None,
             'domain_id': '0' * 64, 'instance_digest': '0' * 64,
             'multipliers': {f'r{j}': '0' for j in range(512)}} for index in range(9)]
        too_many_proofs = fixture()
        too_many_proofs['screening']['proofs'] = [
            {'id': str(index), 'kind': 'infeasibility', 'candidate_id': None,
             'domain_id': '0' * 64, 'instance_digest': '0' * 64, 'multipliers': {}} for index in range(65)]
        too_many_latents = fixture()
        too_many_latents['latent_variables'] = [
            {'id': str(i), 'bounds': ['0', '1'], 'unit': '1', 'reference': 'fixture'} for i in range(17)]
        too_many_rows = fixture()
        too_many_rows['rows'] = [
            {'id': str(i), 'coefficients': ['0'], 'upper': '1', 'unit': '1', 'reference': 'fixture'} for i in range(65)]
        too_many_constraints = fixture()
        too_many_constraints['scenario']['constraints'] = {
            str(i): {'unit': '1', 'reference': 'fixture'} for i in range(9)}
        oversized_direct = fixture()
        oversized_direct['extra'] = ['x' * 2048 for _ in range(130)]
        for current in (multiplier_overflow, too_many_proofs, too_many_latents,
                        too_many_rows, too_many_constraints, oversized_direct):
            with patch.object(wire, 'Fraction', side_effect=AssertionError('conversion must not start')):
                with self.assertRaises(ValueError): wire.parse_coupled_problem(current)
        # The token ceiling covers repeated tokens too; value deduplication is
        # performed only in the later conversion phase.
        numbers = wire._Numbers()
        with patch.object(wire, 'Fraction', side_effect=AssertionError('conversion must not start')):
            for _ in range(wire.MAX_RATIONAL_TOKENS): numbers.token('0')
            with self.assertRaisesRegex(ValueError, 'rational token limit'): numbers.token('0')
        cyclic = []
        cyclic.append(cyclic)
        with self.assertRaises(ValueError): wire.parse_coupled_problem(cyclic)
        with self.assertRaises(ValueError): wire.loads_coupled(json.dumps(['x' * 2048] * 130))

    def test_text_depth_prepass_ignores_escaped_quotes_and_structural_characters(self):
        for text in ('[{}]', '{"text":"[\\\"{}]"}', '{"text":"\\\\["}'):
            self.assertEqual(wire.loads_coupled(text), json.loads(text))
        with patch.object(wire.json, 'loads', side_effect=AssertionError('decoder must not start')):
            with self.assertRaisesRegex(ValueError, 'nesting'): wire.loads_coupled('[' * 25 + ']' * 25)
            with self.assertRaisesRegex(ValueError, 'byte limit'): wire.loads_coupled(b' ' * (wire.MAX_DOCUMENT_BYTES + 1))

    def test_zero_dimensions_empty_universe_and_undefined_no_feasible_optimum(self):
        problem = fixture()
        problem['latent_variables'] = []
        problem['screening']['consistency_point'] = []
        for row in problem['candidates']: row['score']['coefficients'] = []
        self.assertEqual(wire.coupled_certificate(problem)['coupling']['consistency']['status'], 'verified')
        problem['candidates'] = []
        audit = wire.coupled_replay_report(problem, outcomes(problem))['outcome_audit']
        self.assertEqual(audit['retention_status'], 'not_evaluated_empty_universe')
        self.assertIsNone(audit['all_true_minimizers_retained'])
        problem = fixture()
        problem['scenario']['constraints'] = {'g': {'unit': 'margin', 'reference': 'synthetic'}}
        for row in problem['candidates']: row['constraints'] = {'g': affine((0,), 1)}
        truth = outcomes(problem)
        for row in truth['outcomes']: row['constraints'] = {'g': '1'}
        audit = wire.coupled_replay_report(problem, truth)['outcome_audit']
        self.assertEqual(audit['retention_status'], 'undefined_no_feasible_candidate')
        self.assertIsNone(audit['all_true_minimizers_retained'])

    def test_cli_dispatch_verify_domains_and_sealed_replay(self):
        problem = fixture()
        receipt = certificate(problem)
        self.assertTrue(verify_certificate(problem, receipt)['verified'])
        tampered = deepcopy(receipt)
        tampered['execution']['requested_limits']['max_operations'] = True
        tampered['certificate_digest'] = digest({key: value for key, value in tampered.items() if key != 'certificate_digest'})
        with self.assertRaises(ValueError): verify_certificate(problem, tampered)
        # A type-equal Python comparison must not accept a Boolean in place of
        # a counted integer even after the forger updates the outer seal.
        problem['screening']['limits']['max_witness_pairs'] = 1
        receipt = certificate(problem)
        tampered = deepcopy(receipt)
        tampered['execution']['requested_limits']['max_witness_pairs'] = True
        tampered['execution']['effective_limits']['max_witness_pairs'] = True
        tampered['certificate_digest'] = digest({key: value for key, value in tampered.items() if key != 'certificate_digest'})
        with self.assertRaises(ValueError): verify_certificate(problem, tampered)
        self.assertEqual(replay_report(problem, outcomes(problem))['decision']['selection'], receipt['selection'])
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            source, truth_path, cert_path = (base / name for name in ('problem.json', 'truth.json', 'receipt.json'))
            source.write_text(json.dumps(problem))
            truth_path.write_text(json.dumps(outcomes(problem)))
            commands = [(['select', str(source), '--output', str(cert_path)], None),
                        (['verify', str(source), str(cert_path)], 'lupine.discovery.verification.v1'),
                        (['coupled-domains', str(source)], 'lupine.discovery.coupled_domains.v1'),
                        (['replay', str(source), str(truth_path)], 'lupine.discovery.coupled_replay.v1')]
            for arguments, schema in commands:
                process = subprocess.run([sys.executable, '-m', 'lupine_discovery', *arguments],
                                         capture_output=True, text=True)
                self.assertEqual(process.returncode, 0, process.stderr)
                if schema: self.assertEqual(json.loads(process.stdout)['schema'], schema)
            self.assertEqual(json.loads(cert_path.read_text()), receipt)

    def test_cli_defers_truth_open_and_bounds_generic_documents_before_decode(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            problem = fixture()
            source, truth_path = base / 'problem.json', base / 'truth.json'
            source.write_text(json.dumps(problem))
            truth_path.write_text(json.dumps(outcomes(problem)))
            state = []
            original_receipt, original_open = wire._selection_receipt, Path.open
            def seal(parsed):
                result = original_receipt(parsed)
                state.append('sealed')
                return result
            def opened(path, *args, **kwargs):
                if path == truth_path:
                    self.assertEqual(state, ['sealed'])
                    state.append('truth_opened')
                return original_open(path, *args, **kwargs)
            with patch.object(wire, '_selection_receipt', side_effect=seal), \
                    patch.object(Path, 'open', opened), patch('sys.stdout', new_callable=StringIO):
                self.assertEqual(main(['replay', str(source), str(truth_path)]), 0)
            self.assertEqual(state, ['sealed', 'truth_opened'])
            for invalid in (' ' * (2 * 1024 * 1024 + 1), '[' * 33 + ']' * 33):
                source.write_text(invalid)
                with patch('lupine_discovery.cli.loads', side_effect=AssertionError('decoder must not start')), \
                        patch('sys.stderr', new_callable=StringIO):
                    self.assertEqual(main(['select', str(source)]), 2)
            source.write_text(' ' * wire.MAX_DOCUMENT_BYTES + json.dumps(problem))
            with patch.object(wire, 'Fraction', side_effect=AssertionError('conversion must not start')), \
                    patch('sys.stderr', new_callable=StringIO):
                self.assertEqual(main(['select', str(source)]), 2)


if __name__ == '__main__':
    unittest.main()
