"""Bounded exact wire adapter for conditional shared-world screening.

The accepted common-world premise remains assumed, never physically attested.
This module has no solver, network access, or outcome access during selection.
"""
from collections import defaultdict, deque
from copy import deepcopy
from dataclasses import dataclass
from fractions import Fraction
import json
import re

from . import __version__
from .core import Interval, linear_interval
from .coupled import (
    Affine, CoupledCandidate, CoupledProblem, DominanceCertificate,
    InfeasibilityCertificate, Limits, LinearRow, UpperBoundCertificate,
    check_point, make_domain, screen_coupled,
)
from .evidence import Scope, digest, fields
from .serialization import encode


PROBLEM_SCHEMA = 'lupine.discovery.coupled_problem.v1'
OUTCOMES_SCHEMA = 'lupine.discovery.coupled_outcomes.v1'
PROFILE_ID = 'coupled-local-v1'
MAX_DOCUMENT_BYTES = 256 * 1024
MAX_DEPTH = 24
MAX_NODES = 65536
MAX_SAFE_INTEGER = 2**53 - 1
MAX_RATIONAL_TOKENS = 16384
MAX_MULTIPLIER_ENTRIES = 4096
WORK_CEILINGS = dict(max_operations=100000, max_certificate_terms=512,
                     max_integer_bits=2048, max_witness_pairs=4096)
INSTANCE_FIELDS = ('schema', 'scenario', 'latent_variables', 'candidates', 'rows', 'common_world')
_EXACT = re.compile(r'[-+]?(?:[0-9]+(?:/[1-9][0-9]*|\.[0-9]+)?|\.[0-9]+)\Z')
_SHA = re.compile(r'[0-9a-f]{64}\Z')


def preflight_json_text(raw, max_bytes=MAX_DOCUMENT_BYTES, max_depth=MAX_DEPTH):
    """Bound bytes and lexical nesting before the JSON decoder is invoked."""
    if isinstance(raw, bytes):
        if len(raw) > max_bytes:
            raise ValueError('JSON document byte limit exceeded')
        raw = raw.decode('utf-8')
    if not isinstance(raw, str):
        raise TypeError('JSON input must be text or UTF-8 bytes')
    if len(raw) > max_bytes or len(raw.encode('utf-8')) > max_bytes:
        raise ValueError('JSON document byte limit exceeded')
    depth, quoted, escaped = 0, False, False
    for char in raw:
        if quoted:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == '"':
                quoted = False
        elif char == '"':
            quoted = True
        elif char in '[{':
            depth += 1
            if depth > max_depth:
                raise ValueError('JSON nesting limit exceeded')
        elif char in ']}':
            depth -= 1
    return raw


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f'duplicate JSON key: {key}')
        result[key] = value
    return result


def loads_coupled(raw):
    raw = preflight_json_text(raw)
    def reject(value):
        raise ValueError(f'non-exact JSON number: {value}')
    def integer(value):
        if len(value.lstrip('-')) > 16:
            raise ValueError('large integers must be quoted rational strings')
        number = int(value)
        if abs(number) > MAX_SAFE_INTEGER:
            raise ValueError('large integers must be quoted rational strings')
        return number
    value = json.loads(raw, object_pairs_hook=_unique_object, parse_int=integer,
                       parse_float=reject, parse_constant=reject)
    _preflight_value(value)
    return value


