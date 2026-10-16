"""Strict projection wrapper preserving original declarations and decision seals."""
from copy import deepcopy
from dataclasses import dataclass
from fractions import Fraction

from . import __version__
from .core import Interval
from .coupled import Limits
from .coupled_io import (
    WORK_CEILINGS, _Numbers, _array, _checksum, _object, _preflight_value, _text,
    coupled_certificate, coupled_replay_report, loads_coupled,
)
from .evidence import Scope, digest, fields
from .projection import (
    FieldBlock, FieldScope, Observation, PhysicalContext, ProjectionAnchor,
    ProjectionCandidate, ProjectionProblem, QuantityUse, SourceIdentity, build_projection,
)
from .serialization import encode


PROBLEM_SCHEMA = 'lupine.discovery.projection_problem.v1'
OUTCOMES_SCHEMA = 'lupine.discovery.projection_outcomes.v1'
PROFILE_ID = 'projection-local-v1'
ADAPTER_VERSION = 'projection-adapter-v1'
_CONTEXT = ('scenario_id', 'material_id', 'composition_id', 'structure_id', 'operating_conditions_id')
_FIELD_SCOPE = ('context', 'model_id', 'model_version', 'observation_family', 'reference_method', 'descriptor_id')
_SCOPE = ('scenario_id', 'quantity', 'unit', 'reference')
_PROJECTION = ('scenario_id', 'objective_scope', 'constraint_scopes', 'blocks', 'observations', 'candidates',
               'relation_reference', 'anchors', 'sources', 'premise_status')
_BLOCK = ('block_id', 'scope', 'parameter_ids', 'parameter_units', 'offset', 'matrix', 'latent_ids',
          'latent_bounds', 'parameterization_reference', 'field_bound_reference', 'source_ids',
          'premise_status', 'field_bound_basis')
_OBSERVATION = ('observation_id', 'block_id', 'field_scope', 'source_scope', 'nominal', 'weights',
                'discrepancy_radius', 'bound_reference', 'source_ids', 'bound_basis', 'premise_status')
_USE = ('observation_id', 'scale', 'offset', 'output_scope', 'conversion_reference', 'source_ids')
_ANCHOR = ('anchor_id', 'observation_id', 'source_scope', 'interval', 'reference', 'source_ids', 'premise_status')


def loads_projection(raw):
    """Projection uses the coupled wire's bounded exact JSON lexical profile."""
    return loads_coupled(raw)


def _id(value, label):
    return _text(value, label, 40)


def _ids(value, label, maximum):
    _array(value, label, maximum)
    for item in value:
        _id(item, label)
    if len(set(value)) != len(value):
        raise ValueError(f'duplicate {label}')


def _scope_shape(value):
    fields(value, _SCOPE)
    for key in _SCOPE:
        _text(value[key], f'quantity scope {key}', 2048 if key == 'reference' else 128)


def _context_shape(value):
    fields(value, _CONTEXT)
    for key in _CONTEXT:
        _text(value[key], f'physical context {key}')


def _field_scope_shape(value):
    fields(value, _FIELD_SCOPE)
    _context_shape(value['context'])
    for key in _FIELD_SCOPE[1:]:
        _text(value[key], f'field scope {key}')


def _premise(value):
    if value not in ('assumed_unverified', 'unsupported'):
        raise ValueError('projection premise must remain assumed_unverified or unsupported')


def _basis(value):
    if value not in ('declared_bound', 'empirical_residual', 'missing'):
        raise ValueError('bound basis must be declared_bound, empirical_residual, or missing')


def _interval_shape(value, numbers):
    _array(value, 'interval', 2)
    if len(value) != 2:
        raise ValueError('interval requires exactly two endpoints')
    for scalar in value:
        numbers.token(scalar)


def _use_shape(value, numbers):
    fields(value, _USE)
    _id(value['observation_id'], 'observation ID')
    numbers.token(value['scale'])
    numbers.token(value['offset'])
    _scope_shape(value['output_scope'])
    _text(value['conversion_reference'], 'conversion reference', 2048)
    _ids(value['source_ids'], 'source ID', 128)


