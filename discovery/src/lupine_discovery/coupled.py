"""Exact conditional screening with declared shared affine uncertainty.

This module checks supplied certificates; it is not a general LP solver.
Unsupported premises or unverified consistency retain the whole universe.
"""
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from fractions import Fraction
from types import MappingProxyType

from .core import Candidate, Interval, Selection, exact, linear_interval, select
from .evidence import Scope, digest, nonempty
from .serialization import encode


def _tuple(value, label):
    if not isinstance(value, Sequence) or isinstance(value, (str, bytes, bytearray)):
        raise TypeError(f'{label} must be a finite sequence')
    return tuple(value)


def _rationals(value, label):
    return tuple(exact(item) for item in _tuple(value, label))


def _mapping(value, label):
    if not isinstance(value, Mapping):
        raise TypeError(f'{label} must be a mapping')
    for key in value:
        nonempty(key, f'{label} key')
    return {key: value[key] for key in sorted(value)}


@dataclass(frozen=True)
class Affine:
    coefficients: tuple[Fraction, ...]
    constant: Fraction = Fraction(0)

    def __post_init__(self):
        object.__setattr__(self, 'coefficients', _rationals(self.coefficients, 'coefficients'))
        object.__setattr__(self, 'constant', exact(self.constant))

    def evaluate(self, point):
        point = _rationals(point, 'point')
        if len(point) != len(self.coefficients):
            raise ValueError('affine point dimension mismatch')
        return self.constant + sum((a * z for a, z in zip(self.coefficients, point)), Fraction(0))

    def minus(self, other):
        if not isinstance(other, Affine) or len(other.coefficients) != len(self.coefficients):
            raise ValueError('affine subtraction dimension mismatch')
        return Affine(tuple(a-b for a, b in zip(self.coefficients, other.coefficients)),
                      self.constant-other.constant)


@dataclass(frozen=True)
class LinearRow:
    row_id: str
    coefficients: tuple[Fraction, ...]
    upper: Fraction

    def __post_init__(self):
        nonempty(self.row_id, 'row ID')
        object.__setattr__(self, 'coefficients', _rationals(self.coefficients, 'row coefficients'))
        object.__setattr__(self, 'upper', exact(self.upper))


@dataclass(frozen=True)
class CoupledCandidate:
    candidate_id: str
    score: Affine
    constraints: Mapping[str, Affine]

    def __post_init__(self):
        nonempty(self.candidate_id, 'candidate ID')
        values = _mapping(self.constraints, 'constraints')
        if not isinstance(self.score, Affine) or any(not isinstance(v, Affine) for v in values.values()):
            raise TypeError('score and constraints must be Affine')
        if any(len(v.coefficients) != len(self.score.coefficients) for v in values.values()):
            raise ValueError('candidate affine dimensions disagree')
        object.__setattr__(self, 'constraints', MappingProxyType(values))


@dataclass(frozen=True)
class CoupledProblem:
    scenario_id: str
    latent_ids: tuple[str, ...]
    latent_bounds: tuple[Interval, ...]
    objective_scope: Scope
    constraint_scopes: Mapping[str, Scope]
    candidates: tuple[CoupledCandidate, ...]
    rows: tuple[LinearRow, ...] = ()
    premise_status: str = 'assumed_unverified'
    relation_basis: str = 'declared_affine_assumption'

    def __post_init__(self):
        nonempty(self.scenario_id, 'scenario ID')
        ids = _tuple(self.latent_ids, 'latent IDs')
        for name in ids:
            nonempty(name, 'latent ID')
        if len(set(ids)) != len(ids):
            raise ValueError('duplicate latent ID')
        bounds = _tuple(self.latent_bounds, 'latent bounds')
        if len(bounds) != len(ids) or any(not isinstance(v, Interval) for v in bounds):
            raise ValueError('one finite Interval is required per latent')
        scopes = _mapping(self.constraint_scopes, 'constraint scopes')
        if 'score' in scopes:
            raise ValueError('score is reserved for the objective')
        for key, scope in {'score': self.objective_scope, **scopes}.items():
            if not isinstance(scope, Scope):
                raise TypeError('quantity scopes must be Scope records')
            if scope.scenario_id != self.scenario_id or scope.quantity != key:
                raise ValueError('quantity scope does not match the problem')
            nonempty(scope.unit, 'unit')
            nonempty(scope.reference, 'reference')
        candidates = _tuple(self.candidates, 'candidates')
        if any(not isinstance(row, CoupledCandidate) for row in candidates):
            raise TypeError('expected CoupledCandidate')
        if len({row.candidate_id for row in candidates}) != len(candidates):
            raise ValueError('duplicate candidate ID')
        if any(len(row.score.coefficients) != len(ids) or set(row.constraints) != set(scopes) for row in candidates):
            raise ValueError('candidate dimensions or constraint scopes differ from the problem')
        rows = _tuple(self.rows, 'rows')
        if any(not isinstance(row, LinearRow) for row in rows):
            raise TypeError('expected LinearRow')
        if len({row.row_id for row in rows}) != len(rows):
            raise ValueError('duplicate row ID')
        if any(row.row_id.startswith('@') or len(row.coefficients) != len(ids) for row in rows):
            raise ValueError('row dimension mismatch or reserved generated row ID')
        if self.premise_status not in ('assumed_unverified', 'unsupported'):
            raise ValueError('premise status must remain assumed_unverified or unsupported')
        if self.relation_basis not in ('declared_affine_assumption', 'bounded_error_model', 'learned_correlation'):
            raise ValueError('unknown affine relation basis')
        object.__setattr__(self, 'latent_ids', ids)
        object.__setattr__(self, 'latent_bounds', bounds)
        object.__setattr__(self, 'constraint_scopes', MappingProxyType(scopes))
        object.__setattr__(self, 'candidates', tuple(sorted(candidates, key=lambda row: row.candidate_id)))
        object.__setattr__(self, 'rows', tuple(sorted(rows, key=lambda row: row.row_id)))


