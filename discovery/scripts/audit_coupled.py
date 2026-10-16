#!/usr/bin/env python3
"""Independent finite-world review of the coupled kernel, using synthetic inputs.

The retained-minimizer oracle evaluates affine functions directly; it does not
reuse the kernel's selector or certificate-checking logic. This finite test is
not a formal refinement proof, search-completeness proof, or physical validation.
No scientific archive, target table, or replay report is opened.
"""
import argparse
from dataclasses import replace
from fractions import Fraction as F
import hashlib
import itertools
import json
from pathlib import Path
import random

from lupine_discovery import coupled as c
from lupine_discovery.core import Interval
from lupine_discovery.evidence import Scope

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src/lupine_discovery/coupled.py'
SOURCES = tuple(ROOT / 'src/lupine_discovery' / name for name in
                ('coupled.py', 'core.py', 'evidence.py', 'serialization.py'))
BEFORE = {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest() for path in SOURCES}
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=ROOT / 'reports/coupled-independent-audit.json')
args = parser.parse_args()
checks = 0
worlds = 0


def require(value, label):
    global checks
    checks += 1
    if not value:
        raise ValueError(label)


def problem(candidates, bounds=(), rows=(), status='assumed_unverified', basis='declared_affine_assumption'):
    names = tuple(f'z{i}' for i in range(len(bounds)))
    keys = tuple(candidates[0].constraints) if candidates else ()
    return c.CoupledProblem('independent-synthetic', names, tuple(Interval(*b) for b in bounds),
        Scope('independent-synthetic', 'score', 'u', 'synthetic'),
        {k: Scope('independent-synthetic', k, 'u', 'synthetic') for k in keys},
        tuple(candidates), tuple(rows), status, basis)


def candidate(name, score, constraints=None):
    return c.CoupledCandidate(name, c.Affine(tuple(score[0]), score[1]),
        {k: c.Affine(tuple(v[0]), v[1]) for k, v in (constraints or {}).items()})


def evaluate(expression, point):
    return expression.constant + sum((a*z for a, z in zip(expression.coefficients, point)), F(0))


def check_world(p, output, point):
    global worlds
    for row in p.rows:
        if sum((a*z for a, z in zip(row.coefficients, point)), F(0)) > row.upper:
            return
    feasible = [row for row in p.candidates if all(evaluate(g, point) <= 0 for g in row.constraints.values())]
    if feasible:
        best = min(evaluate(row.score, point) for row in feasible)
        optima = {row.candidate_id for row in feasible if evaluate(row.score, point) == best}
        require(optima <= set(output.retained), 'a tied feasible minimizer was removed')
    worlds += 1


require(Path(c.__file__).resolve() == SOURCE, 'coupled module did not load from this checkout')

# Strictness at the error boundary, including a reversal world.
for radius, expected in [(F(1, 4), ('B',)), (F(1, 2), ('A', 'B')), (F(3, 4), ('A', 'B'))]:
    p = problem([candidate('A', ((1, 1, 0), 1)), candidate('B', ((1, 0, 1), 0))],
                ((0, 2), (-radius, radius), (-radius, radius)))
    out = c.screen_coupled(p, (0, 0, 0))
    require(out.retained == expected, 'wrong strictness/error boundary behavior')
    for point in itertools.product((F(0), F(2)), (-radius, radius), (-radius, radius)):
        check_world(p, out, point)

# A witness may itself later be excluded; every proof keeps the original Qx.
p = problem([candidate('A', ((1,), 2)), candidate('B', ((1,), 1)), candidate('C', ((1,), 0))], ((0, 3),))
out = c.screen_coupled(p, (0,))
require(out.retained == ('C',), 'fixed-domain exclusion chain did not finish')
require(out.dominance_witnesses['A'] == 'B' and out.dominance_witnesses['B'] == 'C', 'chain witnesses changed')
for cid, cert in out.exclusion_certificates.items():
    require(cert.improvement.domain_id == c.make_domain(p, cid).domain_id, 'proof moved to a reduced problem')

# Qx-only feasibility is valid even without any globally feasible witness.
p = problem([candidate('A', ((0,), 1), {'g': ((1,), 0)}),
             candidate('B', ((0,), 0), {'g': ((1,), 0)})], ((-1, 1),))
out = c.screen_coupled(p, (0,))
require(out.retained == ('B',) and not out.certified_feasible, 'conditional witness mislabeled or rejected')
for point in [(F(-1),), (F(0),), (F(1),)]:
    check_world(p, out, point)

# Genuine Qx infeasibility with nonempty P and marginally possible constraints.
p = problem([candidate('A', ((0,), 0), {'left': ((1,), F(1, 2)), 'right': ((-1,), F(1, 2))})], ((-1, 1),))
qd = c.make_domain(p, 'A')
certificate = c.InfeasibilityCertificate(qd.domain_id, {'@feasible:0': 1, '@feasible:1': 1}, candidate_id='A')
out = c.screen_coupled(p, (0,), (certificate,))
require(out.coupled_infeasible == ('A',) and out.retained == (), 'Qx contradiction did not exclude')
require(c.check_infeasibility(qd, replace(certificate, candidate_id='outside')).status == 'rejected',
        'candidate-domain routing label mismatch accepted')

# Whole-universe fallback must not operationalize derived box exclusions.
p = problem([candidate('A', ((), 2)), candidate('B', ((), 0))])
for changed in [replace(p, premise_status='unsupported'), replace(p, relation_basis='learned_correlation')]:
    out = c.screen_coupled(changed, ())
    require(out.retained == ('A', 'B') and out.box_selection_diagnostic.retained == ('B',), 'inactive coupling pruned')
