import copy
from dataclasses import FrozenInstanceError, replace
from fractions import Fraction as F
from itertools import product
import random
import unittest
from unittest.mock import patch

import lupine_discovery.coupled as coupled
from lupine_discovery.core import Interval
from lupine_discovery.coupled import (
    Affine, CoupledCandidate, CoupledProblem, DominanceCertificate,
    InfeasibilityCertificate, Limits, LinearRow, UpperBoundCertificate,
    check_dominance, check_infeasibility, check_point, check_upper_bound,
    make_domain, screen_coupled, simple_upper_certificate,
)
from lupine_discovery.evidence import Scope, digest
from lupine_discovery.serialization import encode


def problem(candidates=None, constraints=None, rows=(), bounds=None, **options):
    bounds = (Interval(0, 2),) if bounds is None else bounds
    return CoupledProblem('coupled-fixture', tuple(f'z{i}' for i in range(len(bounds))), tuple(bounds),
        Scope('coupled-fixture', 'score', 'utility', 'synthetic fixture'),
        {key: Scope('coupled-fixture', key, 'margin', 'synthetic fixture') for key in (constraints or ())},
        tuple(candidates or (CoupledCandidate('A', Affine((1,), 1), {}),
                             CoupledCandidate('B', Affine((1,), 0), {}))), tuple(rows), **options)


def independent_optima(instance, point):
    def value(expression):
        return expression.constant + sum((coefficient * z for coefficient, z in zip(expression.coefficients, point)), F(0))
    feasible = {candidate.candidate_id: value(candidate.score) for candidate in instance.candidates
                if all(value(expression) <= 0 for expression in candidate.constraints.values())}
    if not feasible:
        return set()
    best = min(feasible.values())
    return {cid for cid, score in feasible.items() if score == best}