def _preflight_value(value):
    """Bound direct Python callers too, before recursion, hashing, or Fraction."""
    stack, seen, nodes, encoded_size = [(value, 0)], set(), 0, 0
    while stack:
        item, depth = stack.pop()
        nodes += 1
        if nodes > MAX_NODES:
            raise ValueError('JSON node limit exceeded')
        if type(item) in (dict, list):
            if depth + 1 > MAX_DEPTH:
                raise ValueError('JSON nesting limit exceeded')
            if id(item) in seen:
                raise ValueError('wire values must be JSON trees, without aliases or cycles')
            seen.add(id(item))
            if len(item) > MAX_NODES:
                raise ValueError('JSON container limit exceeded')
            if nodes + len(stack) + len(item) > MAX_NODES:
                raise ValueError('JSON node limit exceeded')
            encoded_size += 2 + max(0, len(item) - 1)
            if type(item) is dict:
                for key, child in item.items():
                    if type(key) is not str or len(key) > 128:
                        raise ValueError('JSON keys must be strings of at most 128 characters')
                    encoded_size += len(json.dumps(key, ensure_ascii=True)) + 1
                    stack.append((child, depth + 1))
            else:
                stack.extend((child, depth + 1) for child in item)
        elif type(item) is str:
            if len(item) > 2048:
                raise ValueError('JSON string limit exceeded')
            encoded_size += len(json.dumps(item, ensure_ascii=True))
        elif type(item) is int:
            if abs(item) > MAX_SAFE_INTEGER:
                raise ValueError('large integers must be quoted rational strings')
            encoded_size += len(str(item))
        elif item is None:
            encoded_size += 4
        elif item is not None:
            raise ValueError('wire scalars must be exact strings, safe integers, or null')
        if encoded_size > MAX_DOCUMENT_BYTES:
            raise ValueError('coupled document byte limit exceeded')


def _text(value, label, maximum=128):
    if type(value) is not str or not value.strip() or len(value) > maximum:
        raise ValueError(f'{label} must be a nonempty string of at most {maximum} characters')
    return value


def _checksum(value, label):
    if type(value) is not str or not _SHA.fullmatch(value):
        raise ValueError(f'{label} must be a lowercase SHA-256 hex digest')
    return value


def _array(value, label, maximum):
    if type(value) is not list or len(value) > maximum:
        raise ValueError(f'{label} must be an array with at most {maximum} entries')
    return value


def _object(value, label, maximum):
    if type(value) is not dict or len(value) > maximum:
        raise ValueError(f'{label} must be an object with at most {maximum} entries')
    for key in value:
        _text(key, f'{label} key')
    return value


class _Numbers:
    """Lexical/count phase first; conversion begins only after all shapes pass."""
    def __init__(self):
        self.tokens = []
        self.values = {}
        self.multiplier_count = 0

    def token(self, value):
        if type(value) is int:
            if abs(value) > MAX_SAFE_INTEGER:
                raise ValueError('large integers must be quoted rational strings')
        elif type(value) is not str or len(value) > 512 or not _EXACT.fullmatch(value):
            raise ValueError('invalid or oversized exact rational token')
        self.tokens.append(value)
        if len(self.tokens) > MAX_RATIONAL_TOKENS:
            raise ValueError('rational token limit exceeded')

    def vector(self, value, dimension):
        _array(value, 'exact vector', 16)
        if len(value) != dimension:
            raise ValueError('exact vector dimension mismatch')
        for item in value:
            self.token(item)

    def affine(self, value, dimension):
        fields(value, ('coefficients', 'constant'))
        self.vector(value['coefficients'], dimension)
        self.token(value['constant'])

    def multipliers(self, value):
        _object(value, 'multipliers', WORK_CEILINGS['max_certificate_terms'])
        self.multiplier_count += len(value)
        if self.multiplier_count > MAX_MULTIPLIER_ENTRIES:
            raise ValueError('total multiplier-entry limit exceeded')
        for item in value.values():
            self.token(item)

    def upper(self, value, dimension):
        fields(value, ('domain_id', 'expression', 'upper', 'multipliers'))
        _checksum(value['domain_id'], 'domain ID')
        self.affine(value['expression'], dimension)
        self.token(value['upper'])
        self.multipliers(value['multipliers'])

    def convert(self):
        for token in self.tokens:
            key = (type(token), token)
            if key not in self.values:
                value = Fraction(token)
                if max(value.numerator.bit_length(), value.denominator.bit_length()) > 512:
                    raise ValueError('input rational magnitude exceeds 512 bits')
                self.values[key] = value

    def get(self, value):
        return self.values[(type(value), value)]

    def expression(self, value):
        return Affine(tuple(self.get(v) for v in value['coefficients']), self.get(value['constant']))

    def upper_record(self, value):
        return UpperBoundCertificate(value['domain_id'], self.expression(value['expression']),
                                     self.get(value['upper']),
                                     {key: self.get(v) for key, v in value['multipliers'].items()})