require(c.screen_coupled(p).retained == ('A', 'B'), 'missing consistency still pruned')
require(c.screen_coupled(p, (), limits=c.Limits(max_operations=0)).retained == ('A', 'B'), 'exhaustion still activated')
p_bad = replace(p, rows=(c.LinearRow('impossible', (), -1),))
gd = c.make_domain(p_bad)
out = c.screen_coupled(p_bad, proofs=(c.InfeasibilityCertificate(gd.domain_id, {'impossible': 1}),))
require(out.coupling_status == 'proved_inconsistent_all_retained' and out.retained == ('A', 'B'), 'inconsistent model emptied universe')

# Dual coefficient, constant, sign and complete-domain identity checks.
p = problem([candidate('A', ((1,), 0))], ((-1, 2),))
gd = c.make_domain(p)
certificate = c.UpperBoundCertificate(gd.domain_id, c.Affine((3,), 5), 11, {'@box-upper:0': 3})
require(c.check_upper_bound(gd, certificate).status == 'verified', 'valid dual upper proof rejected')
for bad in [replace(certificate, upper=F(10)), replace(certificate, multipliers={'@box-upper:0': -3}),
            replace(certificate, multipliers={'@box-upper:0': 3, 'unknown': 0}),
            replace(certificate, expression=c.Affine((4,), 5)), replace(certificate, domain_id='stale')]:
    require(c.check_upper_bound(gd, bad).status == 'rejected', 'invalid dual proof accepted')
require(c.check_upper_bound(c.make_domain(replace(p, relation_basis='bounded_error_model')), certificate).status == 'rejected',
        'changed model declaration kept an old proof valid')
require(c.check_infeasibility(gd, c.InfeasibilityCertificate(gd.domain_id, {})).status == 'rejected', 'zero contradiction accepted')
require(c.check_upper_bound(gd, certificate, c.Limits(max_certificate_terms=0)).status == 'unresolved', 'term cap not unresolved')
require(c.check_upper_bound(gd, certificate, c.Limits(max_integer_bits=1)).status == 'unresolved', 'integer cap not unresolved')

# Input copies and returned evidence mappings are immutable at the API boundary.
source = {'@box-upper:0': 3}
copied = c.UpperBoundCertificate(gd.domain_id, c.Affine((3,), 5), 11, source)
source['@box-upper:0'] = -3
require(copied.multipliers['@box-upper:0'] == 3, 'multiplier mutation escaped copy')
for mapping in [copied.multipliers, out.dominance_witnesses, out.exclusion_certificates, p.constraint_scopes]:
    try:
        mapping['attack'] = 1
    except TypeError:
        pass
    else:
        raise ValueError('returned evidence mapping is mutable')
for invalid in [True, 0.5, float('nan')]:
    try:
        c.Affine((invalid,), 0)
    except (TypeError, ValueError):
        pass
    else:
        raise ValueError('inexact affine input accepted')

# Independent finite-world oracle: all tied feasible optima in 500 varied worlds.
rng = random.Random(10341)
for case in range(500):
    rows = []
    for j in range(5):
        score = (tuple(F(rng.randrange(-3, 4)) for _ in range(2)), F(rng.randrange(-2, 3)))
        constraints = {key: (tuple(F(rng.randrange(-2, 3)) for _ in range(2)), F(rng.randrange(-2, 3)))
                       for key in ('g', 'h')}
        rows.append(candidate(str(j), score, constraints))
    p = problem(rows, ((-1, 1), (-1, 1)), (c.LinearRow('shared', (1, 1), 1),))
    out = c.screen_coupled(p, (0, 0))
    require(out.consistency.status == 'verified', 'valid consistency point rejected')
    for point in itertools.product((F(-1), F(-1, 2), F(0), F(1, 2), F(1)), repeat=2):
        check_world(p, out, point)

AFTER = {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest() for path in SOURCES}
require(BEFORE == AFTER, 'source changed during independent probe execution')
receipt = {'schema': 'lupine.discovery.coupled.independent-audit.v1', 'status': 'PASS',
           'source_sha256_before': BEFORE, 'source_sha256_after': AFTER,
           'audit_script_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
           'checks': checks, 'synthetic_worlds_checked': worlds, 'random_problem_count': 500,
           'random_seed': 10341,
           'scope': 'Synthetic algebra and independent finite-world preservation of every tied feasible minimizer.',
           'limits': ['Finite tests, not a formal refinement proof of the Python implementation.',
                      'No proof of complete possible-optimum search or physical validity of affine premises.',
                      'Resource checks concern the documented proof-work limits, not end-to-end runtime or memory.'],
           'scientific_data_read': False,
           'reproduce': ['python', 'scripts/audit_coupled.py', '--output', 'reports/coupled-independent-audit.json']}
raw = (json.dumps(receipt, indent=2, sort_keys=True) + '\n').encode('utf-8')
args.output.parent.mkdir(parents=True, exist_ok=True)
if args.output.exists():
    if args.output.read_bytes() != raw:
        raise ValueError('existing audit receipt differs; choose a fresh output path')
else:
    with args.output.open('xb') as stream:
        stream.write(raw)
print(json.dumps({key: receipt[key] for key in ('status', 'checks', 'synthetic_worlds_checked', 'random_problem_count')}))
