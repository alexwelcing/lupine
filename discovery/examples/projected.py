"""Run a scoped, entirely synthetic correction-field example.

From discovery/ after installation: python examples/projected.py
The output is a Python-API demonstration report, not a workbench input schema.
No two physical materials are assumed to share a field: the hypothetical
observation options A and B belong to one explicitly declared synthetic context.
"""
from dataclasses import replace
from fractions import Fraction
import json

from lupine_discovery.core import Interval
from lupine_discovery.evidence import Scope
from lupine_discovery.projection import (
    FieldBlock, FieldScope, Observation, PhysicalContext, ProjectionAnchor,
    ProjectionCandidate, ProjectionProblem, QuantityUse, SourceIdentity,
    build_projection, screen_projection,
)
from lupine_discovery.serialization import encode


def example_problem(radius=Fraction(1, 4)):
    scenario = 'synthetic-projection-options'
    context = PhysicalContext(scenario, 'synthetic-system', 'synthetic-composition',
                              'fixed-synthetic-structure', 'fixed-synthetic-conditions')
    field_scope = FieldScope(context, 'synthetic-model', '1', 'synthetic-observations',
                             'constructed-reference', 'one-fixed-coordinate')
    source = SourceIdentity('declared-example', 'Constructed equations, not physical evidence',
                            'urn:lupine:synthetic:projection-options:v1')
    source_ids = (source.source_id,)
    block = FieldBlock(
        block_id='shared-within-context', scope=field_scope,
        parameter_ids=('theta',), parameter_units=('synthetic-score-unit',),
        offset=(1,), matrix=((1,),), latent_ids=('z',), latent_bounds=(Interval(-1, 1),),
        parameterization_reference='Declared common-image relation theta = 1 + z',
        field_bound_reference='The constructed example assumes -1 <= z <= 1',
        source_ids=source_ids,
    )
    source_scope = Scope(scenario, 'source-value', 'synthetic-score-unit', 'constructed quantity')
    score_scope = Scope(scenario, 'score', 'synthetic-score-unit', 'minimize constructed value')
    observations = tuple(
        Observation(name, block.block_id, field_scope, source_scope, nominal, (1,), error_radius,
                    'Declared enclosure for this constructed observation', source_ids)
        for name, nominal, error_radius in (('A-value', 5, radius), ('B-value', 4, radius),
                                           ('anchor-value', 3, 0))
    )
    candidates = tuple(
        ProjectionCandidate(name, context,
                            QuantityUse(name + '-value', 1, 0, score_scope,
                                        'Identity target map applied to the entire expression', source_ids), {})
        for name in ('A', 'B')
    )
    anchor = ProjectionAnchor('uncertain-anchor', 'anchor-value', source_scope, Interval(1, 3),
                              'Constructed reference interval with zero declared discrepancy', source_ids)
    return ProjectionProblem(
        scenario, score_scope, {}, (block,), observations, candidates,
        'One common synthetic field plus separately bounded observation discrepancies',
        (anchor,), (source,),
    )


def run():
    bounded = example_problem()
    tie = example_problem(Fraction(1, 2))
    missing = replace(bounded, blocks=(replace(bounded.blocks[0], latent_bounds=(None,)),))
    inconsistent = replace(bounded, anchors=(
        replace(bounded.anchors[0], anchor_id='reference-one', interval=Interval(1, 1)),
        replace(bounded.anchors[0], anchor_id='reference-two', interval=Interval(2, 2)),
    ))
    summaries = {}
    for label, problem in (('bounded', bounded), ('tie', tie), ('missing_bound', missing),
                           ('inconsistent_anchors', inconsistent)):
        built = build_projection(problem)
        point = None if built.model is None else [Fraction(0)] * len(built.model.latent_ids)
        if label == 'tie':
            # theta=0, e_A=-1, e_B=1 gives A=B=9/2 with radius 1/2.
            for info in built.coordinate_map.values():
                if info['kind'] == 'field':
                    point[info['index']] = -1
                elif info['observation_id'] == 'A-value':
                    point[info['index']] = -1
                elif info['observation_id'] == 'B-value':
                    point[info['index']] = 1
        result = screen_projection(problem, point)
        summary = {
            'status': result.status, 'retained': result.retained,
            'input_digest': built.input_digest, 'relation_digest': built.relation_digest,
            'model_available': built.model is not None, 'reasons': built.reasons,
            'diagnostic_box_retained': None if result.selection is None else
                result.selection.box_selection_diagnostic.retained,
        }
        if label == 'bounded':
            assert result.retained == ('B',)
            summary['verified_difference_upper'] = result.selection.exclusion_certificates['A'].improvement.upper
            assert summary['verified_difference_upper'] == Fraction(-1, 2)
        else:
            assert result.retained == ('A', 'B')
        if label == 'tie':
            summary['constructed_scores'] = {row.candidate_id: row.score.evaluate(point)
                                             for row in built.model.candidates}
            assert set(summary['constructed_scores'].values()) == {Fraction(9, 2)}
        if label == 'missing_bound':
            assert built.model is None and result.selection is None
        summaries[label] = summary
    return encode({
        'schema': 'lupine.discovery.projection_example.v1',
        'scope': 'Constructed algebra and failure controls; no scientific measurement or prediction',
        'cases': summaries,
        'bounded_relation': build_projection(bounded).relation_record,
    })


if __name__ == '__main__':
    print(json.dumps(run(), indent=2, sort_keys=True))