@dataclass(frozen=True)
class WireProof:
    proof_id: str
    wire_digest: str
    kernel_digest: str | None
    certificate: InfeasibilityCertificate | DominanceCertificate | None
    candidate_id: str | None
    witness_id: str | None
    domain_id: str
    envelope_rejection: str | None


@dataclass(frozen=True)
class ParsedCoupledProblem:
    model: CoupledProblem
    wire: dict
    problem_digest: str
    instance_digest: str
    consistency_point: tuple[Fraction, ...] | None
    limits: Limits
    proofs: tuple[WireProof, ...]


def parse_coupled_problem(value):
    _preflight_value(value)
    fields(value, (*INSTANCE_FIELDS, 'screening'), ('description',))
    if value['schema'] != PROBLEM_SCHEMA:
        raise ValueError('unsupported coupled problem schema')
    if 'description' in value and type(value['description']) is not str:
        raise ValueError('description must be a string')
    scenario = value['scenario']
    fields(scenario, ('id', 'objective', 'constraints'))
    sid = _text(scenario['id'], 'scenario ID')
    fields(scenario['objective'], ('direction', 'unit', 'reference'))
    if scenario['objective']['direction'] != 'minimize':
        raise ValueError('normalize the objective to minimization explicitly')
    specs = _object(scenario['constraints'], 'constraint scopes', 8)
    if 'score' in specs:
        raise ValueError('score is reserved for the objective')
    for key, spec in {'score': scenario['objective'], **specs}.items():
        if key != 'score':
            fields(spec, ('unit', 'reference'))
        _text(spec['unit'], 'quantity unit')
        _text(spec['reference'], 'quantity reference', 2048)
    latents = _array(value['latent_variables'], 'latent variables', 16)
    dimension, numbers = len(latents), _Numbers()
    latent_ids = []
    for row in latents:
        fields(row, ('id', 'bounds', 'unit', 'reference'))
        latent_ids.append(_text(row['id'], 'latent ID'))
        if row['unit'] != '1':
            raise ValueError('latent unit must be literal 1 for normalized dimensionless coordinates')
        _text(row['reference'], 'latent reference', 2048)
        bounds = _array(row['bounds'], 'latent bounds', 2)
        if len(bounds) != 2:
            raise ValueError('latent bounds require exactly two endpoints')
        for endpoint in bounds:
            numbers.token(endpoint)
    if len(set(latent_ids)) != dimension:
        raise ValueError('duplicate latent ID')
    rows = _array(value['rows'], 'coupling rows', 64)
    row_ids = []
    for row in rows:
        fields(row, ('id', 'coefficients', 'upper', 'unit', 'reference'))
        row_ids.append(_text(row['id'], 'row ID'))
        if row['id'].startswith('@'):
            raise ValueError('generated row namespace is reserved')
        _text(row['unit'], 'row unit')
        _text(row['reference'], 'row reference', 2048)
        numbers.vector(row['coefficients'], dimension)
        numbers.token(row['upper'])
    if len(set(row_ids)) != len(rows):
        raise ValueError('duplicate coupling row ID')
    candidates = _array(value['candidates'], 'candidates', 64)
    candidate_ids = []
    for row in candidates:
        fields(row, ('id', 'score', 'constraints'))
        candidate_ids.append(_text(row['id'], 'candidate ID'))
        numbers.affine(row['score'], dimension)
        _object(row['constraints'], 'candidate constraints', 8)
        if set(row['constraints']) != set(specs):
            raise ValueError('candidate constraints differ from declared scopes')
        for expression in row['constraints'].values():
            numbers.affine(expression, dimension)
    if len(set(candidate_ids)) != len(candidates):
        raise ValueError('duplicate candidate ID')
    common = value['common_world']
    fields(common, ('claim', 'premise_status', 'relation_basis', 'reference'))
    if common['claim'] != 'one_common_latent_vector_represents_all_quantities':
        raise ValueError('unknown common-world claim')
    if common['premise_status'] not in ('assumed_unverified', 'unsupported'):
        raise ValueError('common-world premise must remain assumed_unverified or unsupported')
    if common['relation_basis'] not in ('declared_affine_assumption', 'bounded_error_model', 'learned_correlation'):
        raise ValueError('unknown common-world relation basis')
    _text(common['reference'], 'common-world reference', 2048)
    screening = value['screening']
    fields(screening, ('consistency_point', 'proofs', 'limits'))
    if screening['consistency_point'] is not None:
        numbers.vector(screening['consistency_point'], dimension)
    fields(screening['limits'], WORK_CEILINGS)
    for key, ceiling in WORK_CEILINGS.items():
        amount = screening['limits'][key]
        if type(amount) is not int or not 0 <= amount <= ceiling:
            raise ValueError(f'{key} must be an integer between 0 and {ceiling}')
    proofs = _array(screening['proofs'], 'supplied proofs', 64)
    proof_ids = []
    for proof in proofs:
        if type(proof) is not dict:
            raise ValueError('proof must be a tagged object')
        kind = proof.get('kind')
        if kind == 'infeasibility':
            fields(proof, ('id', 'kind', 'instance_digest', 'candidate_id', 'domain_id', 'multipliers'))
            _checksum(proof['domain_id'], 'domain ID')
            if proof['candidate_id'] is not None:
                _text(proof['candidate_id'], 'candidate ID')
            numbers.multipliers(proof['multipliers'])
        elif kind == 'dominance':
            fields(proof, ('id', 'kind', 'instance_digest', 'candidate_id', 'witness_id', 'feasibility', 'improvement'))
            _text(proof['candidate_id'], 'candidate ID')
            _text(proof['witness_id'], 'witness ID')
            for upper in _object(proof['feasibility'], 'feasibility proofs', 8).values():
                numbers.upper(upper, dimension)
            numbers.upper(proof['improvement'], dimension)
        else:
            raise ValueError('unknown supplied proof kind')
        proof_ids.append(_text(proof['id'], 'proof ID'))
        _checksum(proof['instance_digest'], 'instance digest')
    if len(set(proof_ids)) != len(proof_ids):
        raise ValueError('duplicate supplied proof ID')
    # No Fraction or kernel model has been constructed before this point.
    numbers.convert()
    scope = lambda key, spec: Scope(sid, key, spec['unit'], spec['reference'])
    model = CoupledProblem(sid, tuple(latent_ids),
        tuple(Interval(*(numbers.get(v) for v in row['bounds'])) for row in latents),
        scope('score', scenario['objective']), {key: scope(key, spec) for key, spec in specs.items()},
        tuple(CoupledCandidate(row['id'], numbers.expression(row['score']),
                              {key: numbers.expression(v) for key, v in row['constraints'].items()}) for row in candidates),
        tuple(LinearRow(row['id'], tuple(numbers.get(v) for v in row['coefficients']), numbers.get(row['upper'])) for row in rows),
        common['premise_status'], common['relation_basis'])
    instance_digest = digest({key: value[key] for key in INSTANCE_FIELDS})
    bound_proofs = []
    for proof in proofs:
        certificate = None
        rejection = None if proof['instance_digest'] == instance_digest else 'instance_identity_mismatch'
        if rejection is None:
            if proof['kind'] == 'infeasibility':
                certificate = InfeasibilityCertificate(proof['domain_id'],
                    {key: numbers.get(v) for key, v in proof['multipliers'].items()}, proof['candidate_id'])
            else:
                certificate = DominanceCertificate(proof['candidate_id'], proof['witness_id'],
                    {key: numbers.upper_record(v) for key, v in proof['feasibility'].items()},
                    numbers.upper_record(proof['improvement']))
        bound_proofs.append(WireProof(proof['id'], digest(proof), digest(encode(certificate)) if certificate else None,
            certificate, proof['candidate_id'], proof.get('witness_id'),
            proof['domain_id'] if proof['kind'] == 'infeasibility' else proof['improvement']['domain_id'], rejection))
    point = screening['consistency_point']
    return ParsedCoupledProblem(model, deepcopy(value), digest(value), instance_digest,
        None if point is None else tuple(numbers.get(v) for v in point),
        Limits(**screening['limits']), tuple(bound_proofs))


