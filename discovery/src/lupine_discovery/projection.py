"""Exact correction-field translation under explicit scoped assumptions.

No field is fitted, no bound is learned, and no physical premise is verified.
Unavailable bounds produce no numerical kernel model and retain all candidates.
"""
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from fractions import Fraction
import re
from types import MappingProxyType

from .core import Interval, exact
from .coupled import Affine, CoupledCandidate, CoupledProblem, CoupledSelection, Limits, LinearRow, screen_coupled
from .evidence import Scope, digest, nonempty
from .serialization import encode


def _sequence(value, label):
    if not isinstance(value, Sequence) or isinstance(value, (str, bytes, bytearray)):
        raise TypeError(f'{label} must be a finite sequence')
    return tuple(value)


def _identifiers(value, label):
    result = _sequence(value, label)
    for item in result:
        nonempty(item, label)
    if len(set(result)) != len(result):
        raise ValueError(f'duplicate {label}')
    return result


def _source_ids(value):
    return tuple(sorted(_identifiers(value, 'source ID')))


def _rational_vector(value, label):
    return tuple(exact(item) for item in _sequence(value, label))


def _scope(value):
    if not isinstance(value, Scope):
        raise TypeError('quantity scope must be Scope')
    for label in ('scenario_id', 'quantity', 'unit', 'reference'):
        nonempty(getattr(value, label), f'scope {label}')
    return value


def _premise(value):
    if value not in ('assumed_unverified', 'unsupported'):
        raise ValueError('premise must remain assumed_unverified or unsupported')


def _mapping(value, label):
    if not isinstance(value, Mapping):
        raise TypeError(f'{label} must be a mapping')
    for key in value:
        nonempty(key, f'{label} key')
    return {key: value[key] for key in sorted(value)}


def _freeze(value):
    if isinstance(value, Mapping):
        return MappingProxyType({key: _freeze(item) for key, item in value.items()})
    if isinstance(value, (list, tuple)):
        return tuple(_freeze(item) for item in value)
    return value


@dataclass(frozen=True)
class PhysicalContext:
    scenario_id: str
    material_id: str
    composition_id: str
    structure_id: str
    operating_conditions_id: str

    def __post_init__(self):
        for name in ('scenario_id', 'material_id', 'composition_id', 'structure_id', 'operating_conditions_id'):
            nonempty(getattr(self, name), name)


@dataclass(frozen=True)
class FieldScope:
    context: PhysicalContext
    model_id: str
    model_version: str
    observation_family: str
    reference_method: str
    descriptor_id: str

    def __post_init__(self):
        if not isinstance(self.context, PhysicalContext):
            raise TypeError('field scope requires PhysicalContext')
        for name in ('model_id', 'model_version', 'observation_family', 'reference_method', 'descriptor_id'):
            nonempty(getattr(self, name), name)


@dataclass(frozen=True)
class SourceIdentity:
    source_id: str
    reference: str
    source_uri: str
    sha256: str | None = None

    def __post_init__(self):
        for name in ('source_id', 'reference', 'source_uri'):
            nonempty(getattr(self, name), name)
        if self.sha256 is not None and (not isinstance(self.sha256, str) or
                                       re.fullmatch('[0-9a-f]{64}', self.sha256) is None):
            raise ValueError('source sha256 must be a lowercase SHA-256 digest or None')


