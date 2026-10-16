"""Independent synthetic equations and failure controls for the field adapter.

The truth oracle evaluates original source equations, not the adapter's
translation helpers. Finite-world tests are not physical or formal validation.
"""
from dataclasses import replace
from fractions import Fraction as F
import itertools
import random
import unittest

from lupine_discovery import projection as p
from lupine_discovery import coupled as c
from lupine_discovery.core import Interval
from lupine_discovery.evidence import Scope


AUDIT_COUNTS = {"source_equation_worlds": 0, "anchor_worlds": 0,
                "admitted_retention_worlds": 0, "reversal_worlds": 0,
                "varied_problem_count": 0}


def context(material="material", structure="structure", conditions="conditions"):
    return p.PhysicalContext("projection-independent", material, "composition", structure, conditions)


def scope(physical=None):
    return p.FieldScope(physical or context(), "model", "v1", "energy", "reference", "descriptor-v1")


def quantity(name="raw", unit="source-unit"):
    return Scope("projection-independent", name, unit, "synthetic-reference")


def block(name="field", physical=None, offset=(0,), matrix=((1,),), bounds=None):
    dimensions = len(matrix[0]) if matrix else 0
    return p.FieldBlock(name, scope(physical), tuple(f"theta{i}" for i in range(len(offset))),
                        tuple("field-unit" for _ in offset), tuple(offset), tuple(tuple(row) for row in matrix),
                        tuple(f"z{i}" for i in range(dimensions)),
                        tuple(Interval(-1, 1) for _ in range(dimensions)) if bounds is None else tuple(bounds),
                        "Explicit finite synthetic image; no coverage inferred",
                        "Declared finite synthetic coordinate bounds")


def observation(name, field, nominal, weights=(1,), radius=F(0), source_scope=None):
    return p.Observation(name, field.block_id, field.scope, source_scope or quantity(), nominal,
                         tuple(weights), radius, "Declared synthetic hard discrepancy bound")


def use(obs, output="score", scale=F(1), offset=F(0)):
    return p.QuantityUse(obs.observation_id, scale, offset, quantity(output, "target-unit"),
                         "Explicit affine target map applied to the complete source quantity")


def fixture(radius=F(1, 4), separate=False):
    fields = [block("field-A", bounds=(Interval(0, 2),))]
    if separate:
        fields.append(block("field-B", bounds=(Interval(0, 2),)))
    left = observation("obs-A", fields[0], 5, radius=radius)
    right = observation("obs-B", fields[-1], 4, radius=radius)
    candidates = (p.ProjectionCandidate("A", context(), use(left), {}),
                  p.ProjectionCandidate("B", context(), use(right), {}))
    return p.ProjectionProblem("projection-independent", quantity("score", "target-unit"), {},
                               tuple(fields), (left, right), candidates,
                               "Synthetic equations only; common-world validity is assumed")


def original_value(obs, field, latent_values, error_value):
    """Evaluate theta first, then model-error subtraction and discrepancy."""
    theta = tuple(F(shift) + sum((F(coefficient)*value for coefficient, value in zip(row, latent_values)), F(0))
                  for shift, row in zip(field.offset, field.matrix))
    return F(obs.nominal) - sum((F(weight)*value for weight, value in zip(obs.weights, theta)), F(0)) \
        + F(obs.discrepancy_radius)*error_value


def affine_value(expression, point):
    return expression.constant + sum((a*z for a, z in zip(expression.coefficients, point)), F(0))