def coupled_domains(value):
    parsed = parse_coupled_problem(value)
    common = make_domain(parsed.model)
    payload = encode({
        'schema': 'lupine.discovery.coupled_domains.v1', 'engine_version': __version__,
        'profile_id': PROFILE_ID, 'scenario_id': parsed.model.scenario_id,
        'problem_digest': parsed.problem_digest, 'instance_digest': parsed.instance_digest,
        'kernel_model_digest': common.problem_digest, 'common_domain': common,
        'candidate_domains': {row.candidate_id: make_domain(parsed.model, row.candidate_id)
                              for row in parsed.model.candidates},
        'claim': 'domain_identity_and_exact_rows_only_no_screening',
        'physical_attestation': 'not_established_by_this_program',
    })
    return {**payload, 'domains_digest': digest(payload)}


def _marginals(model):
    def bound(expression):
        return linear_interval(tuple(zip(expression.coefficients, model.latent_bounds)), expression.constant)
    return {row.candidate_id: {'score': bound(row.score),
                              'constraints': {key: bound(expression) for key, expression in row.constraints.items()}}
            for row in model.candidates}


def _proof_assessments(parsed, selected):
    pending = defaultdict(deque)
    for index, proof in enumerate(parsed.proofs):
        if proof.certificate is not None:
            pending[proof.kernel_digest].append(index)
    checked, automatic = {}, []
    for assessment in selected.assessments:
        record = encode(assessment)
        if assessment.source == 'supplied':
            occurrences = pending[assessment.certificate_digest]
            if not occurrences:
                raise ValueError('kernel proof assessment has no matching supplied occurrence')
            checked[occurrences.popleft()] = record
        else:
            automatic.append({**record, 'supplied_id': None, 'input_index': None, 'wire_proof_digest': None})
    result = []
    for index, proof in enumerate(parsed.proofs):
        if proof.envelope_rejection:
            check = {'status': 'rejected', 'reason': proof.envelope_rejection,
                     'domain_id': proof.domain_id, 'operations_used': 0}
        elif index in checked:
            check = checked[index]['check']
        else:
            check = {'status': 'not_checked', 'reason': selected.coupling_status,
                     'domain_id': proof.domain_id, 'operations_used': selected.operations_used}
        result.append({'source': 'supplied', 'supplied_id': proof.proof_id, 'input_index': index,
                       'wire_proof_digest': proof.wire_digest, 'certificate_digest': proof.kernel_digest,
                       'candidate_id': proof.candidate_id, 'witness_id': proof.witness_id, 'check': check})
    return result + automatic