@dataclass(frozen=True)
class FieldBlock:
    block_id: str
    scope: FieldScope
    parameter_ids: tuple[str, ...]
    parameter_units: tuple[str, ...]
    offset: tuple[Fraction, ...]
    matrix: tuple[tuple[Fraction, ...], ...]
    latent_ids: tuple[str, ...]
    latent_bounds: tuple[Interval | None, ...]
    parameterization_reference: str
    field_bound_reference: str
    source_ids: tuple[str, ...] = ()
    premise_status: str = 'assumed_unverified'
    field_bound_basis: str = 'declared_bound'

    def __post_init__(self):
        nonempty(self.block_id, 'block ID')
        if not isinstance(self.scope, FieldScope):
            raise TypeError('block requires FieldScope')
        parameter_ids = _identifiers(self.parameter_ids, 'field parameter ID')
        units = _sequence(self.parameter_units, 'parameter units')
        for unit in units:
            nonempty(unit, 'parameter unit')
        latent_ids = _identifiers(self.latent_ids, 'local latent ID')
        offset = _rational_vector(self.offset, 'normalization offset')
        matrix = tuple(_rational_vector(row, 'normalization matrix row')
                       for row in _sequence(self.matrix, 'normalization matrix'))
        bounds = _sequence(self.latent_bounds, 'latent bounds')
        if len(units) != len(parameter_ids) or len(offset) != len(parameter_ids) or len(matrix) != len(parameter_ids):
            raise ValueError('one unit, offset, and matrix row are required per field parameter')
        if any(len(row) != len(latent_ids) for row in matrix) or len(bounds) != len(latent_ids):
            raise ValueError('normalization matrix or latent bound dimensions disagree')
        if any(bound is not None and not isinstance(bound, Interval) for bound in bounds):
            raise TypeError('latent bounds must be finite Interval or explicit None')
        nonempty(self.parameterization_reference, 'common-image parameterization reference')
        nonempty(self.field_bound_reference, 'normalized field-coordinate enclosure reference')
        if self.field_bound_basis not in ('declared_bound', 'empirical_residual', 'missing'):
            raise ValueError('unknown normalized field bound basis')
        _premise(self.premise_status)
        for name, value in (('parameter_ids', parameter_ids), ('parameter_units', units), ('offset', offset),
                            ('matrix', matrix), ('latent_ids', latent_ids), ('latent_bounds', bounds)):
            object.__setattr__(self, name, value)
        object.__setattr__(self, 'source_ids', _source_ids(self.source_ids))


@dataclass(frozen=True)
class Observation:
    observation_id: str
    block_id: str
    field_scope: FieldScope
    source_scope: Scope
    nominal: Fraction
    weights: tuple[Fraction, ...]
    discrepancy_radius: Fraction | None
    bound_reference: str
    source_ids: tuple[str, ...] = ()
    bound_basis: str = 'declared_bound'
    premise_status: str = 'assumed_unverified'

    def __post_init__(self):
        nonempty(self.observation_id, 'observation ID')
        nonempty(self.block_id, 'block ID')
        if not isinstance(self.field_scope, FieldScope):
            raise TypeError('observation requires FieldScope')
        _scope(self.source_scope)
        object.__setattr__(self, 'nominal', exact(self.nominal))
        object.__setattr__(self, 'weights', _rational_vector(self.weights, 'observation weights'))
        if self.discrepancy_radius is not None:
            radius = exact(self.discrepancy_radius)
            if radius < 0:
                raise ValueError('discrepancy radius must be nonnegative')
            object.__setattr__(self, 'discrepancy_radius', radius)
        if self.bound_basis not in ('declared_bound', 'empirical_residual', 'missing'):
            raise ValueError('unknown discrepancy bound basis')
        _premise(self.premise_status)
        nonempty(self.bound_reference, 'discrepancy bound reference')
        object.__setattr__(self, 'source_ids', _source_ids(self.source_ids))


@dataclass(frozen=True)
class QuantityUse:
    observation_id: str
    scale: Fraction
    offset: Fraction
    output_scope: Scope
    conversion_reference: str
    source_ids: tuple[str, ...] = ()

    def __post_init__(self):
        nonempty(self.observation_id, 'observation ID')
        object.__setattr__(self, 'scale', exact(self.scale))
        object.__setattr__(self, 'offset', exact(self.offset))
        _scope(self.output_scope)
        nonempty(self.conversion_reference, 'whole-expression conversion reference')
        object.__setattr__(self, 'source_ids', _source_ids(self.source_ids))


@dataclass(frozen=True)
class ProjectionAnchor:
    anchor_id: str
    observation_id: str
    source_scope: Scope
    interval: Interval
    reference: str
    source_ids: tuple[str, ...] = ()
    premise_status: str = 'assumed_unverified'

    def __post_init__(self):
        nonempty(self.anchor_id, 'anchor ID')
        nonempty(self.observation_id, 'observation ID')
        _scope(self.source_scope)
        if not isinstance(self.interval, Interval):
            raise TypeError('anchor interval must be a finite Interval')
        nonempty(self.reference, 'anchor reference')
        _premise(self.premise_status)
        object.__setattr__(self, 'source_ids', _source_ids(self.source_ids))