@dataclass(frozen=True)
class Domain:
    problem_digest: str
    feasible_candidate_id: str | None
    latent_ids: tuple[str, ...]
    rows: tuple[LinearRow, ...]
    domain_id: str = field(init=False)

    def __post_init__(self):
        nonempty(self.problem_digest, 'problem digest')
        if self.feasible_candidate_id is not None:
            nonempty(self.feasible_candidate_id, 'feasible candidate ID')
        ids, rows = _tuple(self.latent_ids, 'latent IDs'), _tuple(self.rows, 'domain rows')
        if len(set(ids)) != len(ids) or any(not isinstance(i, str) or not i.strip() for i in ids):
            raise ValueError('invalid domain latent IDs')
        if any(not isinstance(row, LinearRow) or len(row.coefficients) != len(ids) for row in rows):
            raise ValueError('domain row dimensions disagree')
        if len({row.row_id for row in rows}) != len(rows):
            raise ValueError('duplicate domain row ID')
        object.__setattr__(self, 'latent_ids', ids)
        object.__setattr__(self, 'rows', rows)
        identity = {'problem_digest': self.problem_digest, 'feasible_candidate_id': self.feasible_candidate_id,
                    'latent_ids': ids, 'rows': rows}
        object.__setattr__(self, 'domain_id', digest(encode(identity)))


def _base_domain(problem):
    dimension = len(problem.latent_ids)
    rows = []
    for index, bound in enumerate(problem.latent_bounds):
        unit = tuple(Fraction(int(i == index)) for i in range(dimension))
        rows.append(LinearRow(f'@box-lower:{index}', tuple(-v for v in unit), -bound.lower))
        rows.append(LinearRow(f'@box-upper:{index}', unit, bound.upper))
    rows.extend(problem.rows)
    return Domain(digest(encode(problem)), None, problem.latent_ids, tuple(rows))


def _candidate_domain(base, candidate):
    rows = tuple(LinearRow(f'@feasible:{index}', expression.coefficients, -expression.constant)
                 for index, expression in enumerate(candidate.constraints.values()))
    return Domain(base.problem_digest, candidate.candidate_id, base.latent_ids, base.rows + rows)


class _Domains:
    """One base identity/row construction, then only the requested Qx domains."""
    def __init__(self, problem):
        self.base = _base_domain(problem)
        self.candidates = {candidate.candidate_id: candidate for candidate in problem.candidates}
        self.cache = {}

    def get(self, candidate_id=None):
        if candidate_id is None:
            return self.base
        if candidate_id not in self.candidates:
            raise ValueError('candidate domain ID is outside the problem')
        if candidate_id not in self.cache:
            self.cache[candidate_id] = _candidate_domain(self.base, self.candidates[candidate_id])
        return self.cache[candidate_id]


def make_domain(problem, feasible_candidate_id=None):
    if not isinstance(problem, CoupledProblem):
        raise TypeError('expected CoupledProblem')
    return _Domains(problem).get(feasible_candidate_id)