def _scope(value):
    return Scope(**value)


def _field_scope(value):
    return FieldScope(PhysicalContext(**value['context']), **{key: value[key] for key in _FIELD_SCOPE[1:]})


@dataclass(frozen=True)
class ParsedProjectionProblem:
    problem: ProjectionProblem
    wire: dict
    problem_digest: str
    generated_dimension: int
    consistency_point: tuple[Fraction, ...] | None
    limits: Limits


def parse_projection_problem(value):
    _preflight_value(value)
    fields(value, ('schema', 'projection', 'screening'), ('description',))
    if value['schema'] != PROBLEM_SCHEMA:
        raise ValueError('unsupported projection problem schema')
    if 'description' in value and type(value['description']) is not str:
        raise ValueError('description must be a string')
    source = value['projection']
    fields(source, _PROJECTION)
    _text(source['scenario_id'], 'scenario ID')
    _text(source['relation_reference'], 'joint relation reference', 2048)
    _premise(source['premise_status'])
    _scope_shape(source['objective_scope'])
    constraints = _object(source['constraint_scopes'], 'constraint scopes', 8)
    for key, scope in constraints.items():
        _id(key, 'constraint ID')
        _scope_shape(scope)
    blocks = _array(source['blocks'], 'field blocks', 16)
    observations = _array(source['observations'], 'observations', 16)
    candidates = _array(source['candidates'], 'candidates', 64)
    anchors = _array(source['anchors'], 'anchors', 32)
    sources = _array(source['sources'], 'source identities', 128)
    # Inspect expansion sizes before exact scalar conversion or adapter records.
    dimension = len(observations)
    for block in blocks:
        fields(block, _BLOCK)
        _array(block['latent_ids'], 'local latent IDs', 16)
        dimension += len(block['latent_ids'])
    if dimension > 16:
        raise ValueError('expanded projection latent dimension exceeds 16')
    if 2 * len(anchors) > 64:
        raise ValueError('expanded projection anchor row count exceeds 64')
    numbers, block_dimensions = _Numbers(), {}
    for block in blocks:
        bid = _id(block['block_id'], 'block ID')
        if bid in block_dimensions:
            raise ValueError('duplicate field block ID')
        _field_scope_shape(block['scope'])
        _ids(block['parameter_ids'], 'parameter ID', 16)
        _ids(block['latent_ids'], 'local latent ID', 16)
        parameter_count, local_count = len(block['parameter_ids']), len(block['latent_ids'])
        block_dimensions[bid] = parameter_count
        units = _array(block['parameter_units'], 'parameter units', 16)
        if len(units) != parameter_count:
            raise ValueError('parameter unit count mismatch')
        for unit in units:
            _text(unit, 'parameter unit')
        numbers.vector(block['offset'], parameter_count)
        matrix = _array(block['matrix'], 'normalization matrix', 16)
        if len(matrix) != parameter_count:
            raise ValueError('normalization matrix row count mismatch')
        for row in matrix:
            numbers.vector(row, local_count)
        bounds = _array(block['latent_bounds'], 'latent bounds', 16)
        if len(bounds) != local_count:
            raise ValueError('latent bound count mismatch')
        for bound in bounds:
            if bound is not None:
                _interval_shape(bound, numbers)
        _text(block['parameterization_reference'], 'common-image reference', 2048)
        _text(block['field_bound_reference'], 'field enclosure reference', 2048)
        _ids(block['source_ids'], 'source ID', 128)
        _premise(block['premise_status'])
        _basis(block['field_bound_basis'])
    for observation in observations:
        fields(observation, _OBSERVATION)
        _id(observation['observation_id'], 'observation ID')
        bid = _id(observation['block_id'], 'block ID')
        if bid not in block_dimensions:
            raise ValueError('observation references an unknown field block')
        _field_scope_shape(observation['field_scope'])
        _scope_shape(observation['source_scope'])
        numbers.token(observation['nominal'])
        numbers.vector(observation['weights'], block_dimensions[bid])
        if observation['discrepancy_radius'] is not None:
            numbers.token(observation['discrepancy_radius'])
        _text(observation['bound_reference'], 'discrepancy bound reference', 2048)
        _ids(observation['source_ids'], 'source ID', 128)
        _basis(observation['bound_basis'])
        _premise(observation['premise_status'])
    for candidate in candidates:
        fields(candidate, ('candidate_id', 'context', 'score', 'constraints'))
        _id(candidate['candidate_id'], 'candidate ID')
        _context_shape(candidate['context'])
        _use_shape(candidate['score'], numbers)
        uses = _object(candidate['constraints'], 'candidate constraint uses', 8)
        if set(uses) != set(constraints):
            raise ValueError('candidate constraints differ from output scope keys')
        for key, use in uses.items():
            _id(key, 'constraint ID')
            _use_shape(use, numbers)
    for anchor in anchors:
        fields(anchor, _ANCHOR)
        _id(anchor['anchor_id'], 'anchor ID')
        _id(anchor['observation_id'], 'observation ID')
        _scope_shape(anchor['source_scope'])
        _interval_shape(anchor['interval'], numbers)
        _text(anchor['reference'], 'anchor reference', 2048)
        _ids(anchor['source_ids'], 'source ID', 128)
        _premise(anchor['premise_status'])
    for identity in sources:
        fields(identity, ('source_id', 'reference', 'source_uri', 'sha256'))
        _id(identity['source_id'], 'source ID')
        _text(identity['reference'], 'source reference', 2048)
        _text(identity['source_uri'], 'source URI', 2048)
        if identity['sha256'] is not None:
            _checksum(identity['sha256'], 'source digest')
    screening = value['screening']
    fields(screening, ('consistency_point', 'proofs', 'limits'))
    if type(screening['proofs']) is not list or screening['proofs']:
        raise ValueError('projection v1 requires proofs=[]; supplied proof ingestion is unsupported')
    if screening['consistency_point'] is not None:
        numbers.vector(screening['consistency_point'], dimension)
    fields(screening['limits'], WORK_CEILINGS)
    for name, ceiling in WORK_CEILINGS.items():
        count = screening['limits'][name]
        if type(count) is not int or not 0 <= count <= ceiling:
            raise ValueError(f'{name} must be an integer between 0 and {ceiling}')
    numbers.convert()
    def interval(value):
        return Interval(*(numbers.get(v) for v in value))
    def use(value):
        return QuantityUse(value['observation_id'], numbers.get(value['scale']), numbers.get(value['offset']),
                           _scope(value['output_scope']), value['conversion_reference'], tuple(value['source_ids']))
    parsed_blocks = tuple(FieldBlock(block_id=row['block_id'], scope=_field_scope(row['scope']),
        parameter_ids=tuple(row['parameter_ids']), parameter_units=tuple(row['parameter_units']),
        offset=tuple(numbers.get(v) for v in row['offset']),
        matrix=tuple(tuple(numbers.get(v) for v in matrix_row) for matrix_row in row['matrix']),
        latent_ids=tuple(row['latent_ids']), latent_bounds=tuple(None if v is None else interval(v) for v in row['latent_bounds']),
        parameterization_reference=row['parameterization_reference'], field_bound_reference=row['field_bound_reference'],
        source_ids=tuple(row['source_ids']), premise_status=row['premise_status'], field_bound_basis=row['field_bound_basis']) for row in blocks)
    parsed_observations = tuple(Observation(row['observation_id'], row['block_id'], _field_scope(row['field_scope']),
        _scope(row['source_scope']), numbers.get(row['nominal']), tuple(numbers.get(v) for v in row['weights']),
        None if row['discrepancy_radius'] is None else numbers.get(row['discrepancy_radius']), row['bound_reference'],
        tuple(row['source_ids']), row['bound_basis'], row['premise_status']) for row in observations)
    parsed_candidates = tuple(ProjectionCandidate(row['candidate_id'], PhysicalContext(**row['context']), use(row['score']),
        {key: use(v) for key, v in row['constraints'].items()}) for row in candidates)
    parsed_anchors = tuple(ProjectionAnchor(row['anchor_id'], row['observation_id'], _scope(row['source_scope']),
        interval(row['interval']), row['reference'], tuple(row['source_ids']), row['premise_status']) for row in anchors)
    problem = ProjectionProblem(source['scenario_id'], _scope(source['objective_scope']),
        {key: _scope(v) for key, v in constraints.items()}, parsed_blocks, parsed_observations, parsed_candidates,
        source['relation_reference'], parsed_anchors, tuple(SourceIdentity(**row) for row in sources), source['premise_status'])
    point = screening['consistency_point']
    return ParsedProjectionProblem(problem, deepcopy(value), digest(value), dimension,
                                   None if point is None else tuple(numbers.get(v) for v in point),
                                   Limits(**screening['limits']))


