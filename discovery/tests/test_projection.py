from dataclasses import FrozenInstanceError, replace
from fractions import Fraction as F
from itertools import product
import unittest
from unittest.mock import patch

from lupine_discovery.core import Interval
from lupine_discovery.coupled import InfeasibilityCertificate, Limits, make_domain
from lupine_discovery.evidence import Scope, digest
import lupine_discovery.projection as projection
from lupine_discovery.projection import (
    FieldBlock, FieldScope, Observation, PhysicalContext, ProjectionAnchor,
    ProjectionCandidate, ProjectionProblem, QuantityUse, SourceIdentity,
    build_projection, screen_projection,
)
from lupine_discovery.serialization import encode


SID = 'projection-synthetic'
CONTEXT = PhysicalContext(SID, 'material', 'composition', 'structure', 'conditions')
FIELD_SCOPE = FieldScope(CONTEXT, 'model', 'v1', 'energy-family', 'reference-method', 'fixed-descriptor')
SOURCE_SCOPE = Scope(SID, 'source-energy', 'synthetic energy', 'source convention')
SCORE_SCOPE = Scope(SID, 'score', 'synthetic energy', 'minimize source value')
SOURCE = SourceIdentity('assumption', 'synthetic declared premises', 'urn:fixture', 'a' * 64)


def fixture(radius=F(1, 4)):
    block = FieldBlock('shared', FIELD_SCOPE, ('theta',), ('synthetic energy',), (0,), ((1,),),
                       ('z',), (Interval(0, 2),), 'theta=z in the declared normalized box',
                       'explicitly assumed finite coordinate enclosure', ('assumption',))
    observations = tuple(Observation(name, 'shared', FIELD_SCOPE, SOURCE_SCOPE, nominal, (1,), rho,
                                    'explicitly assumed discrepancy enclosure', ('assumption',))
                         for name, nominal, rho in (('A-score', 5, radius), ('B-score', 4, radius), ('reference', 3, 0)))
    use = lambda name: QuantityUse(name, 1, 0, SCORE_SCOPE, 'identity target map', ('assumption',))
    candidates = (ProjectionCandidate('A', CONTEXT, use('A-score'), {}),
                  ProjectionCandidate('B', CONTEXT, use('B-score'), {}))
    anchor = ProjectionAnchor('uncertain-reference', 'reference', SOURCE_SCOPE, Interval(1, 3),
                              'independently supplied uncertain anchor', ('assumption',))
    return ProjectionProblem(SID, SCORE_SCOPE, {}, (block,), observations, candidates,
                             'one common field and all declared discrepancy enclosures', (anchor,), (SOURCE,))


def point_for(build, fields=None, errors=None):
    fields, errors = fields or {}, errors or {}
    result = [F(0)] * len(build.model.latent_ids)
    for info in build.coordinate_map.values():
        value = fields.get((info['block_id'], info['local_id']), 0) if info['kind'] == 'field' else errors.get(info['observation_id'], 0)
        result[info['index']] = F(value)
    return tuple(result)