def _multipliers(value):
    return MappingProxyType({key: exact(val) for key, val in _mapping(value, 'multipliers').items()})


@dataclass(frozen=True)
class UpperBoundCertificate:
    domain_id: str
    expression: Affine
    upper: Fraction
    multipliers: Mapping[str, Fraction]

    def __post_init__(self):
        nonempty(self.domain_id, 'domain ID')
        if not isinstance(self.expression, Affine):
            raise TypeError('certificate expression must be Affine')
        object.__setattr__(self, 'upper', exact(self.upper))
        object.__setattr__(self, 'multipliers', _multipliers(self.multipliers))


@dataclass(frozen=True)
class InfeasibilityCertificate:
    domain_id: str
    multipliers: Mapping[str, Fraction]
    candidate_id: str | None = None

    def __post_init__(self):
        nonempty(self.domain_id, 'domain ID')
        if self.candidate_id is not None:
            nonempty(self.candidate_id, 'infeasible candidate ID')
        object.__setattr__(self, 'multipliers', _multipliers(self.multipliers))


@dataclass(frozen=True)
class DominanceCertificate:
    candidate_id: str
    witness_id: str
    feasibility: Mapping[str, UpperBoundCertificate]
    improvement: UpperBoundCertificate

    def __post_init__(self):
        nonempty(self.candidate_id, 'excluded candidate ID')
        nonempty(self.witness_id, 'witness ID')
        feasibility = _mapping(self.feasibility, 'feasibility certificates')
        if not isinstance(self.improvement, UpperBoundCertificate) or any(
                not isinstance(value, UpperBoundCertificate) for value in feasibility.values()):
            raise TypeError('dominance requires upper-bound certificates')
        object.__setattr__(self, 'feasibility', MappingProxyType(feasibility))


@dataclass(frozen=True)
class Limits:
    max_operations: int = 100000
    max_certificate_terms: int = 10000
    max_integer_bits: int = 4096
    max_witness_pairs: int = 10000

    def __post_init__(self):
        for name in ('max_operations', 'max_certificate_terms', 'max_integer_bits', 'max_witness_pairs'):
            value = getattr(self, name)
            if isinstance(value, bool) or not isinstance(value, int) or value < 0:
                raise ValueError(f'{name} must be a nonnegative integer')


@dataclass(frozen=True)
class CheckResult:
    status: str
    reason: str
    domain_id: str
    operations_used: int


class _Exhausted(Exception):
    pass


class _Work:
    def __init__(self, limits):
        if not isinstance(limits, Limits):
            raise TypeError('expected Limits')
        self.limits, self.used = limits, 0

    def charge(self, count=1):
        if self.used + count > self.limits.max_operations:
            raise _Exhausted('operation_budget_exhausted')
        self.used += count

    def rational(self, value):
        if max(value.numerator.bit_length(), value.denominator.bit_length()) > self.limits.max_integer_bits:
            raise _Exhausted('exact_integer_budget_exhausted')
        return value

    def add_product(self, total, a, b):
        self.charge(2)
        self.rational(total)
        self.rational(a)
        self.rational(b)
        return self.rational(total + a * b)

    def result(self, status, reason, domain):
        return CheckResult(status, reason, domain.domain_id, self.used)


def _combined(domain, multipliers, work):
    if len(multipliers) > work.limits.max_certificate_terms:
        raise _Exhausted('certificate_term_budget_exhausted')
    rows = {row.row_id: row for row in domain.rows}
    coefficients, upper = [Fraction(0)] * len(domain.latent_ids), Fraction(0)
    for row_id, multiplier in multipliers.items():
        work.charge()
        work.rational(multiplier)
        if row_id not in rows or multiplier < 0:
            raise ValueError('unknown_row_or_negative_multiplier')
        row = rows[row_id]
        for index, coefficient in enumerate(row.coefficients):
            coefficients[index] = work.add_product(coefficients[index], multiplier, coefficient)
        upper = work.add_product(upper, multiplier, row.upper)
    return tuple(coefficients), upper