@dataclass(frozen=True)
class ProjectionCandidate:
    candidate_id: str
    context: PhysicalContext
    score: QuantityUse
    constraints: Mapping[str, QuantityUse]

    def __post_init__(self):
        nonempty(self.candidate_id, 'candidate ID')
        if not isinstance(self.context, PhysicalContext):
            raise TypeError('candidate requires PhysicalContext')
        constraints = _mapping(self.constraints, 'candidate constraints')
        if not isinstance(self.score, QuantityUse) or any(not isinstance(v, QuantityUse) for v in constraints.values()):
            raise TypeError('candidate targets must be QuantityUse')
        object.__setattr__(self, 'constraints', MappingProxyType(constraints))


def _records(value, cls, identifier):
    rows = _sequence(value, identifier)
    if any(not isinstance(row, cls) for row in rows):
        raise TypeError(f'expected {cls.__name__}')
    if len({getattr(row, identifier) for row in rows}) != len(rows):
        raise ValueError(f'duplicate {identifier}')
    return tuple(sorted(rows, key=lambda row: getattr(row, identifier)))


@dataclass(frozen=True)
class ProjectionProblem:
    scenario_id: str
    objective_scope: Scope
    constraint_scopes: Mapping[str, Scope]
    blocks: tuple[FieldBlock, ...]
    observations: tuple[Observation, ...]
    candidates: tuple[ProjectionCandidate, ...]
    relation_reference: str
    anchors: tuple[ProjectionAnchor, ...] = ()
    sources: tuple[SourceIdentity, ...] = ()
    premise_status: str = 'assumed_unverified'

    def __post_init__(self):
        nonempty(self.scenario_id, 'scenario ID')
        nonempty(self.relation_reference, 'joint relation reference')
        _premise(self.premise_status)
        scopes = _mapping(self.constraint_scopes, 'constraint scopes')
        if 'score' in scopes:
            raise ValueError('score is reserved for the objective')
        for key, scope in {'score': self.objective_scope, **scopes}.items():
            _scope(scope)
            if scope.scenario_id != self.scenario_id or scope.quantity != key:
                raise ValueError('output quantity scope differs from the declared scenario or target')
        definitions = (('blocks', FieldBlock, 'block_id'), ('observations', Observation, 'observation_id'),
                       ('candidates', ProjectionCandidate, 'candidate_id'), ('anchors', ProjectionAnchor, 'anchor_id'),
                       ('sources', SourceIdentity, 'source_id'))
        for name, cls, key in definitions:
            object.__setattr__(self, name, _records(getattr(self, name), cls, key))
        object.__setattr__(self, 'constraint_scopes', MappingProxyType(scopes))
        blocks = {row.block_id: row for row in self.blocks}
        observations = {row.observation_id: row for row in self.observations}
        sources = {row.source_id for row in self.sources}
        def source_links(record):
            if set(record.source_ids) - sources:
                raise ValueError('unknown source identity link')
        for block in self.blocks:
            if block.scope.context.scenario_id != self.scenario_id:
                raise ValueError('field block belongs to a different scenario')
            source_links(block)
        for observation in self.observations:
            if observation.block_id not in blocks:
                raise ValueError('observation references an unknown field block')
            block = blocks[observation.block_id]
            if observation.field_scope != block.scope:
                raise ValueError('observation field scope does not match its block')
            if observation.source_scope.scenario_id != self.scenario_id:
                raise ValueError('observation source quantity belongs to another scenario')
            if len(observation.weights) != len(block.parameter_ids):
                raise ValueError('observation weight dimension differs from field parameter dimension')
            source_links(observation)
        for candidate in self.candidates:
            if candidate.context.scenario_id != self.scenario_id or set(candidate.constraints) != set(scopes):
                raise ValueError('candidate context or constraint keys differ from the problem')
            for key, use in {'score': candidate.score, **candidate.constraints}.items():
                if use.observation_id not in observations:
                    raise ValueError('candidate references an unknown observation')
                if observations[use.observation_id].field_scope.context != candidate.context:
                    raise ValueError('candidate and observation physical contexts differ; no transfer is implicit')
                expected = self.objective_scope if key == 'score' else scopes[key]
                if use.output_scope != expected:
                    raise ValueError('quantity-use output scope does not match its declared target')
                source_links(use)
        for anchor in self.anchors:
            if anchor.observation_id not in observations:
                raise ValueError('anchor references an unknown observation')
            if anchor.source_scope != observations[anchor.observation_id].source_scope:
                raise ValueError('anchor and observation source scopes differ')
            source_links(anchor)