def _selection_receipt(parsed):
    selected = screen_coupled(parsed.model, parsed.consistency_point,
                              tuple(proof.certificate for proof in parsed.proofs if proof.certificate is not None),
                              parsed.limits)
    active = selected.coupling_status.startswith('conditional_')
    common = make_domain(parsed.model)
    selection_keys = ('retained', 'certified_feasible', 'interval_infeasible', 'interval_dominated',
                      'coupled_infeasible', 'coupled_dominated', 'dominance_witnesses')
    payload = encode({
        'schema': 'lupine.discovery.coupled_certificate.v1', 'engine_version': __version__,
        'problem_digest': parsed.problem_digest, 'scenario_id': parsed.model.scenario_id,
        'claim': 'conditional_common_world_finite_universe_all_minimizer_retention',
        'model_identity': {'instance_digest': parsed.instance_digest,
                           'kernel_model_digest': selected.problem_digest, 'domain_id': common.domain_id},
        'common_world': {**parsed.wire['common_world'], 'scientific_validity': 'unestablished'},
        'coupling': {'status': selected.coupling_status, 'consistency': selected.consistency,
                     'supplied_consistency_point': parsed.consistency_point},
        'selection': {key: getattr(selected, key) for key in selection_keys},
        'exclusion_certificates': {cid: {'kind': 'infeasibility' if isinstance(proof, InfeasibilityCertificate) else 'dominance',
                                       'instance_digest': parsed.instance_digest, 'certificate': proof}
                                   for cid, proof in selected.exclusion_certificates.items()},
        'proof_assessments': _proof_assessments(parsed, selected),
        'execution': {'profile_id': PROFILE_ID,
                      'ordered_supplied_proof_digests': [proof.wire_digest for proof in parsed.proofs],
                      'requested_limits': parsed.wire['screening']['limits'], 'effective_limits': parsed.limits,
                      'kernel_operations_used': selected.operations_used},
        'diagnostics': {'marginal_intervals': _marginals(parsed.model),
                        'box_selection_diagnostic': selected.box_selection_diagnostic,
                        'box_pool_role': 'active_conditional_baseline' if active else 'diagnostic_only_gate_closed'},
        'assumptions': [
            'One common latent vector in the declared domain represents every actual score and constraint.',
            'A consistency point proves model nonemptiness, not physical validity or observational provenance.',
            'All quantities use the declared scenario, reference, and normalized dimensionless latent coordinates.',
            'Every exactly tied feasible minimizer in the finite input universe is retained under these premises.',
            'The conservative search is incomplete; retention does not certify possible or robust optimality.',
        ],
        'physical_attestation': selected.physical_attestation,
    })
    return {**payload, 'certificate_digest': digest(payload)}