class CoupledTests(unittest.TestCase):
    def test_shared_affine_cancellation_shrinks_overlapping_box_pool(self):
        instance = problem()
        result = screen_coupled(instance, (0,))
        self.assertEqual(result.box_selection_diagnostic.retained, ('A', 'B'))
        self.assertEqual(result.retained, ('B',))
        self.assertEqual(result.coupled_dominated, ('A',))
        self.assertEqual(dict(result.dominance_witnesses), {'A': 'B'})
        proof = result.exclusion_certificates['A']
        self.assertEqual(proof.improvement.upper, -1)
        self.assertEqual(dict(proof.improvement.multipliers), {})
        self.assertEqual(check_dominance(instance, proof).status, 'verified')
        self.assertEqual(result.premise_status, 'assumed_unverified')
        self.assertEqual(result.physical_attestation, 'not_established_by_this_program')
        for t in (F(0), F(1, 3), F(1), F(2)):
            self.assertTrue(independent_optima(instance, (t,)) <= set(result.retained))

    def test_error_intervals_preserve_exact_tie_and_possible_reversal(self):
        for epsilon, retained in ((F(1, 4), ('B',)), (F(1, 2), ('A', 'B')), (F(3, 4), ('A', 'B'))):
            instance = problem([
                CoupledCandidate('A', Affine((1, 1, 0), 1), {}),
                CoupledCandidate('B', Affine((1, 0, 1)), {}),
            ], bounds=(Interval(0, 2), Interval(-epsilon, epsilon), Interval(-epsilon, epsilon)),
                relation_basis='bounded_error_model')
            result = screen_coupled(instance, (0, 0, 0))
            self.assertEqual(result.retained, retained)
            frontier = independent_optima(instance, (F(0), -epsilon, epsilon))
            self.assertTrue(frontier <= set(retained))
            if epsilon == F(1, 2): self.assertEqual(frontier, {'A', 'B'})
            if epsilon == F(3, 4): self.assertEqual(frontier, {'A'})

    def test_conditional_feasible_witness_does_not_claim_global_feasibility(self):
        instance = problem([
            CoupledCandidate('A', Affine((0,), 1), {'g': Affine((1,))}),
            CoupledCandidate('B', Affine((0,), 0), {'g': Affine((1,))}),
        ], constraints=('g',), bounds=(Interval(-1, 1),))
        result = screen_coupled(instance, (0,))
        self.assertEqual(result.certified_feasible, ())
        self.assertEqual(result.retained, ('B',))
        proof = result.exclusion_certificates['A']
        self.assertEqual(dict(proof.feasibility['g'].multipliers), {'@feasible:0': F(1)})
        self.assertEqual(proof.feasibility['g'].domain_id, make_domain(instance, 'A').domain_id)
        for t in (F(-1), F(0), F(1)):
            self.assertTrue(independent_optima(instance, (t,)) <= set(result.retained))

    def test_explicit_nontrivial_dual_combination_can_strengthen_simple_producer(self):
        instance = problem([
            CoupledCandidate('A', Affine((0, 0), '3/4'), {}),
            CoupledCandidate('B', Affine((1, 1)), {}),
        ], bounds=(Interval(0, 1), Interval(0, 1)), rows=(
            LinearRow('u_cap', (1, 0), '1/4'), LinearRow('v_cap', (0, 1), '1/4')))
        domain = make_domain(instance, 'A')
        improvement = UpperBoundCertificate(domain.domain_id, Affine((1, 1), '-3/4'), '-1/4',
                                            {'u_cap': 1, 'v_cap': 1})
        proof = DominanceCertificate('A', 'B', {}, improvement)
        self.assertEqual(screen_coupled(instance, (0, 0)).retained, ('A', 'B'))
        result = screen_coupled(instance, (0, 0), (proof,))
        self.assertEqual(result.retained, ('B',))
        self.assertEqual(result.assessments[0].check.status, 'verified')
        self.assertEqual(check_upper_bound(domain, improvement).status, 'verified')

    def test_infeasible_candidate_domain_requires_exact_strict_contradiction(self):
        instance = problem([
            CoupledCandidate('A', Affine((0, 0), -10), {'g': Affine((-1, -1), 1)}),
            CoupledCandidate('B', Affine((0, 0), 0), {'g': Affine((0, 0), -1)}),
        ], constraints=('g',), bounds=(Interval(0, 1), Interval(0, 1)), rows=(
            LinearRow('u_cap', (1, 0), '1/4'), LinearRow('v_cap', (0, 1), '1/4')))
        domain = make_domain(instance, 'A')
        proof = InfeasibilityCertificate(domain.domain_id, {'u_cap': 1, 'v_cap': 1, '@feasible:0': 1}, 'A')
        self.assertEqual(screen_coupled(instance, (0, 0)).retained, ('A', 'B'))
        result = screen_coupled(instance, (0, 0), (proof,))
        self.assertEqual(result.retained, ('B',))
        self.assertEqual(result.coupled_infeasible, ('A',))
        self.assertEqual(check_infeasibility(domain, proof).status, 'verified')
        invalid = InfeasibilityCertificate(domain.domain_id, {}, 'A')
        self.assertEqual(check_infeasibility(domain, invalid).status, 'rejected')
        for claimed in (None, 'B', 'outside'):
            invalid = replace(proof, candidate_id=claimed)
            self.assertEqual(check_infeasibility(domain, invalid).status, 'rejected')
            failed = screen_coupled(instance, (0, 0), (invalid,), Limits(max_witness_pairs=0))
            self.assertEqual(failed.retained, ('A', 'B'))
            self.assertEqual(failed.assessments[0].check.status, 'rejected')

    def test_unsupported_unknown_and_bad_point_retain_universe_not_box_diagnostic(self):
        instance = problem([CoupledCandidate('A', Affine((0,), 2), {}), CoupledCandidate('B', Affine((0,), 0), {})])
        cases = [(instance, None), (instance, (3,)), (replace(instance, premise_status='unsupported'), (0,)),
                 (replace(instance, relation_basis='learned_correlation'), (0,))]
        for current, point in cases:
            result = screen_coupled(current, point)
            self.assertEqual(result.box_selection_diagnostic.retained, ('B',))
            self.assertEqual(result.retained, ('A', 'B'))
            self.assertEqual(result.certified_feasible, ())
            self.assertEqual(result.interval_dominated, ())
            self.assertFalse(result.exclusion_certificates)
            self.assertNotEqual(result.coupling_status, 'proved_inconsistent_all_retained')
        bad = screen_coupled(instance, (3,))
        self.assertEqual(bad.consistency.status, 'rejected')
        self.assertEqual(bad.coupling_status, 'consistency_unresolved_all_retained')

    def test_proved_inconsistent_premises_do_not_mean_empty_material_universe(self):
        instance = problem([CoupledCandidate('A', Affine((0,), 2), {}), CoupledCandidate('B', Affine((0,), 0), {})],
                           rows=(LinearRow('at_least_one', (-1,), -1), LinearRow('at_most_zero', (1,), 0)))
        domain = make_domain(instance)
        proof = InfeasibilityCertificate(domain.domain_id, {'at_least_one': 1, 'at_most_zero': 1})
        result = screen_coupled(instance, (0,), (proof,))
        self.assertEqual(result.coupling_status, 'proved_inconsistent_all_retained')
        self.assertEqual(result.consistency.reason, 'strict_linear_contradiction')
        self.assertEqual(result.retained, ('A', 'B'))
        self.assertEqual(result.interval_dominated, ())
        self.assertEqual(result.coupled_infeasible, ())
        self.assertEqual(check_point(domain, (0,)).status, 'rejected')
        self.assertEqual(screen_coupled(instance).coupling_status, 'consistency_unresolved_all_retained')

    def test_wrong_sign_dual_wrong_bound_and_wrong_domain_rejected(self):
        instance = problem()
        domain = make_domain(instance)
        good = UpperBoundCertificate(domain.domain_id, Affine((1,)), 2, {'@box-upper:0': 1})
        self.assertEqual(check_upper_bound(domain, good).status, 'verified')
        for bad in (replace(good, multipliers={'@box-upper:0': -1}),
                    replace(good, multipliers={'@box-lower:0': 1}),
                    replace(good, upper=1), replace(good, multipliers={'outside': 1}),
                    replace(good, domain_id=make_domain(instance, 'A').domain_id),
                    replace(good, expression=Affine((1, 0)))):
            self.assertEqual(check_upper_bound(domain, bad).status, 'rejected')
        for bad in (InfeasibilityCertificate(domain.domain_id, {'@box-upper:0': 1}),
                    InfeasibilityCertificate(domain.domain_id, {'@box-lower:0': 1, '@box-upper:0': 1}),
                    InfeasibilityCertificate(domain.domain_id, {'@box-upper:0': -1})):
            self.assertEqual(check_infeasibility(domain, bad).status, 'rejected')

    def test_requested_witness_and_full_problem_scopes_cannot_be_rebound(self):
        instance = problem()
        proof = screen_coupled(instance, (0,)).exclusion_certificates['A']
        for bad in (replace(proof, candidate_id='outside'), replace(proof, witness_id='outside'),
                    replace(proof, witness_id='A'),
                    replace(proof, feasibility={'extra': proof.improvement}),
                    replace(proof, improvement=replace(proof.improvement, expression=Affine((0,), -100))),
                    replace(proof, improvement=replace(proof.improvement, domain_id=make_domain(instance, 'B').domain_id))):
            self.assertEqual(check_dominance(instance, bad).status, 'rejected')
        changed = replace(instance, objective_scope=Scope('coupled-fixture', 'score', 'changed unit', 'synthetic fixture'))
        result = screen_coupled(changed, (0,), (proof,), Limits(max_witness_pairs=0))
        self.assertEqual(result.retained, ('A', 'B'))
        self.assertEqual(result.assessments[0].check.reason, 'domain_identity_mismatch')
        extra = replace(instance, candidates=(*instance.candidates, CoupledCandidate('C', Affine((1,), 10), {})))
        self.assertEqual(check_dominance(extra, proof).status, 'rejected')

    def test_fixed_original_world_remains_valid_when_a_witness_is_later_pruned(self):
        instance = problem([CoupledCandidate('A', Affine((1,), 2), {}),
                            CoupledCandidate('B', Affine((1,), 1), {}), CoupledCandidate('C', Affine((1,)), {})])
        result = screen_coupled(instance, (0,))
        self.assertEqual(result.retained, ('C',))
        self.assertEqual(dict(result.dominance_witnesses), {'A': 'B', 'B': 'C'})
        for cid, proof in result.exclusion_certificates.items():
            self.assertEqual(proof.improvement.domain_id, make_domain(instance, cid).domain_id)
            self.assertEqual(check_dominance(instance, proof).status, 'verified')

    def test_resource_exhaustion_never_becomes_exclusion_or_certainty(self):
        instance = problem()
        for limits in (Limits(max_operations=0), Limits(max_operations=10), Limits(max_witness_pairs=0)):
            result = screen_coupled(instance, (0,), limits=limits)
            self.assertEqual(result.retained, ('A', 'B'))
            self.assertFalse(result.exclusion_certificates)
            self.assertIn(result.coupling_status, ('consistency_unresolved_all_retained', 'conditional_partially_screened'))
        domain = make_domain(instance)
        huge = UpperBoundCertificate(domain.domain_id, Affine((0,), 2**100), 2**100, {})
        self.assertEqual(check_upper_bound(domain, huge, Limits(max_integer_bits=32)).status, 'unresolved')
        proof = UpperBoundCertificate(domain.domain_id, Affine((1,)), 2, {'@box-upper:0': 1})
        self.assertEqual(check_upper_bound(domain, proof, Limits(max_certificate_terms=0)).status, 'unresolved')
        generated, checked = simple_upper_certificate(domain, Affine((1,)), Limits(max_operations=0))
        self.assertIsNone(generated)
        self.assertEqual(checked.status, 'unresolved')

    def test_unused_domains_are_not_constructed_and_used_domains_are_cached(self):
        instance = problem()
        proof = screen_coupled(instance, (0,)).exclusion_certificates['A']
        with patch.object(coupled, '_base_domain', wraps=coupled._base_domain) as base, \
                patch.object(coupled, '_candidate_domain', wraps=coupled._candidate_domain) as candidate:
            result = screen_coupled(instance, (0,), limits=Limits(max_witness_pairs=0))
            self.assertEqual(result.retained, ('A', 'B'))
            self.assertEqual(base.call_count, 1)
            self.assertEqual(candidate.call_count, 0)
        with patch.object(coupled, '_base_domain', wraps=coupled._base_domain) as base, \
                patch.object(coupled, '_candidate_domain', wraps=coupled._candidate_domain) as candidate:
            result = screen_coupled(instance, (0,), (proof, proof), Limits(max_witness_pairs=0))
            self.assertEqual(result.retained, ('B',))
            self.assertEqual(base.call_count, 1)
            self.assertEqual(candidate.call_count, 1)
            self.assertEqual(candidate.call_args.args[1].candidate_id, 'A')

    def test_multiplier_mapping_order_cannot_change_bounded_certificate_check(self):
        instance = problem(rows=(LinearRow('a', (7,), 0), LinearRow('b', (-7,), 0),
                                 LinearRow('c', (7,), 0)))
        domain = make_domain(instance)
        first = UpperBoundCertificate(domain.domain_id, Affine((7,)), 0, {'a': 1, 'b': 1, 'c': 1})
        reordered = replace(first, multipliers={'c': 1, 'a': 1, 'b': 1})
        self.assertEqual(digest(encode(first)), digest(encode(reordered)))
        # Canonical a,b,c partial sums are 7,0,7. Caller order c,a,b would
        # produce 14 and spuriously exhaust the same three-bit work limit.
        limits = Limits(max_integer_bits=3)
        self.assertEqual(check_upper_bound(domain, first, limits).status, 'verified')
        self.assertEqual(check_upper_bound(domain, first, limits), check_upper_bound(domain, reordered, limits))

    def test_scope_and_constraint_mapping_order_cannot_change_bounded_witness_check(self):
        def make(keys):
            constraints = {'a': Affine((0,), -8), 'z': Affine((0,), 1)}
            return problem([
                CoupledCandidate('A', Affine((0,), 1), {key: Affine((0,), -1) for key in keys}),
                CoupledCandidate('B', Affine((0,), 0), {key: constraints[key] for key in keys}),
            ], constraints=keys)
        first, reordered = make(('a', 'z')), make(('z', 'a'))
        domain = make_domain(first, 'A')
        self.assertEqual(domain.domain_id, make_domain(reordered, 'A').domain_id)
        bounds = {key: UpperBoundCertificate(domain.domain_id, expression, expression.constant, {})
                  for key, expression in first.candidates[1].constraints.items()}
        proof = DominanceCertificate('A', 'B', bounds,
                                     UpperBoundCertificate(domain.domain_id, Affine((0,), -1), -1, {}))
        reordered_proof = replace(proof, feasibility=dict(reversed(tuple(bounds.items()))))
        self.assertEqual(digest(encode(proof)), digest(encode(reordered_proof)))
        limits = Limits(max_integer_bits=3)
        checked = check_dominance(first, proof, limits)
        self.assertEqual(checked.status, 'unresolved')
        self.assertEqual(checked.reason, 'exact_integer_budget_exhausted')
        self.assertEqual(checked, check_dominance(reordered, reordered_proof, limits))

    def test_independent_rational_worlds_preserve_every_true_minimizer(self):
        rng = random.Random(51824)
        worlds = [point for point in product((F(0), F(1, 4), F(1, 2), F(3, 4), F(1)), repeat=2)
                  if sum(point) <= 1]
        total = 0
        for _ in range(40):
            candidates = [CoupledCandidate(str(i), Affine(tuple(F(rng.randrange(-3, 4), 2) for _ in range(2)), F(rng.randrange(-4, 5), 3)),
                                           {'g': Affine(tuple(F(rng.randrange(-2, 3)) for _ in range(2)), F(rng.randrange(-2, 3), 2))})
                          for i in range(5)]
            instance = problem(candidates, constraints=('g',), bounds=(Interval(0, 1), Interval(0, 1)),
                               rows=(LinearRow('shared_cap', (1, 1), 1),))
            result = screen_coupled(instance, (0, 0))
            for point in worlds:
                self.assertTrue(independent_optima(instance, point) <= set(result.retained))
                total += 1
        self.assertEqual(total, 600)

    def test_fixed_witness_screen_is_explicitly_incomplete_for_changing_winners(self):
        instance = problem([CoupledCandidate('X', Affine((0,), '1/2'), {}),
                            CoupledCandidate('Y', Affine((1,)), {}), CoupledCandidate('Z', Affine((-1,)), {})],
                           bounds=(Interval(-1, 1),))
        result = screen_coupled(instance, (0,))
        self.assertEqual(result.retained, ('X', 'Y', 'Z'))
        for t in (F(-1), F(-1, 2), F(0), F(1, 2), F(1)):
            self.assertNotIn('X', independent_optima(instance, (t,)))

    def test_input_shapes_exactness_reserved_ids_and_scope_validation(self):
        for invalid in (True, 0.1, float('inf'), float('nan')):
            with self.assertRaises(TypeError): Affine((invalid,), 0)
            with self.assertRaises(TypeError): LinearRow('r', (1,), invalid)
            with self.assertRaises(TypeError): UpperBoundCertificate('domain', Affine((1,)), 1, {'r': invalid})
        for invalid in ('1', {'x': 1}, (value for value in [1])):
            with self.assertRaises(TypeError): Affine(invalid)
        instance = problem()
        mutations = [
            dict(latent_ids=('x', 'x')), dict(rows=(LinearRow('same', (1,), 1), LinearRow('same', (-1,), 1))),
            dict(rows=(LinearRow('@box-upper:0', (1,), 1),)), dict(rows=(LinearRow('r', (1, 0), 1),)),
            dict(candidates=(instance.candidates[0], instance.candidates[0])),
            dict(objective_scope=Scope('other', 'score', 'u', 'r')),
            dict(objective_scope=Scope('coupled-fixture', 'other', 'u', 'r')),
            dict(constraint_scopes={'g': Scope('coupled-fixture', 'g', 'u', 'r')}),
            dict(premise_status='verified'), dict(relation_basis='scientific_truth'),
        ]
        for changes in mutations:
            with self.subTest(changes=changes), self.assertRaises((TypeError, ValueError)):
                replace(instance, **changes)
        for invalid in (True, -1, 1.5):
            with self.assertRaises(ValueError): Limits(max_operations=invalid)
        for invalid in (True, '', 1):
            with self.assertRaises((TypeError, ValueError)):
                InfeasibilityCertificate('domain', {}, invalid)
        self.assertEqual(check_point(make_domain(instance), (0.1,)).status, 'rejected')
        self.assertEqual(check_point(make_domain(instance), (True,)).status, 'rejected')
        self.assertEqual(check_point(make_domain(instance), ()).reason, 'point_dimension_mismatch')

    def test_immutable_snapshots_zero_dimensions_and_empty_universe(self):
        coefficients, constraints = [1], {'g': Affine((0,), -1)}
        expression = Affine(coefficients)
        candidate = CoupledCandidate('A', expression, constraints)
        coefficients[0] = 100
        constraints.clear()
        self.assertEqual(candidate.score.coefficients, (F(1),))
        self.assertEqual(set(candidate.constraints), {'g'})
        with self.assertRaises(TypeError): candidate.constraints['g'] = Affine((0,), 1)
        result = screen_coupled(problem(), (0,))
        with self.assertRaises(FrozenInstanceError): result.retained = ()
        with self.assertRaises(TypeError): result.dominance_witnesses['A'] = 'A'
        with self.assertRaises(TypeError): result.exclusion_certificates['A'].improvement.multipliers['fake'] = 1
        constants = problem([CoupledCandidate('A', Affine((), 1), {}), CoupledCandidate('B', Affine((), 0), {})], bounds=())
        self.assertEqual(screen_coupled(constants, ()).retained, ('B',))
        empty = replace(constants, candidates=())
        self.assertEqual(screen_coupled(empty, ()).retained, ())


if __name__ == '__main__':
    unittest.main()