def _prepare_coupled(parsed, build):
    model = build.model
    reference = f'projection_relation:{build.relation_digest}'
    anchors = {row.anchor_id: row for row in parsed.problem.anchors}
    row_anchors = {row_id: anchors[anchor_id] for anchor_id, row_ids in build.anchor_rows.items() for row_id in row_ids}
    return encode({
        'schema': 'lupine.discovery.coupled_problem.v1',
        'scenario': {'id': model.scenario_id,
                     'objective': {'unit': model.objective_scope.unit, 'reference': model.objective_scope.reference, 'direction': 'minimize'},
                     'constraints': {key: {'unit': scope.unit, 'reference': scope.reference} for key, scope in model.constraint_scopes.items()}},
        'latent_variables': [{'id': lid, 'bounds': [bound.lower, bound.upper], 'unit': '1',
                              'reference': f'{reference};coordinate:{index}'}
                             for index, (lid, bound) in enumerate(zip(model.latent_ids, model.latent_bounds))],
        'candidates': [{'id': row.candidate_id, 'score': row.score, 'constraints': row.constraints} for row in model.candidates],
        'rows': [{'id': row.row_id, 'coefficients': row.coefficients, 'upper': row.upper,
                  'unit': row_anchors[row.row_id].source_scope.unit,
                  'reference': f'{reference};anchor:{row_anchors[row.row_id].anchor_id}'} for row in model.rows],
        'common_world': {'claim': 'one_common_latent_vector_represents_all_quantities',
                         'premise_status': 'assumed_unverified', 'relation_basis': 'bounded_error_model', 'reference': reference},
        'screening': {'consistency_point': deepcopy(parsed.wire['screening']['consistency_point']),
                      'proofs': [], 'limits': deepcopy(parsed.wire['screening']['limits'])},
    })