def coupled_certificate(value):
    return _selection_receipt(parse_coupled_problem(value))


@dataclass(frozen=True)
class CoupledTruth:
    rows: dict
    latent_point: tuple[Fraction, ...] | None


def parse_coupled_outcomes(value, problem, problem_digest, certificate_digest):
    """Parse truth only against a decision that has already been fixed/sealed."""
    _preflight_value(value)
    fields(value, ('schema', 'scenario_id', 'problem_digest', 'certificate_digest', 'outcomes'), ('latent_world',))
    if value['schema'] != OUTCOMES_SCHEMA:
        raise ValueError('unsupported coupled outcomes schema')
    model = problem.model if isinstance(problem, ParsedCoupledProblem) else problem
    if not isinstance(model, CoupledProblem):
        raise TypeError('expected a parsed coupled problem or CoupledProblem')
    _checksum(value['problem_digest'], 'problem digest')
    _checksum(value['certificate_digest'], 'certificate digest')
    if (value['scenario_id'] != model.scenario_id or value['problem_digest'] != problem_digest
            or value['certificate_digest'] != certificate_digest):
        raise ValueError('outcomes do not match the sealed coupled decision')
    records = _array(value['outcomes'], 'outcomes', 64)
    numbers, seen = _Numbers(), set()
    universe = {row.candidate_id for row in model.candidates}
    for row in records:
        fields(row, ('id', 'score', 'constraints'))
        cid = _text(row['id'], 'outcome candidate ID')
        if cid not in universe or cid in seen:
            raise ValueError('unknown or duplicate outcome candidate ID')
        seen.add(cid)
        _object(row['constraints'], 'outcome constraints', 8)
        if set(row['constraints']) - set(model.constraint_scopes):
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
        numbers.vector(point, len(model.latent_ids))
    numbers.convert()
    return CoupledTruth({row['id']: {
        'score': None if row['score'] is None else numbers.get(row['score']),
        'constraints': {key: None if v is None else numbers.get(v) for key, v in row['constraints'].items()}}
        for row in records}, None if point is None else tuple(numbers.get(v) for v in point))