def _check_upper(domain, certificate, work):
    if not isinstance(certificate, UpperBoundCertificate):
        return work.result('rejected', 'wrong_certificate_type', domain)
    if certificate.domain_id != domain.domain_id:
        return work.result('rejected', 'domain_identity_mismatch', domain)
    if len(certificate.expression.coefficients) != len(domain.latent_ids):
        return work.result('rejected', 'expression_dimension_mismatch', domain)
    try:
        work.charge()
        for value in (*certificate.expression.coefficients, certificate.expression.constant, certificate.upper):
            work.rational(value)
        coefficients, upper = _combined(domain, certificate.multipliers, work)
        work.charge()
        upper = work.rational(upper + certificate.expression.constant)
        if coefficients != certificate.expression.coefficients:
            return work.result('rejected', 'combined_coefficients_do_not_match', domain)
        if upper > certificate.upper:
            return work.result('rejected', 'claimed_upper_bound_not_proved', domain)
        return work.result('verified', 'nonnegative_linear_combination', domain)
    except _Exhausted as exc:
        return work.result('unresolved', str(exc), domain)
    except ValueError as exc:
        return work.result('rejected', str(exc), domain)


def check_upper_bound(domain, certificate, limits=Limits()):
    if not isinstance(domain, Domain):
        raise TypeError('expected Domain')
    return _check_upper(domain, certificate, _Work(limits))


def _check_infeasible(domain, certificate, work):
    if not isinstance(certificate, InfeasibilityCertificate):
        return work.result('rejected', 'wrong_certificate_type', domain)
    if certificate.domain_id != domain.domain_id:
        return work.result('rejected', 'domain_identity_mismatch', domain)
    if certificate.candidate_id != domain.feasible_candidate_id:
        return work.result('rejected', 'infeasibility_candidate_scope_mismatch', domain)
    try:
        work.charge()
        coefficients, upper = _combined(domain, certificate.multipliers, work)
        if any(coefficients):
            return work.result('rejected', 'contradiction_coefficients_not_zero', domain)
        if upper >= 0:
            return work.result('rejected', 'contradiction_not_strict', domain)
        return work.result('verified', 'strict_linear_contradiction', domain)
    except _Exhausted as exc:
        return work.result('unresolved', str(exc), domain)
    except ValueError as exc:
        return work.result('rejected', str(exc), domain)


def check_infeasibility(domain, certificate, limits=Limits()):
    if not isinstance(domain, Domain):
        raise TypeError('expected Domain')
    return _check_infeasible(domain, certificate, _Work(limits))


def _check_point(domain, point, work):
    try:
        point = _rationals(point, 'consistency point')
        if len(point) != len(domain.latent_ids):
            return work.result('rejected', 'point_dimension_mismatch', domain)
        work.charge()
        for value in point:
            work.rational(value)
        for row in domain.rows:
            total = Fraction(0)
            for coefficient, value in zip(row.coefficients, point):
                total = work.add_product(total, coefficient, value)
            work.charge()
            if total > work.rational(row.upper):
                return work.result('rejected', 'point_violates_domain_row', domain)
        return work.result('verified', 'exact_common_feasible_point', domain)
    except _Exhausted as exc:
        return work.result('unresolved', str(exc), domain)
    except (TypeError, ValueError, ZeroDivisionError):
        return work.result('rejected', 'invalid_exact_point', domain)


def check_point(domain, point, limits=Limits()):
    if not isinstance(domain, Domain):
        raise TypeError('expected Domain')
    return _check_point(domain, point, _Work(limits))


def _simple_upper(domain, expression, work):
    """Coordinate bounds and directly matching row normals; no LP search."""
    if len(expression.coefficients) != len(domain.latent_ids):
        raise ValueError('expression dimension mismatch')
    rows = {row.row_id: row for row in domain.rows}
    multipliers = {}
    upper = work.rational(expression.constant)
    for index, coefficient in enumerate(expression.coefficients):
        work.charge()
        work.rational(coefficient)
        if coefficient:
            row_id = f'@box-upper:{index}' if coefficient > 0 else f'@box-lower:{index}'
            if row_id not in rows:
                raise ValueError('coordinate-bound row missing from domain')
            multiplier = abs(coefficient)
            multipliers[row_id] = multiplier
            upper = work.add_product(upper, multiplier, rows[row_id].upper)
    best = UpperBoundCertificate(domain.domain_id, expression, upper, multipliers)
    # Matching a Qx row can prove a witness feasible only where x is feasible.
    for row in domain.rows:
        work.charge(len(row.coefficients) + 1)
        if row.coefficients == expression.coefficients:
            candidate_upper = work.rational(row.upper + expression.constant)
            if candidate_upper < best.upper:
                best = UpperBoundCertificate(domain.domain_id, expression, candidate_upper, {row.row_id: Fraction(1)})
    return best