def _selection_receipt(parsed):
    build = build_projection(parsed.problem)
    prepared, nested = None, None
    if build.model is not None:
        prepared = _prepare_coupled(parsed, build)
        # The generated exact values must satisfy the full coupled input profile.
        # Oversized derived values are rejected, never rounded or clamped.
        nested = coupled_certificate(prepared)
        if nested['model_identity']['kernel_model_digest'] != build.relation_record['kernel_model_digest']:
            raise ValueError('prepared coupled wire differs from the generated projection model')
        selection = nested['selection']
        status = nested['coupling']['status']
        operations = nested['execution']['kernel_operations_used']
    else:
        selection = {'retained': build.candidate_ids, 'certified_feasible': (), 'interval_infeasible': (),
                     'interval_dominated': (), 'coupled_infeasible': (), 'coupled_dominated': (), 'dominance_witnesses': {}}
        status, operations = build.status, 0
    payload = encode({
        'schema': 'lupine.discovery.projection_certificate.v1', 'engine_version': __version__,
        'adapter_version': ADAPTER_VERSION, 'profile_id': PROFILE_ID,
        'scenario_id': parsed.problem.scenario_id, 'problem_digest': parsed.problem_digest,
        'projection': {'build_status': build.status, 'input_digest': build.input_digest,
                       'relation_digest': build.relation_digest, 'relation_record': build.relation_record, 'reasons': build.reasons},
        'prepared_problem': prepared, 'coupled_certificate': nested, 'selection': selection, 'status': status,
        'execution': {'requested_limits': parsed.wire['screening']['limits'], 'effective_limits': parsed.limits,
                      'kernel_operations_used': operations},
        'assumptions': [
            'The declared fields, all observations, anchors and discrepancy enclosures admit one common actual latent world.',
            'Parameterization image coverage and normalized-coordinate enclosures are separate assumed premises.',
            'Physical context, source scopes, unit references and complete signed quantity maps match the stated problem.',
            'All exactly tied feasible minimizers of the finite candidate universe are retained under those premises.',
            'Conservative screening is incomplete; retained candidates need not have a possible or robust optimum certificate.',
        ],
        'physical_attestation': 'not_established_by_this_program',
    })
    return {**payload, 'certificate_digest': digest(payload)}