def _outcome_audit(parsed, truth, receipt):
    selection = receipt['selection']
    retained = set(selection['retained'])
    checks, known_feasible = {}, {}
    for candidate in parsed.model.candidates:
        cid = candidate.candidate_id
        observed = truth.rows.get(cid, {'score': None, 'constraints': {}})
        constraints = observed['constraints']
        constraint_complete = all(constraints.get(key) is not None for key in candidate.constraints)
        feasible = (False if any(v is not None and v > 0 for v in constraints.values()) else
                    True if constraint_complete else None)
        score_known = observed['score'] is not None
        if feasible is True and score_known:
            known_feasible[cid] = observed['score']
        checks[cid] = {'true_feasible': feasible, 'truth_complete': constraint_complete and score_known,
                       'score_observed': score_known, 'constraint_values_observed': sum(v is not None for v in constraints.values()),
                       'retained': cid in retained}
    complete = all(row['truth_complete'] for row in checks.values())
    optimum = min(known_feasible.values()) if complete and known_feasible else None
    minimizers = sorted(cid for cid, score in known_feasible.items() if score == optimum) if optimum is not None else None
    retained_minimizers = sorted(set(minimizers) & retained) if minimizers is not None else None
    lost_minimizers = sorted(set(minimizers) - retained) if minimizers is not None else None
    all_retained = not lost_minimizers if lost_minimizers is not None else None
    infeasible_exclusions = selection['interval_infeasible'] + selection['coupled_infeasible']
    return {
        'outcome_completeness': 'complete' if complete else 'partial',
        'universe_count': len(checks), 'complete_candidate_count': sum(row['truth_complete'] for row in checks.values()),
        'missing_truth_ids': [cid for cid, row in checks.items() if not row['truth_complete']],
        'per_candidate': checks, 'true_feasible_optimum': optimum, 'true_minimizer_ids': minimizers,
        'retained_optimum_ids': retained_minimizers, 'lost_optimum_ids': lost_minimizers,
        'all_true_minimizers_retained': all_retained,
        'retention_status': ('refuted_on_complete_reported_values' if all_retained is False else
                             'holds_on_complete_reported_values' if all_retained is True else
                             'not_evaluated_empty_universe' if not checks else
                             'undefined_no_feasible_candidate' if complete else 'unresolved_missing_outcomes'),
        'infeasibility_exclusion_correctness': {
            cid: None if checks[cid]['true_feasible'] is None else not checks[cid]['true_feasible']
            for cid in infeasible_exclusions},
        'excluded_optimum_correctness': {cid: cid not in minimizers for cid in checks if cid not in retained}
                                         if minimizers is not None else None,
        'pool_fraction': Fraction(len(retained), len(checks)) if checks else None,
        'scientific_validity': 'unestablished',
    }