def simple_upper_certificate(domain, expression, limits=Limits()):
    """Return (certificate or None, check), with budget exhaustion unresolved."""
    if not isinstance(domain, Domain):
        raise TypeError('expected Domain')
    work = _Work(limits)
    if not isinstance(expression, Affine):
        return None, work.result('rejected', 'expected_affine_expression', domain)
    try:
        certificate = _simple_upper(domain, expression, work)
        result = _check_upper(domain, certificate, work)
        return (certificate if result.status == 'verified' else None), result
    except _Exhausted as exc:
        return None, work.result('unresolved', str(exc), domain)
    except ValueError as exc:
        return None, work.result('rejected', str(exc), domain)


def _check_dominance(domains, certificate, work):
    global_domain = domains.base
    if not isinstance(certificate, DominanceCertificate):
        return work.result('rejected', 'wrong_certificate_type', global_domain)
    candidates = domains.candidates
    if certificate.candidate_id not in candidates or certificate.witness_id not in candidates:
        return work.result('rejected', 'candidate_or_witness_outside_problem', global_domain)
    domain = domains.get(certificate.candidate_id)
    candidate, witness = candidates[certificate.candidate_id], candidates[certificate.witness_id]
    if set(certificate.feasibility) != set(witness.constraints):
        return work.result('rejected', 'feasibility_certificate_scope_mismatch', domain)
    if certificate.improvement.expression != witness.score.minus(candidate.score):
        return work.result('rejected', 'improvement_expression_mismatch', domain)
    for key, expression in witness.constraints.items():
        proof = certificate.feasibility[key]
        if proof.expression != expression:
            return work.result('rejected', 'witness_feasibility_expression_mismatch', domain)
        checked = _check_upper(domain, proof, work)
        if checked.status != 'verified':
            return checked
        if proof.upper > 0:
            return work.result('not_applicable', 'witness_feasibility_not_established', domain)
    checked = _check_upper(domain, certificate.improvement, work)
    if checked.status != 'verified':
        return checked
    if certificate.improvement.upper >= 0:
        return work.result('not_applicable', 'strict_improvement_not_established_ties_retained', domain)
    return work.result('verified', 'conditional_feasible_strict_witness', domain)


def check_dominance(problem, certificate, limits=Limits()):
    if not isinstance(problem, CoupledProblem):
        raise TypeError('expected CoupledProblem')
    return _check_dominance(_Domains(problem), certificate, _Work(limits))


@dataclass(frozen=True)
class ProofAssessment:
    source: str
    candidate_id: str | None
    witness_id: str | None
    certificate_digest: str | None
    check: CheckResult


@dataclass(frozen=True)
class CoupledSelection:
    retained: tuple[str, ...]
    certified_feasible: tuple[str, ...]
    interval_infeasible: tuple[str, ...]
    interval_dominated: tuple[str, ...]
    coupled_infeasible: tuple[str, ...]
    coupled_dominated: tuple[str, ...]
    dominance_witnesses: Mapping[str, str]
    exclusion_certificates: Mapping[str, InfeasibilityCertificate | DominanceCertificate]
    coupling_status: str
    consistency: CheckResult
    premise_status: str
    relation_basis: str
    problem_digest: str
    box_selection_diagnostic: Selection
    assessments: tuple[ProofAssessment, ...]
    operations_used: int
    physical_attestation: str = 'not_established_by_this_program'

    def __post_init__(self):
        for name in ('retained', 'certified_feasible', 'interval_infeasible', 'interval_dominated',
                     'coupled_infeasible', 'coupled_dominated', 'assessments'):
            object.__setattr__(self, name, _tuple(getattr(self, name), name))
        object.__setattr__(self, 'dominance_witnesses', MappingProxyType(_mapping(self.dominance_witnesses, 'witnesses')))
        object.__setattr__(self, 'exclusion_certificates', MappingProxyType(_mapping(self.exclusion_certificates, 'exclusion certificates')))