def projection_certificate(value):
    return _selection_receipt(parse_projection_problem(value))


@dataclass(frozen=True)
class ProjectionTruth:
    rows: dict
    latent_point: tuple[Fraction, ...] | None


def parse_projection_outcomes(value, parsed, problem_digest, certificate_digest):
    _preflight_value(value)
    fields(value, ('schema', 'scenario_id', 'problem_digest', 'certificate_digest', 'outcomes'), ('latent_world',))
    if value['schema'] != OUTCOMES_SCHEMA:
        raise ValueError('unsupported projection outcomes schema')
    if not isinstance(parsed, ParsedProjectionProblem):
        raise TypeError('expected ParsedProjectionProblem')
    _checksum(value['problem_digest'], 'problem digest')
    _checksum(value['certificate_digest'], 'certificate digest')
    if (value['scenario_id'] != parsed.problem.scenario_id or value['problem_digest'] != problem_digest
            or value['certificate_digest'] != certificate_digest):
        raise ValueError('outcomes do not match the sealed original projection decision')
    records = _array(value['outcomes'], 'outcomes', 64)
    universe = {row.candidate_id for row in parsed.problem.candidates}
    numbers, seen = _Numbers(), set()
    for row in records:
        fields(row, ('id', 'score', 'constraints'))
        cid = _id(row['id'], 'outcome candidate ID')
        if cid in seen or cid not in universe:
            raise ValueError('unknown or duplicate outcome candidate ID')
        seen.add(cid)
        _object(row['constraints'], 'outcome constraints', 8)
        if set(row['constraints']) - set(parsed.problem.constraint_scopes):
            raise ValueError('unknown outcome constraint quantity')
        for scalar in (row['score'], *row['constraints'].values()):
            if scalar is not None:
                numbers.token(scalar)
    point = None
    if 'latent_world' in value:
        fields(value['latent_world'], ('kind', 'point'))
        if value['latent_world']['kind'] != 'hypothetical_model_world':
            raise ValueError('latent world must be explicitly hypothetical')
        point = value['latent_world']['point']
        numbers.vector(point, parsed.generated_dimension)
    numbers.convert()
    return ProjectionTruth({row['id']: {'score': None if row['score'] is None else numbers.get(row['score']),
        'constraints': {key: None if scalar is None else numbers.get(scalar) for key, scalar in row['constraints'].items()}}
        for row in records}, None if point is None else tuple(numbers.get(v) for v in point))