def _coverage_audit(parsed, truth):
    checks, score_values, constraint_values = {}, [], []
    for cid, bounds in _marginals(parsed.model).items():
        row = truth.rows.get(cid, {'score': None, 'constraints': {}})
        score = None if row['score'] is None else bounds['score'].contains(row['score'])
        constraints = {key: None if row['constraints'].get(key) is None else bound.contains(row['constraints'][key])
                       for key, bound in bounds['constraints'].items()}
        checks[cid] = {'score_covered': score, 'constraints_covered': constraints}
        if score is not None:
            score_values.append(score)
        constraint_values.extend(v for v in constraints.values() if v is not None)
    def summary(values):
        return {'covered': sum(values), 'checked': len(values),
                'rate': Fraction(sum(values), len(values)) if values else None}
    return {'kind': 'marginal_box_coverage_only_not_common_world_evidence', 'per_candidate': checks,
            'score_coverage': summary(score_values), 'constraint_coverage': summary(constraint_values),
            'common_world_validity': 'not_established_by_marginal_coverage'}


def _provided_world_audit(parsed, truth):
    complete = all(cid in truth.rows and truth.rows[cid]['score'] is not None and
                   all(truth.rows[cid]['constraints'].get(key) is not None for key in row.constraints)
                   for row in parsed.model.candidates for cid in (row.candidate_id,))
    base = {'status': 'not_supplied', 'all_quantities_reported': complete, 'point_check': None,
            'checked_quantity_count': 0, 'mismatches': [], 'scientific_validity': 'unestablished',
            'common_world_existence': 'not_decided_without_a_fitting_supplied_point'}
    if truth.latent_point is None:
        return base
    domain = make_domain(parsed.model)
    checked = check_point(domain, truth.latent_point, parsed.limits)
    base['point_check'] = checked
    if checked.status != 'verified':
        base['status'] = ('unresolved_by_work_limit' if checked.status == 'unresolved' else
                          'provided_point_outside_domain')
        return base
    # At most 64*9*16 products of 512-bit inputs follow bounded preflight.
    # Exact finite affine evaluation here is outside the kernel proof counter.
    for candidate in parsed.model.candidates:
        row = truth.rows.get(candidate.candidate_id)
        if row is None:
            continue
        expressions = {'score': candidate.score, **candidate.constraints}
        values = {'score': row['score'], **row['constraints']}
        for key, expression in expressions.items():
            observed = values.get(key)
            if observed is None:
                continue
            predicted = expression.evaluate(truth.latent_point)
            base['checked_quantity_count'] += 1
            if predicted != observed:
                base['mismatches'].append({'candidate_id': candidate.candidate_id, 'quantity': key,
                                           'reported': observed, 'model_at_provided_point': predicted})
    if base['mismatches']:
        base['status'] = 'provided_point_mismatch'
    elif base['checked_quantity_count'] == 0:
        base['status'] = 'provided_point_consistent_no_reported_values'
    else:
        base['status'] = 'provided_point_matches_reported_values'
        base['common_world_existence'] = ('provided_point_fits_complete_reported_values' if complete else
                                          'provided_point_fits_partial_reported_values')
    return base


def coupled_replay_report(value, outcome_value_or_loader):
    """Seal selection before invoking an outcome loader or parsing any truth."""
    parsed = parse_coupled_problem(value)
    receipt = _selection_receipt(parsed)
    outcomes = outcome_value_or_loader() if callable(outcome_value_or_loader) else outcome_value_or_loader
    truth = parse_coupled_outcomes(outcomes, parsed, receipt['problem_digest'], receipt['certificate_digest'])
    return encode({
        'schema': 'lupine.discovery.coupled_replay.v1', 'engine_version': __version__,
        'problem_digest': receipt['problem_digest'], 'certificate_digest': receipt['certificate_digest'],
        'outcomes_digest': digest(outcomes),
        'decision': {'certificate': receipt, 'selection': receipt['selection']},
        'outcome_audit': _outcome_audit(parsed, truth, receipt),
        'provided_world_audit': _provided_world_audit(parsed, truth),
        'diagnostics': {'marginal_coverage': _coverage_audit(parsed, truth),
                        'box_selection_diagnostic': receipt['diagnostics']['box_selection_diagnostic']},
        'physical_attestation': 'not_established_by_this_program',
    })