class ProjectionIndependentReview(unittest.TestCase):
    def test_hand_derived_signed_affine_transform(self):
        field = block(offset=(1, -2), matrix=((2, -1), (3, F(1, 2))))
        obs = observation("observation", field, 5, weights=(2, -3), radius=F(2, 3))
        candidate = p.ProjectionCandidate("A", context(), use(obs, scale=-2, offset=7), {})
        value = p.ProjectionProblem("projection-independent", quantity("score", "target-unit"), {},
                                    (field,), (obs,), (candidate,), "synthetic")
        built = p.build_projection(value)
        self.assertIsInstance(built.model, c.CoupledProblem)
        # One block and one observation give two field coordinates and one
        # independent normalized discrepancy coordinate in the declared order.
        self.assertEqual(built.model.candidates[0].score.constant, 13)
        self.assertEqual(built.model.candidates[0].score.coefficients, (F(-10), F(-7), F(-4, 3)))
        for x, y, e in itertools.product((F(-1), F(0), F(1)), repeat=3):
            truth = -2*original_value(obs, field, (x, y), e)+7
            self.assertEqual(affine_value(built.model.candidates[0].score, (x, y, e)), truth)
            AUDIT_COUNTS["source_equation_worlds"] += 1

    def test_independent_discrepancy_gain_tie_and_reversal(self):
        for radius, expected in ((F(1, 4), ("B",)), (F(1, 2), ("A", "B")), (F(3, 4), ("A", "B"))):
            value = fixture(radius)
            result = p.screen_projection(value, (0, 0, 0))
            self.assertEqual(result.retained, expected)
            self.assertEqual(len(result.build.model.latent_ids), 3)
            for z, e_a, e_b in itertools.product((F(0), F(1), F(2)), (F(-1), F(0), F(1)), (F(-1), F(0), F(1))):
                truths = {"A": original_value(value.observations[0], value.blocks[0], (z,), e_a),
                          "B": original_value(value.observations[1], value.blocks[0], (z,), e_b)}
                best = min(truths.values())
                winners = {cid for cid, score in truths.items() if score == best}
                self.assertTrue(winners <= set(result.retained))
                AUDIT_COUNTS["admitted_retention_worlds"] += 1
                if truths["A"] < truths["B"]:
                    AUDIT_COUNTS["reversal_worlds"] += 1

    def test_identical_local_coordinate_names_do_not_share_between_blocks(self):
        value = fixture(F(0), separate=True)
        result = p.screen_projection(value, (0, 0, 0, 0))
        self.assertEqual(result.retained, ("A", "B"))
        self.assertEqual(len(set(result.build.model.latent_ids)), 4)
        # Distinct fields admit A=3 and B=4; collapsing both local z0 names
        # would falsely force B to be better in every modeled world.
        left = original_value(value.observations[0], value.blocks[0], (F(2),), F(0))
        right = original_value(value.observations[1], value.blocks[1], (F(0),), F(0))
        self.assertLess(left, right)
        AUDIT_COUNTS["reversal_worlds"] += 1

    def test_missing_or_empirical_bounds_produce_no_kernel_or_finite_diagnostic(self):
        base = fixture()
        mutations = [replace(base, blocks=(replace(base.blocks[0], latent_bounds=(None,)),)),
                     replace(base, blocks=(replace(base.blocks[0], field_bound_basis="empirical_residual"),)),
                     replace(base, blocks=(replace(base.blocks[0], field_bound_basis="missing"),)),
                     replace(base, blocks=(replace(base.blocks[0], premise_status="unsupported"),)),
                     replace(base, observations=(replace(base.observations[0], discrepancy_radius=None), base.observations[1])),
                     replace(base, observations=(replace(base.observations[0], bound_basis="empirical_residual"), base.observations[1])),
                     replace(base, observations=(replace(base.observations[0], bound_basis="missing"), base.observations[1])),
                     replace(base, observations=(replace(base.observations[0], premise_status="unsupported"), base.observations[1])),
                     replace(base, anchors=(p.ProjectionAnchor("unsupported-anchor", base.observations[0].observation_id,
                             base.observations[0].source_scope, Interval(0, 9), "synthetic", premise_status="unsupported"),)),
                     replace(base, premise_status="unsupported")]
        for value in mutations:
            result = p.screen_projection(value, (0, 0, 0))
            self.assertIsNone(result.build.model)
            self.assertIsNone(result.selection)
            self.assertEqual(result.retained, ("A", "B"))
            self.assertEqual(result.build.retained, ("A", "B"))
            self.assertTrue(result.build.reasons)

    def test_full_physical_context_is_checked_for_each_candidate_use(self):
        base = fixture()
        for physical in (context(material="different"), context(structure="different"),
                         context(conditions="different"), replace(context(), composition_id="different")):
            wrong = replace(base.candidates[0], context=physical)
            with self.assertRaises((ValueError, TypeError)):
                p.build_projection(replace(base, candidates=(wrong, base.candidates[1])))

    def test_metadata_changes_wrapper_identity_without_changing_algebra(self):
        base = fixture()
        original = p.build_projection(base)
        changed = p.build_projection(replace(base, relation_reference="different stated justification"))
        self.assertNotEqual(original.input_digest, changed.input_digest)
        self.assertEqual(original.model, changed.model)
        for annotation in ({"parameterization_reference": "different image premise"},
                           {"field_bound_reference": "different coordinate bound premise"}):
            annotated = replace(base.blocks[0], **annotation)
            changed = p.build_projection(replace(base, blocks=(annotated,)))
            self.assertNotEqual(original.input_digest, changed.input_digest)
            self.assertEqual(original.model, changed.model)

    def test_rectangular_parameterization_and_anchor_rows_match_source_inequalities(self):
        field = block(offset=(1, -2), matrix=((2, -1, 0), (3, F(1, 2), -2)))
        obs = observation("observation", field, 5, weights=(2, -3), radius=F(2, 3))
        candidate = p.ProjectionCandidate("A", context(), use(obs, scale=-2, offset=7), {})
        anchor = p.ProjectionAnchor("source-anchor", obs.observation_id, obs.source_scope,
                                    Interval(F(-10, 3), F(-7, 3)), "Synthetic bounded source reference")
        value = p.ProjectionProblem("projection-independent", quantity("score", "target-unit"), {},
                                    (field,), (obs,), (candidate,), "synthetic", anchors=(anchor,))
        built = p.build_projection(value)
        upper_id, lower_id = built.anchor_rows[anchor.anchor_id]
        row_by_id = {row.row_id: row for row in built.model.rows}
        upper, lower = row_by_id[upper_id], row_by_id[lower_id]
        for point in itertools.product((F(-1), F(0), F(1)), repeat=4):
            truth = original_value(obs, field, point[:3], point[3])
            self.assertEqual(affine_value(built.observation_affines[obs.observation_id], point), truth)
            self.assertEqual(affine_value(built.model.candidates[0].score, point), -2*truth+7)
            self.assertEqual(sum((a*z for a, z in zip(upper.coefficients, point)), F(0)) <= upper.upper,
                             truth <= anchor.interval.upper)
            self.assertEqual(sum((a*z for a, z in zip(lower.coefficients, point)), F(0)) <= lower.upper,
                             anchor.interval.lower <= truth)
            AUDIT_COUNTS["source_equation_worlds"] += 1
            AUDIT_COUNTS["anchor_worlds"] += 1

    def test_contradictory_anchors_do_not_prove_material_universe_empty(self):
        base = fixture(F(0))
        obs = base.observations[0]
        anchors = (p.ProjectionAnchor("first", obs.observation_id, obs.source_scope, Interval(3, 3), "synthetic"),
                   p.ProjectionAnchor("second", obs.observation_id, obs.source_scope, Interval(5, 5), "synthetic"))
        value = replace(base, anchors=anchors)
        built = p.build_projection(value)
        domain = c.make_domain(built.model)
        first_upper, _ = built.anchor_rows["first"]
        _, second_lower = built.anchor_rows["second"]
        contradiction = c.InfeasibilityCertificate(domain.domain_id, {first_upper: F(1), second_lower: F(1)})
        result = p.screen_projection(value, proofs=(contradiction,))
        self.assertEqual(result.status, "proved_inconsistent_all_retained")
        self.assertEqual(result.retained, ("A", "B"))
        self.assertEqual(result.selection.certified_feasible, ())
        self.assertEqual(result.selection.coupled_infeasible, ())

    def test_scope_transfer_and_unknown_sources_reject_before_generation(self):
        base = fixture()
        obs = base.observations[0]
        wrong_scopes = (replace(obs.field_scope, model_version="v2"),
                        replace(obs.field_scope, observation_family="forces"),
                        replace(obs.field_scope, reference_method="other-reference"),
                        replace(obs.field_scope, descriptor_id="other-descriptor"))
        for wrong in wrong_scopes:
            with self.assertRaises(ValueError):
                replace(base, observations=(replace(obs, field_scope=wrong), base.observations[1]))
        for wrong in (replace(obs.source_scope, unit="incompatible-unit"),
                      replace(obs.source_scope, reference="incompatible-reference")):
            anchor = p.ProjectionAnchor("anchor", obs.observation_id, wrong, Interval(0, 1), "synthetic")
            with self.assertRaises(ValueError):
                replace(base, anchors=(anchor,))
        with self.assertRaises(ValueError):
            replace(base, observations=(replace(obs, source_ids=("absent",)), base.observations[1]))

    def test_unused_unavailable_observations_still_close_joint_gate(self):
        base = fixture()
        unused = observation("unused", base.blocks[0], 0, radius=None)
        result = p.screen_projection(replace(base, observations=base.observations+(unused,)), (0, 0, 0, 0))
        self.assertIsNone(result.build.model)
        self.assertEqual(result.retained, ("A", "B"))
        self.assertEqual(dict(result.build.coordinate_map), {})
        self.assertEqual(dict(result.build.observation_affines), {})
        self.assertEqual(dict(result.build.anchor_rows), {})
        unused_field = replace(block("unused-field"), field_bound_basis="missing")
        result = p.screen_projection(replace(base, blocks=base.blocks+(unused_field,)))
        self.assertIsNone(result.build.model)
        self.assertEqual(result.retained, ("A", "B"))

    def test_separator_characters_cannot_merge_distinct_coordinates(self):
        fields = (replace(block("a:b", bounds=(Interval(0, 2),)), latent_ids=("c",)),
                  replace(block("a", bounds=(Interval(0, 2),)), latent_ids=("b:c",)))
        observations = (observation("one", fields[0], 5), observation("two", fields[1], 4))
        candidates = tuple(p.ProjectionCandidate(name, context(), use(obs), {})
                           for name, obs in zip(("A", "B"), observations))
        value = p.ProjectionProblem("projection-independent", quantity("score", "target-unit"), {},
                                    fields, observations, candidates, "synthetic")
        result = p.screen_projection(value, (0, 0, 0, 0))
        self.assertEqual(len(set(result.build.model.latent_ids)), 4)
        self.assertEqual(result.retained, ("A", "B"))

    def test_reusing_one_observation_preserves_the_same_scalar_in_both_targets(self):
        field = block()
        obs = observation("shared-scalar", field, 0, radius=F(1))
        candidate = p.ProjectionCandidate("A", context(), use(obs), {"g": use(obs, "g", scale=-1)})
        value = p.ProjectionProblem("projection-independent", quantity("score", "target-unit"),
                                    {"g": quantity("g", "target-unit")}, (field,), (obs,), (candidate,), "synthetic")
        built = p.build_projection(value)
        self.assertEqual(len(built.model.latent_ids), 2)
        row = built.model.candidates[0]
        for z, e in itertools.product((F(-1), F(0), F(1)), repeat=2):
            truth = original_value(obs, field, (z,), e)
            self.assertEqual(affine_value(row.score, (z, e)), truth)
            self.assertEqual(affine_value(row.constraints["g"], (z, e)), -truth)
            AUDIT_COUNTS["source_equation_worlds"] += 1

    def test_empty_parameter_spaces_and_constant_target_maps(self):
        field = block(offset=(), matrix=())
        obs = observation("constant", field, 17, weights=(), radius=F(0))
        candidate = p.ProjectionCandidate("constant-candidate", context(), use(obs, scale=0, offset=7), {})
        value = p.ProjectionProblem("projection-independent", quantity("score", "target-unit"), {},
                                    (field,), (obs,), (candidate,), "synthetic")
        built = p.build_projection(value)
        self.assertEqual(len(built.model.latent_ids), 1)  # Explicit zero-radius discrepancy still exists.
        self.assertEqual(built.model.candidates[0].score.constant, 7)
        self.assertEqual(built.model.candidates[0].score.coefficients, (F(0),))
        self.assertEqual(p.screen_projection(value, (0,)).retained, ("constant-candidate",))
        empty = replace(value, candidates=(), observations=(), blocks=())
        self.assertEqual(p.screen_projection(empty, ()).retained, ())

    def test_source_metadata_is_bound_and_generated_records_are_immutable(self):
        base = fixture()
        source = p.SourceIdentity("source", "synthetic source", "urn:synthetic:source", "a"*64)
        original = p.build_projection(replace(base, sources=(source,)))
        changed = p.build_projection(replace(base, sources=(replace(source, sha256="b"*64),)))
        self.assertNotEqual(original.input_digest, changed.input_digest)
        self.assertNotEqual(original.relation_digest, changed.relation_digest)
        self.assertEqual(original.model, changed.model)
        for mapping in (original.relation_record, original.relation_record["declarations"],
                        original.coordinate_map, next(iter(original.coordinate_map.values())),
                        original.observation_affines, original.anchor_rows):
            with self.assertRaises(TypeError):
                mapping["tampering"] = 1

    def test_varied_models_preserve_direct_equation_minimizers_in_5832_worlds(self):
        rng = random.Random(11931)
        grid = (F(-1), F(0), F(1))
        for _ in range(8):
            field = block(offset=tuple(F(rng.randrange(-3, 4), 2) for _ in range(2)),
                          matrix=tuple(tuple(F(rng.randrange(-3, 4), 2) for _ in range(2)) for _ in range(2)))
            observations = tuple(observation("obs-"+name, field, F(rng.randrange(-4, 5), 2),
                                              weights=tuple(F(rng.randrange(-3, 4), 2) for _ in range(2)),
                                              radius=F(rng.randrange(0, 4), 4)) for name in ("A", "B", "C", "G"))
            candidates = tuple(p.ProjectionCandidate(name, context(),
                                use(observations[index], scale=(-1 if index == 1 else 1), offset=F(index, 3)),
                                {"g": use(observations[3], output="g", scale=(-1 if index == 1 else 1), offset=F(-index, 2))})
                               for index, name in enumerate(("A", "B", "C")))
            value = p.ProjectionProblem("projection-independent", quantity("score", "target-unit"),
                                        {"g": quantity("g", "target-unit")}, (field,), observations, candidates, "synthetic")
            result = p.screen_projection(value, (0,)*6)
            self.assertEqual(result.selection.consistency.status, "verified")
            generated = {row.candidate_id: row for row in result.build.model.candidates}
            for point in itertools.product(grid, repeat=6):
                original = {obs.observation_id: original_value(obs, field, point[:2], point[2+i])
                            for i, obs in enumerate(observations)}
                feasible = {}
                for candidate in candidates:
                    score = F(candidate.score.scale)*original[candidate.score.observation_id]+F(candidate.score.offset)
                    constraint_use = candidate.constraints["g"]
                    margin = F(constraint_use.scale)*original[constraint_use.observation_id]+F(constraint_use.offset)
                    self.assertEqual(affine_value(generated[candidate.candidate_id].score, point), score)
                    self.assertEqual(affine_value(generated[candidate.candidate_id].constraints["g"], point), margin)
                    if margin <= 0:
                        feasible[candidate.candidate_id] = score
                if feasible:
                    best = min(feasible.values())
                    self.assertTrue({cid for cid, score in feasible.items() if score == best} <= set(result.retained))
                AUDIT_COUNTS["source_equation_worlds"] += 1
                AUDIT_COUNTS["admitted_retention_worlds"] += 1
            AUDIT_COUNTS["varied_problem_count"] += 1


if __name__ == "__main__":
    unittest.main()