@dataclass(frozen=True)
class AdapterReason:
    code: str
    record_kind: str
    record_id: str


@dataclass(frozen=True)
class ProjectionBuild:
    status: str
    input_digest: str
    model: CoupledProblem | None
    candidate_ids: tuple[str, ...]
    retained: tuple[str, ...] | None
    reasons: tuple[AdapterReason, ...]
    relation_record: Mapping
    relation_digest: str
    coordinate_map: Mapping
    observation_affines: Mapping[str, Affine]
    anchor_rows: Mapping[str, tuple[str, str]]

    def __post_init__(self):
        for name in ('candidate_ids', 'reasons'):
            object.__setattr__(self, name, _sequence(getattr(self, name), name))
        if self.retained is not None:
            object.__setattr__(self, 'retained', _sequence(self.retained, 'retained'))
        for name in ('relation_record', 'coordinate_map', 'observation_affines', 'anchor_rows'):
            object.__setattr__(self, name, _freeze(getattr(self, name)))


def _name(kind, *parts):
    return kind + ':' + ':'.join(f'{len(part)}:{part}' for part in parts)


def build_projection(problem):
    if not isinstance(problem, ProjectionProblem):
        raise TypeError('expected ProjectionProblem')
    input_digest = digest(encode(problem))
    candidate_ids = tuple(row.candidate_id for row in problem.candidates)
    reasons = []
    if problem.premise_status == 'unsupported':
        reasons.append(AdapterReason('joint_relation_unsupported', 'problem', problem.scenario_id))
    for block in problem.blocks:
        if block.premise_status == 'unsupported':
            reasons.append(AdapterReason('common_image_parameterization_unsupported', 'field', block.block_id))
        if any(bound is None for bound in block.latent_bounds) or block.field_bound_basis == 'missing':
            reasons.append(AdapterReason('finite_field_bound_missing', 'field', block.block_id))
        if block.field_bound_basis == 'empirical_residual':
            reasons.append(AdapterReason('empirical_field_range_is_not_a_global_bound', 'field', block.block_id))
    for observation in problem.observations:
        if observation.discrepancy_radius is None or observation.bound_basis == 'missing':
            reasons.append(AdapterReason('finite_discrepancy_bound_missing', 'observation', observation.observation_id))
        if observation.bound_basis == 'empirical_residual':
            reasons.append(AdapterReason('empirical_residual_is_not_a_global_bound', 'observation', observation.observation_id))
        if observation.premise_status == 'unsupported':
            reasons.append(AdapterReason('discrepancy_premise_unsupported', 'observation', observation.observation_id))
    for anchor in problem.anchors:
        if anchor.premise_status == 'unsupported':
            reasons.append(AdapterReason('anchor_premise_unsupported', 'anchor', anchor.anchor_id))
    record = {'schema': 'lupine.discovery.projection_relation.v1', 'input_digest': input_digest,
              'declarations': encode(problem),
              'field_convention': 'theta = offset + matrix @ normalized_latents',
              'observation_convention': 'truth = nominal - weights @ theta + radius * independent_normalized_error',
              'target_convention': 'target = scale * entire_observation_expression + offset',
              'common_image_premise': 'all true field vectors and all quantities are represented by one admitted common latent vector',
              'error_domain_meaning': 'all combinations admitted; no stochastic independence is asserted',
              'physical_attestation': 'not_established_by_this_program'}
    if reasons:
        record['status'] = 'unsupported_all_retained'
        record['reasons'] = encode(tuple(reasons))
        return ProjectionBuild('unsupported_all_retained', input_digest, None, candidate_ids, candidate_ids,
                               tuple(reasons), record, digest(record), {}, {}, {})
    latent_ids, latent_bounds, coordinate_map, locations = [], [], {}, {}
    for block in problem.blocks:
        indices = []
        for local_id, bound in zip(block.latent_ids, block.latent_bounds):
            lid = _name('field', block.block_id, local_id)
            index = len(latent_ids)
            indices.append(index)
            latent_ids.append(lid)
            latent_bounds.append(bound)
            coordinate_map[lid] = {'index': index, 'kind': 'field', 'block_id': block.block_id,
                                   'local_id': local_id, 'unit': '1'}
        locations[block.block_id] = tuple(indices)
    errors = {}
    for observation in problem.observations:
        lid = _name('discrepancy', observation.observation_id)
        index = len(latent_ids)
        errors[observation.observation_id] = index
        latent_ids.append(lid)
        latent_bounds.append(Interval(-1, 1))
        coordinate_map[lid] = {'index': index, 'kind': 'discrepancy',
                               'observation_id': observation.observation_id, 'unit': '1'}
    dimension = len(latent_ids)
    blocks = {row.block_id: row for row in problem.blocks}
    expressions = {}
    for observation in problem.observations:
        block = blocks[observation.block_id]
        coefficients = [Fraction(0)] * dimension
        for column, index in enumerate(locations[block.block_id]):
            coefficients[index] = -sum((weight * block.matrix[row][column]
                                        for row, weight in enumerate(observation.weights)), Fraction(0))
        coefficients[errors[observation.observation_id]] = observation.discrepancy_radius
        constant = observation.nominal - sum((weight * offset for weight, offset in
                                             zip(observation.weights, block.offset)), Fraction(0))
        expressions[observation.observation_id] = Affine(tuple(coefficients), constant)
    def transform(use):
        expression = expressions[use.observation_id]
        return Affine(tuple(use.scale * value for value in expression.coefficients),
                      use.scale * expression.constant + use.offset)
    candidates = tuple(CoupledCandidate(row.candidate_id, transform(row.score),
                        {key: transform(use) for key, use in row.constraints.items()}) for row in problem.candidates)
    rows, anchor_rows = [], {}
    for anchor in problem.anchors:
        expression = expressions[anchor.observation_id]
        upper_id, lower_id = _name('anchor-upper', anchor.anchor_id), _name('anchor-lower', anchor.anchor_id)
        rows.append(LinearRow(upper_id, expression.coefficients, anchor.interval.upper - expression.constant))
        rows.append(LinearRow(lower_id, tuple(-value for value in expression.coefficients),
                              expression.constant - anchor.interval.lower))
        anchor_rows[anchor.anchor_id] = (upper_id, lower_id)
    model = CoupledProblem(problem.scenario_id, tuple(latent_ids), tuple(latent_bounds),
                           problem.objective_scope, problem.constraint_scopes, candidates, tuple(rows),
                           premise_status='assumed_unverified', relation_basis='bounded_error_model')
    record.update(status='finite_conditional', coordinates=encode(coordinate_map),
                  observation_affines=encode(expressions), anchor_rows=encode(anchor_rows),
                  kernel_model_digest=digest(encode(model)))
    return ProjectionBuild('finite_conditional', input_digest, model, candidate_ids, None, (),
                           record, digest(record), coordinate_map, expressions, anchor_rows)


@dataclass(frozen=True)
class ProjectionScreen:
    build: ProjectionBuild
    retained: tuple[str, ...]
    selection: CoupledSelection | None
    status: str

    def __post_init__(self):
        object.__setattr__(self, 'retained', _sequence(self.retained, 'retained'))


def screen_projection(problem, consistency_point=None, proofs=(), limits=Limits()):
    built = build_projection(problem)
    if built.model is None:
        return ProjectionScreen(built, built.candidate_ids, None, built.status)
    selection = screen_coupled(built.model, consistency_point, proofs, limits)
    return ProjectionScreen(built, selection.retained, selection, selection.coupling_status)