def _no_model_audit(parsed, truth, receipt):
    """Only original identifiers, quantity keys, and reported truth enter here."""
    retained = set(receipt['selection']['retained'])
    checks, feasible_scores = {}, {}
    for candidate in parsed.problem.candidates:
        cid = candidate.candidate_id
        row = truth.rows.get(cid, {'score': None, 'constraints': {}})
        constraints = row['constraints']
        constraints_complete = all(constraints.get(key) is not None for key in candidate.constraints)
        feasible = (False if any(v is not None and v > 0 for v in constraints.values()) else
                    True if constraints_complete else None)
        score_observed = row['score'] is not None
        if feasible is True and score_observed:
            feasible_scores[cid] = row['score']
        checks[cid] = {'true_feasible': feasible, 'truth_complete': constraints_complete and score_observed,
                       'score_observed': score_observed, 'constraint_values_observed': sum(v is not None for v in constraints.values()),
                       'retained': cid in retained}
    complete = all(row['truth_complete'] for row in checks.values())
    optimum = min(feasible_scores.values()) if complete and feasible_scores else None
    minimizers = sorted(cid for cid, score in feasible_scores.items() if score == optimum) if optimum is not None else None
    kept = sorted(set(minimizers) & retained) if minimizers is not None else None
    lost = sorted(set(minimizers) - retained) if minimizers is not None else None
    all_retained = not lost if lost is not None else None
    return {'outcome_completeness': 'complete' if complete else 'partial',
            'universe_count': len(checks), 'complete_candidate_count': sum(row['truth_complete'] for row in checks.values()),
            'missing_truth_ids': [cid for cid, row in checks.items() if not row['truth_complete']],
            'per_candidate': checks, 'true_feasible_optimum': optimum, 'true_minimizer_ids': minimizers,
            'retained_optimum_ids': kept, 'lost_optimum_ids': lost, 'all_true_minimizers_retained': all_retained,
            'retention_status': ('refuted_on_complete_reported_values' if all_retained is False else
                                 'holds_on_complete_reported_values' if all_retained is True else
                                 'not_evaluated_empty_universe' if not checks else
                                 'undefined_no_feasible_candidate' if complete else 'unresolved_missing_outcomes'),
            'infeasibility_exclusion_correctness': {},
            'excluded_optimum_correctness': {} if minimizers is not None else None,
            'pool_fraction': Fraction(len(retained), len(checks)) if checks else None,
            'scientific_validity': 'unestablished'}


def projection_replay_report(value, outcome_value_or_loader):
    parsed = parse_projection_problem(value)
    receipt = _selection_receipt(parsed)
    outcomes = outcome_value_or_loader() if callable(outcome_value_or_loader) else outcome_value_or_loader
    truth = parse_projection_outcomes(outcomes, parsed, receipt['problem_digest'], receipt['certificate_digest'])
    if receipt['prepared_problem'] is not None:
        nested_receipt = receipt['coupled_certificate']
        inner = {'schema': 'lupine.discovery.coupled_outcomes.v1', 'scenario_id': parsed.problem.scenario_id,
                 'problem_digest': nested_receipt['problem_digest'], 'certificate_digest': nested_receipt['certificate_digest'],
                 'outcomes': deepcopy(outcomes['outcomes'])}
        if 'latent_world' in outcomes:
            inner['latent_world'] = deepcopy(outcomes['latent_world'])
        nested_report = coupled_replay_report(receipt['prepared_problem'], inner)
        if digest(nested_report['decision']['certificate']) != digest(nested_receipt):
            raise ValueError('nested coupled decision changed during replay')
        audit, world, diagnostics = (nested_report[key] for key in ('outcome_audit', 'provided_world_audit', 'diagnostics'))
    else:
        audit = _no_model_audit(parsed, truth, receipt)
        world = {'status': 'unavailable_no_prepared_model', 'point_supplied': truth.latent_point is not None,
                 'all_quantities_reported': audit['outcome_completeness'] == 'complete',
                 'checked_quantity_count': 0, 'point_check': None, 'mismatches': [],
                 'common_world_existence': 'not_evaluated_no_prepared_model', 'scientific_validity': 'unestablished'}
        diagnostics = {'marginal_coverage': {'status': 'unavailable_no_prepared_model', 'per_candidate': {},
                        'score_coverage': None, 'constraint_coverage': None, 'common_world_validity': 'not_established'},
                       'box_selection_diagnostic': None}
    payload = encode({'schema': 'lupine.discovery.projection_replay.v1', 'engine_version': __version__,
        'problem_digest': receipt['problem_digest'], 'certificate_digest': receipt['certificate_digest'],
        'outcomes_digest': digest(outcomes), 'decision': {'certificate': receipt, 'selection': receipt['selection']},
        'outcome_audit': audit, 'provided_world_audit': world, 'diagnostics': diagnostics,
        'physical_attestation': 'not_established_by_this_program'})
    return {**payload, 'replay_digest': digest(payload)}