class ProjectionTests(unittest.TestCase):
    def test_synthetic_bridge_shrinks_pool_and_reconstructs_exact_bound(self):
        problem = fixture()
        build = build_projection(problem)
        self.assertEqual(build.status, 'finite_conditional')
        self.assertIsNone(build.retained)
        result = screen_projection(problem, point_for(build))
        self.assertEqual(result.selection.box_selection_diagnostic.retained, ('A', 'B'))
        self.assertEqual(result.retained, ('B',))
        self.assertEqual(result.selection.exclusion_certificates['A'].improvement.upper, F(-1, 2))
        self.assertEqual(result.build.relation_record['physical_attestation'], 'not_established_by_this_program')
        self.assertEqual(build.input_digest, digest(encode(problem)))
        self.assertEqual(build.relation_digest, digest(encode(build.relation_record)))

    def test_tie_boundary_is_attained_and_zero_radius_is_explicit(self):
        problem = fixture(F(1, 2))
        build = build_projection(problem)
        point = point_for(build, errors={'A-score': -1, 'B-score': 1})
        result = screen_projection(problem, point)
        self.assertEqual(result.retained, ('A', 'B'))
        scores = {row.candidate_id: row.score.evaluate(point) for row in build.model.candidates}
        self.assertEqual(scores, {'A': F(9, 2), 'B': F(9, 2)})
        reference_error = next(info['index'] for info in build.coordinate_map.values()
                               if info['kind'] == 'discrepancy' and info['observation_id'] == 'reference')
        self.assertEqual(build.observation_affines['reference'].coefficients[reference_error], 0)
        self.assertEqual(build.model.latent_bounds[reference_error], Interval(-1, 1))

    def test_general_normalization_and_signed_target_transform_match_direct_equation(self):
        base = fixture()
        block = replace(base.blocks[0], parameter_ids=('p', 'q'), parameter_units=('u', 'v'),
                        offset=(1, -2), matrix=((2, -1), (3, '1/2')), latent_ids=('z', 'w'),
                        latent_bounds=(Interval(-1, 1), Interval(0, 2)))
        observation = replace(base.observations[0], nominal=5, weights=(2, -3), discrepancy_radius='2/3')
        g_scope = Scope(SID, 'g', 'margin', 'source value minus threshold')
        score = QuantityUse(observation.observation_id, -2, 7, SCORE_SCOPE, 'negate and scale full source expression')
        margin = QuantityUse(observation.observation_id, 3, -4, g_scope, 'apply entire threshold transform')
        candidate = ProjectionCandidate('A', CONTEXT, score, {'g': margin})
        problem = replace(base, constraint_scopes={'g': g_scope}, blocks=(block,), observations=(observation,),
                          candidates=(candidate,), anchors=())
        build = build_projection(problem)
        self.assertEqual(build.observation_affines['A-score'].constant, -3)
        self.assertEqual(build.observation_affines['A-score'].coefficients, (F(5), F(7, 2), F(2, 3)))
        self.assertEqual(build.model.candidates[0].score.constant, 13)
        self.assertEqual(build.model.candidates[0].score.coefficients, (F(-10), F(-7), F(-4, 3)))
        for z, w, error in product((F(-1), F(0), F(1)), (F(0), F(1), F(2)), (F(-1), F(0), F(1))):
            theta = (1 + 2*z - w, -2 + 3*z + w/2)
            direct = 5 - (2*theta[0] - 3*theta[1]) + F(2, 3)*error
            point = point_for(build, {('shared', 'z'): z, ('shared', 'w'): w}, {'A-score': error})
            self.assertEqual(build.observation_affines['A-score'].evaluate(point), direct)
            self.assertEqual(build.model.candidates[0].score.evaluate(point), -2*direct + 7)
            self.assertEqual(build.model.candidates[0].constraints['g'].evaluate(point), 3*direct - 4)

    def test_anchor_interval_rows_preserve_uncertainty_and_full_constant(self):
        base = fixture()
        observation = replace(base.observations[0], nominal='-2/3', weights=(-2,), discrepancy_radius='1/3')
        anchor = ProjectionAnchor('uncertain', observation.observation_id, SOURCE_SCOPE, Interval('-1/3', '4/3'),
                                  'source-space interval with signed field weights')
        problem = replace(base, observations=(observation,), candidates=(base.candidates[0],), anchors=(anchor,))
        build = build_projection(problem)
        by_id = {row.row_id: row for row in build.model.rows}
        upper, lower = (by_id[rid] for rid in build.anchor_rows['uncertain'])
        self.assertEqual(upper.upper, 2)
        self.assertEqual(lower.upper, F(-1, 3))
        for z, error in product((F(0), F(1, 3), F(1), F(2)), (F(-1), F(0), F(1))):
            point = point_for(build, {('shared', 'z'): z}, {'A-score': error})
            source_value = F(-2, 3) + 2*z + error/3
            admitted = all(sum(a*t for a, t in zip(row.coefficients, point)) <= row.upper for row in (upper, lower))
            self.assertEqual(admitted, F(-1, 3) <= source_value <= F(4, 3))

    def test_inconsistent_anchors_retain_universe_and_can_be_proved_inconsistent(self):
        base = fixture()
        anchors = (replace(base.anchors[0], anchor_id='first', interval=Interval(1, 1)),
                   replace(base.anchors[0], anchor_id='second', interval=Interval(2, 2)))
        problem = replace(base, anchors=anchors)
        build = build_projection(problem)
        point = point_for(build)
        unresolved = screen_projection(problem, point)
        self.assertEqual(unresolved.retained, ('A', 'B'))
        self.assertEqual(unresolved.status, 'consistency_unresolved_all_retained')
        # First anchor upper says q<=1; second anchor lower says -q<=-2.
        proof = InfeasibilityCertificate(make_domain(build.model).domain_id,
                    {build.anchor_rows['first'][0]: 1, build.anchor_rows['second'][1]: 1})
        proved = screen_projection(problem, point, (proof,))
        self.assertEqual(proved.status, 'proved_inconsistent_all_retained')
        self.assertEqual(proved.retained, ('A', 'B'))
        self.assertEqual(proved.selection.coupled_infeasible, ())

    def test_missing_or_empirical_bounds_return_no_model_or_finite_diagnostic(self):
        base = fixture()
        cases = [replace(base, blocks=(replace(base.blocks[0], latent_bounds=(None,)),)),
                 replace(base, blocks=(replace(base.blocks[0], field_bound_basis='empirical_residual'),)),
                 replace(base, blocks=(replace(base.blocks[0], field_bound_basis='missing'),)),
                 replace(base, observations=(replace(base.observations[0], discrepancy_radius=None), *base.observations[1:])),
                 replace(base, observations=(replace(base.observations[0], bound_basis='empirical_residual'), *base.observations[1:])),
                 replace(base, observations=(replace(base.observations[0], bound_basis='missing'), *base.observations[1:])),
                 replace(base, premise_status='unsupported'),
                 replace(base, blocks=(replace(base.blocks[0], premise_status='unsupported'),)),
                 replace(base, anchors=(replace(base.anchors[0], premise_status='unsupported'),)),
                 replace(base, observations=(replace(base.observations[0], premise_status='unsupported'), *base.observations[1:]))]
        for problem in cases:
            with patch.object(projection, 'CoupledProblem', side_effect=AssertionError('no finite model may be invented')):
                build = build_projection(problem)
            self.assertEqual(build.status, 'unsupported_all_retained')
            self.assertIsNone(build.model)
            self.assertEqual(build.retained, ('A', 'B'))
            self.assertTrue(build.reasons)
            self.assertEqual(dict(build.coordinate_map), {})
            self.assertEqual(dict(build.observation_affines), {})
            self.assertNotIn('kernel_model_digest', build.relation_record)
            result = screen_projection(problem)
            self.assertIsNone(result.selection)
            self.assertEqual(result.retained, ('A', 'B'))
        unused = replace(base.observations[0], observation_id='unused', discrepancy_radius=None)
        build = build_projection(replace(base, observations=(*base.observations, unused)))
        self.assertEqual(build.status, 'unsupported_all_retained')

    def test_independent_blocks_and_errors_do_not_merge_by_names_or_values(self):
        base = fixture(0)
        other_context = replace(CONTEXT, material_id='other-material')
        other_scope = replace(FIELD_SCOPE, context=other_context)
        first = replace(base.blocks[0], block_id='a:b', latent_ids=('c',))
        second = replace(base.blocks[0], block_id='a', scope=other_scope, latent_ids=('b:c',))
        a = replace(base.observations[0], block_id=first.block_id)
        b = replace(base.observations[1], block_id=second.block_id, field_scope=other_scope)
        candidate_b = replace(base.candidates[1], context=other_context)
        problem = replace(base, blocks=(first, second), observations=(a, b),
                          candidates=(base.candidates[0], candidate_b), anchors=())
        build = build_projection(problem)
        self.assertEqual(len(set(build.model.latent_ids)), 4)
        self.assertEqual(len([v for v in build.coordinate_map.values() if v['kind'] == 'discrepancy']), 2)
        result = screen_projection(problem, point_for(build))
        self.assertEqual(result.retained, ('A', 'B'))
        for za, zb, winner in ((2, 0, 'A'), (0, 2, 'B')):
            point = point_for(build, {(first.block_id, 'c'): za, (second.block_id, 'b:c'): zb})
            scores = {row.candidate_id: row.score.evaluate(point) for row in build.model.candidates}
            self.assertEqual(min(scores, key=scores.get), winner)

    def test_full_context_and_anchor_source_scope_must_match(self):
        base = fixture()
        for key in ('scenario_id', 'material_id', 'composition_id', 'structure_id', 'operating_conditions_id'):
            altered = replace(CONTEXT, **{key: 'incompatible'})
            with self.subTest(key=key), self.assertRaises(ValueError):
                replace(base, candidates=(replace(base.candidates[0], context=altered), base.candidates[1]))
        for key in ('model_id', 'model_version', 'observation_family', 'reference_method', 'descriptor_id'):
            altered = replace(FIELD_SCOPE, **{key: 'different'})
            with self.subTest(key=key), self.assertRaises(ValueError):
                replace(base, observations=(replace(base.observations[0], field_scope=altered), *base.observations[1:]))
        for key in ('scenario_id', 'quantity', 'unit', 'reference'):
            altered = replace(SOURCE_SCOPE, **{key: 'different'})
            with self.subTest(key=key), self.assertRaises(ValueError):
                replace(base, anchors=(replace(base.anchors[0], source_scope=altered),))
        with self.assertRaises(ValueError):
            replace(base, observations=(replace(base.observations[0], block_id='unknown'), *base.observations[1:]))
        with self.assertRaises(ValueError):
            replace(base, candidates=(replace(base.candidates[0], score=replace(base.candidates[0].score, observation_id='unknown')),))

    def test_metadata_source_and_conversion_identity_are_preserved_separately(self):
        base = fixture()
        original = build_projection(base)
        changed_source = replace(base, sources=(replace(SOURCE, sha256='b' * 64),))
        changed_conversion = replace(base, candidates=(replace(base.candidates[0],
            score=replace(base.candidates[0].score, conversion_reference='new declared derivation')), base.candidates[1]))
        changed_anchor = replace(base, anchors=(replace(base.anchors[0], reference='new anchor provenance'),))
        for current in (changed_source, changed_conversion, changed_anchor):
            build = build_projection(current)
            self.assertNotEqual(original.input_digest, build.input_digest)
            self.assertNotEqual(original.relation_digest, build.relation_digest)
            self.assertEqual(original.relation_record['kernel_model_digest'], build.relation_record['kernel_model_digest'])
        self.assertEqual(original.relation_record['declarations']['sources'][0]['sha256'], 'a' * 64)
        with self.assertRaises(ValueError): replace(base, sources=())
        with self.assertRaises(ValueError): replace(SOURCE, sha256='not-a-digest')

    def test_all_input_arrays_and_returned_records_are_immutable_snapshots(self):
        base = fixture()
        offset, matrix, local_ids, bounds = [0], [[1]], ['z'], [Interval(0, 2)]
        block = replace(base.blocks[0], offset=offset, matrix=matrix, latent_ids=local_ids, latent_bounds=bounds)
        offset[0], matrix[0][0], local_ids[0] = 9, 10, 'changed'
        bounds.clear()
        self.assertEqual(block.offset, (F(0),))
        self.assertEqual(block.matrix, ((F(1),),))
        self.assertEqual(block.latent_ids, ('z',))
        build = build_projection(base)
        with self.assertRaises(FrozenInstanceError): build.status = 'verified'
        with self.assertRaises(TypeError): build.observation_affines['A-score'] = None
        with self.assertRaises(TypeError): build.relation_record['declarations']['sources'][0]['sha256'] = 'c' * 64
        info = next(iter(build.coordinate_map.values()))
        with self.assertRaises(TypeError): info['index'] = 99

    def test_float_bool_dimension_duplicate_and_unknown_target_validation(self):
        base = fixture()
        for invalid in (0.1, True, float('inf')):
            with self.assertRaises(TypeError): replace(base.blocks[0], offset=(invalid,))
            with self.assertRaises(TypeError): replace(base.observations[0], nominal=invalid)
            with self.assertRaises(TypeError): replace(base.observations[0], discrepancy_radius=invalid)
            with self.assertRaises(TypeError): replace(base.candidates[0].score, scale=invalid)
        for changes in (dict(offset=()), dict(matrix=((1, 2),)), dict(parameter_units=()), dict(latent_bounds=())):
            with self.assertRaises(ValueError): replace(base.blocks[0], **changes)
        with self.assertRaises(ValueError): replace(base, blocks=(base.blocks[0], base.blocks[0]))
        with self.assertRaises(ValueError): replace(base, observations=(base.observations[0], base.observations[0]))
        with self.assertRaises(ValueError): replace(base, candidates=(base.candidates[0], base.candidates[0]))
        with self.assertRaises(ValueError): replace(base.observations[0], discrepancy_radius=-1)
        with self.assertRaises(ValueError): replace(base.blocks[0], premise_status='verified')
        with self.assertRaises(ValueError): replace(base.blocks[0], field_bound_basis='confidence')
        with self.assertRaises(ValueError): replace(base.observations[0], bound_basis='confidence')
        bad_use = replace(base.candidates[0].score, output_scope=replace(SCORE_SCOPE, unit='different'))
        with self.assertRaises(ValueError): replace(base, candidates=(replace(base.candidates[0], score=bad_use),))

    def test_rectangular_singular_normalization_zero_scale_and_empty_universe(self):
        base = fixture()
        block = replace(base.blocks[0], parameter_ids=('p', 'q'), parameter_units=('u', 'u'),
                        offset=(1, 2), matrix=((1,), (2,)))
        observation = replace(base.observations[0], weights=(2, -1))
        candidate = replace(base.candidates[0], score=replace(base.candidates[0].score, scale=0, offset=7))
        problem = replace(base, blocks=(block,), observations=(observation,), candidates=(candidate,), anchors=())
        build = build_projection(problem)
        expression = build.model.candidates[0].score
        self.assertEqual(expression.constant, 7)
        self.assertTrue(all(coefficient == 0 for coefficient in expression.coefficients))
        empty = ProjectionProblem(SID, SCORE_SCOPE, {}, (), (), (), 'empty synthetic universe')
        self.assertEqual(build_projection(empty).model.latent_ids, ())
        self.assertEqual(screen_projection(empty, ()).retained, ())
        limited = screen_projection(base, point_for(build_projection(base)), limits=Limits(max_operations=0))
        self.assertEqual(limited.retained, ('A', 'B'))
        self.assertEqual(limited.status, 'consistency_unresolved_all_retained')


if __name__ == '__main__':
    unittest.main()