def screen_coupled(problem, consistency_point=None, proofs=(), limits=Limits()):
    """Additional exclusions require admitted assumptions AND common consistency.

Without those gates, even the affine-derived box selection is diagnostic only.
Unknown search outcomes never exclude candidates. This is not a complete test
of possible optimality under all declared coupling rows.
"""
    if not isinstance(problem, CoupledProblem):
        raise TypeError('expected CoupledProblem')
    proofs = _tuple(proofs, 'proofs')
    if any(not isinstance(proof, (InfeasibilityCertificate, DominanceCertificate)) for proof in proofs):
        raise TypeError('screening proofs must be infeasibility or dominance certificates')
    work = _Work(limits)
    domains = _Domains(problem)
    domain = domains.base
    universe = tuple(row.candidate_id for row in problem.candidates)
    def box(expression):
        return linear_interval(tuple(zip(expression.coefficients, problem.latent_bounds)), expression.constant)
    baseline = select(tuple(Candidate(row.candidate_id, box(row.score),
                                      {key: box(expression) for key, expression in row.constraints.items()})
                            for row in problem.candidates))
    assessments, accepted, witnesses = [], {}, {}
    coupled_infeasible, coupled_dominated = set(), set()
    consistency = work.result('unresolved', 'common_feasible_point_missing', domain)
    def result(status, active=False):
        retained = tuple(cid for cid in (baseline.retained if active else universe) if cid not in accepted)
        return CoupledSelection(retained, baseline.certified_feasible if active else (),
            baseline.certified_infeasible if active else (), baseline.dominated if active else (),
            tuple(sorted(coupled_infeasible)), tuple(sorted(coupled_dominated)), witnesses, accepted,
            status, consistency, problem.premise_status, problem.relation_basis, domain.problem_digest,
            baseline, tuple(assessments), work.used)
    if problem.premise_status == 'unsupported' or problem.relation_basis == 'learned_correlation':
        consistency = work.result('unresolved', 'coupling_premise_unsupported', domain)
        return result('unsupported_all_retained')
    if consistency_point is not None:
        consistency = _check_point(domain, consistency_point, work)
    global_proofs = [proof for proof in proofs if isinstance(proof, InfeasibilityCertificate)
                     and proof.candidate_id is None]
    for proof in global_proofs:
        checked = _check_infeasible(domain, proof, work)
        assessments.append(ProofAssessment('supplied', None, None, digest(encode(proof)), checked))
        if checked.status == 'verified':
            consistency = checked
            return result('proved_inconsistent_all_retained')
    if consistency.status != 'verified':
        return result('consistency_unresolved_all_retained')
    for proof in proofs:
        if isinstance(proof, InfeasibilityCertificate):
            if proof.candidate_id is None:
                continue
            cid = proof.candidate_id
            checked = (work.result('rejected', 'candidate_outside_current_problem', domain)
                       if cid not in domains.candidates else _check_infeasible(domains.get(cid), proof, work))
            wid = None
        else:
            cid, wid = proof.candidate_id, proof.witness_id
            checked = _check_dominance(domains, proof, work)
        assessments.append(ProofAssessment('supplied', cid, wid, digest(encode(proof)), checked))
        if checked.status == 'verified' and cid in baseline.retained and cid not in accepted:
            accepted[cid] = proof
            if isinstance(proof, InfeasibilityCertificate):
                coupled_infeasible.add(cid)
            else:
                coupled_dominated.add(cid)
                witnesses[cid] = wid
    pairs = 0
    stopped = False
    for candidate in problem.candidates:
        cid = candidate.candidate_id
        if cid not in baseline.retained or cid in accepted:
            continue
        for witness in problem.candidates:
            if witness.candidate_id == cid or witness.candidate_id in baseline.certified_infeasible:
                continue
            if pairs >= limits.max_witness_pairs:
                assessments.append(ProofAssessment('automatic', cid, witness.candidate_id, None,
                    work.result('unresolved', 'witness_pair_budget_exhausted', domain)))
                stopped = True
                break
            pairs += 1
            candidate_domain = domains.get(cid)
            try:
                proof = DominanceCertificate(cid, witness.candidate_id,
                    {key: _simple_upper(candidate_domain, expression, work) for key, expression in witness.constraints.items()},
                    _simple_upper(candidate_domain, witness.score.minus(candidate.score), work))
                checked = _check_dominance(domains, proof, work)
                proof_digest = digest(encode(proof))
            except _Exhausted as exc:
                proof, proof_digest = None, None
                checked = work.result('unresolved', str(exc), candidate_domain)
            assessments.append(ProofAssessment('automatic', cid, witness.candidate_id, proof_digest, checked))
            if checked.status == 'verified':
                accepted[cid] = proof
                coupled_dominated.add(cid)
                witnesses[cid] = witness.candidate_id
                break
            if checked.status == 'unresolved':
                stopped = True
                break
        if stopped:
            break
    partial = stopped or any(item.check.status == 'unresolved' for item in assessments)
    return result('conditional_partially_screened' if partial else 'conditional_screened', active=True)
