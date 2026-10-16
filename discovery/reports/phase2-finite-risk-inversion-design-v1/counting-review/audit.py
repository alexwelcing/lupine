#!/usr/bin/env python3
"""Constructed finite worlds only; no product imports, network, or data access."""
from collections import Counter
from fractions import Fraction
from hashlib import sha256
from itertools import combinations, permutations
from math import comb
from pathlib import Path
import json

COUNTS = Counter()

def check(predicate, family):
    COUNTS['assertions'] += 1
    COUNTS['assertions:' + family] += 1
    if not predicate:
        raise AssertionError(family)

def choose(n, a):
    return comb(n, a) if 0 <= a <= n else 0

def formula_cdf(M, e, K, k):
    return Fraction(sum(choose(K, x) * choose(M-K, e-x) for x in range(k+1)), comb(M, e))

def frac(x):
    return f'{x.numerator}/{x.denominator}'

all_distributions = []
per_M = []
base_etas = {Fraction(1,2), Fraction(1,3), Fraction(1,6), Fraction(1,20)}
for M in range(1, 9):
    before = COUNTS.copy()
    frame = tuple(range(M))
    worlds = range(1 << M)
    COUNTS['binary_label_worlds'] += len(worlds)
    samples_by_e = {
        e: tuple(sum(1 << i for i in sample) for sample in combinations(frame, e))
        for e in range(M+1)
    }
    # The oracle literally counts each subset against each binary label vector.
    world_counts = {}
    canonical = {}
    atoms = {Fraction(0), Fraction(1)}
    for e, samples in samples_by_e.items():
        check(len(samples) == comb(M,e), 'subset_cardinality')
        for world in worlds:
            K = world.bit_count()
            dist_counter = Counter((world & sample).bit_count() for sample in samples)
            counts = tuple(dist_counter[k] for k in range(e+1))
            COUNTS['world_sample_distributions'] += 1
            COUNTS['explicit_world_subset_allocations'] += len(samples)
            world_counts[e,world] = counts
            check(sum(counts) == len(samples), 'counted_distribution_normalized')
            cdf = tuple(Fraction(sum(counts[:k+1]), len(samples)) for k in range(e+1))
            if (e,K) not in canonical:
                canonical[e,K] = (counts,cdf)
                COUNTS['canonical_M_e_K_distributions'] += 1
                all_distributions.append({'M':M,'e':e,'K':K,'counts':list(counts),'subsets':len(samples),'cdf':[frac(p) for p in cdf]})
            check(canonical[e,K] == (counts,cdf), 'all_label_permutation_invariance')
        for K in range(M+1):
            counts,cdf = canonical[e,K]
            for k in range(e+1):
                p_formula = formula_cdf(M,e,K,k)
                check(cdf[k] == p_formula, 'comb_formula_equals_counted_cdf')
                check((counts[k] > 0) == (max(0,e-(M-K)) <= k <= min(e,K)), 'hypergeometric_support')
                check(Fraction(0) <= cdf[k] <= Fraction(1), 'cdf_range')
                atoms.add(cdf[k])
                if k:
                    check(cdf[k-1] <= cdf[k], 'cdf_monotone_in_observation')
                if K:
                    check(canonical[e,K-1][1][k] >= cdf[k], 'cdf_antitone_in_K')
    ordered_atoms = sorted(atoms)
    # Include every attainable nontrivial CDF equality and both adjacent sides.
    etas = sorted(base_etas | {p for p in atoms if 0 < p < 1} |
                  {(left+right)/2 for left,right in zip(ordered_atoms,ordered_atoms[1:])})
    COUNTS['M_eta_values'] += len(etas)
    COUNTS['nontrivial_CDF_boundaries'] += len(atoms)-2
    U_table = {}
    exact_equality_rejections = 0
    for e,samples in samples_by_e.items():
        previous_U = None
        for eta in etas:
            U_values = []
            for k in range(e+1):
                oracle_accepted = [K for K in range(M+1) if canonical[e,K][1][k] > eta]
                formula_accepted = [K for K in range(M+1) if formula_cdf(M,e,K,k) > eta]
                check(bool(oracle_accepted), 'acceptance_nonempty')
                U = max(formula_accepted)
                check(U == max(oracle_accepted), 'comb_inversion_equals_counting_oracle')
                check(oracle_accepted == list(range(U+1)), 'acceptance_initial_segment')
                check(k <= U <= M-e+k, 'endpoint_support')
                for K in range(M+1):
                    check((K > U) == (canonical[e,K][1][k] <= eta), 'pointwise_rejection_equivalence')
                    if canonical[e,K][1][k] == eta:
                        check(K > U, 'equality_is_rejected')
                        exact_equality_rejections += 1
                U_values.append(U)
                COUNTS['inversion_endpoints'] += 1
            U_table[e,eta] = tuple(U_values)
            check(U_values == sorted(U_values), 'endpoint_monotone_in_observation')
            if previous_U is not None:
                check(all(new <= old for new,old in zip(U_values,previous_U)), 'endpoint_antitone_in_eta')
            previous_U = U_values
            check(U_values[-1] == M, 'all_sampled_fail_upper_endpoint')
            if e == 0:
                check(U_values == [M], 'no_sample_endpoint')
            if e == M:
                check(U_values == list(range(M+1)), 'census_endpoints')
            # Directly count coverage on every labeled population and every subset.
            # It does not rely on the comb formula or inferred distribution weights.
            for world in worlds:
                K = world.bit_count()
                missed = sum(K > U_values[(world & sample).bit_count()] for sample in samples)
                pvalue_rejects = sum(canonical[e,K][1][(world & sample).bit_count()] <= eta for sample in samples)
                check(missed == pvalue_rejects, 'allocation_event_equivalence')
                check(Fraction(missed,len(samples)) <= eta, 'actual_subset_coverage')
                COUNTS['world_eta_coverage_checks'] += 1
                COUNTS['coverage_subset_allocations_recounted'] += len(samples)
    COUNTS['CDF_equality_rejections_checked'] += exact_equality_rejections
    # Synthetic rho grid covers every ceil(rho*M) cell, its interior and integer boundaries.
    # rho=1 is checked only as the note's mathematical extension, not an API-domain claim.
    rhos = sorted({Fraction(K,M) for K in range(1,M+1)} |
                  {Fraction(2*K-1,2*M) for K in range(1,M+1)})
    for rho in rhos:
        K0 = (rho.numerator*M + rho.denominator-1)//rho.denominator
        for eta in etas:
            qualifies = []
            for e in range(M+1):
                U_values = U_table[e,eta]
                for k,U in enumerate(U_values):
                    oracle_reject = canonical[e,K0][1][k] <= eta
                    check((U < K0) == oracle_reject, 'composite_null_equivalence')
                    check((Fraction(U,M) < rho) == oracle_reject, 'risk_ceiling_equivalence')
                zero_tail = Fraction(choose(M-K0,e),comb(M,e))
                check(zero_tail == canonical[e,K0][1][0], 'zero_failure_comb_identity')
                check((zero_tail <= eta) == (Fraction(U_values[0],M) < rho), 'planner_qualifying_equivalence')
                if e > 0 and zero_tail <= eta:
                    qualifies.append(e)
            check(bool(qualifies), 'census_qualifies_positive_null')
            first = min(qualifies)
            check(qualifies == list(range(first,M+1)), 'qualifying_sample_size_tail')
            for cap in range(M+1):
                planned = next((e for e in range(1,cap+1)
                                if Fraction(choose(M-K0,e),comb(M,e)) <= eta),None)
                inverted = next((e for e in range(1,cap+1)
                                 if Fraction(U_table[e,eta][0],M) < rho),None)
                check(planned == inverted, 'first_positive_sample_and_cap_equivalence')
                check((planned is None) == (cap < first), 'cap_resolution_boundary')
                COUNTS['planner_cap_cases'] += 1
    # Eta endpoint observations are separate from the admissible 0<eta<1 audit.
    for e in range(M+1):
        for k in range(e+1):
            at_zero = [K for K in range(M+1) if canonical[e,K][1][k] > 0]
            at_one = [K for K in range(M+1) if canonical[e,K][1][k] > 1]
            check(max(at_zero) == M-e+k, 'eta_zero_support_limit')
            check(at_one == [], 'eta_one_empty_acceptance')
    per_M.append({'M':M,'etas':[frac(p) for p in etas],
                  'CDF_atoms':[frac(p) for p in ordered_atoms],
                  'count_deltas':dict(sorted((key,COUNTS[key]-before[key]) for key in COUNTS))})

# Direct permutation audit of the optional-stopping counterexample.
M=4
failed={0,1}
paths=[]
first_rejects=additional_rejects=fixed_three_rejects=0
for order in permutations(range(M)):
    first_k = int(order[0] in failed)
    three_k = sum(i in failed for i in order[:3])
    first_reject = formula_cdf(4,1,2,first_k) <= Fraction(1,2)
    three_reject = formula_cdf(4,3,2,three_k) <= Fraction(1,2)
    first_rejects += first_reject
    additional_rejects += (not first_reject and three_reject)
    fixed_three_rejects += three_reject
    paths.append({'order':list(order),'first_k':first_k,'three_k':three_k,
                  'first_reject':first_reject,'fixed_three_reject':three_reject,
                  'stopped_reject':first_reject or three_reject})
COUNTS['optional_stopping_permutations'] = len(paths)
check(first_rejects == 12, 'optional_stopping_first_branch')
check(additional_rejects == 4, 'optional_stopping_extra_branch')
check(fixed_three_rejects == 12, 'fixed_three_nominal_probability')
check(Fraction(first_rejects+additional_rejects,len(paths)) == Fraction(2,3) > Fraction(1,2), 'optional_stopping_false_rejection')
# Hand-derived equality example in the note.
manual_U = [max(K for K in range(5) if formula_cdf(4,2,K,k) > Fraction(1,6)) for k in range(3)]
check(manual_U == [1,3,4], 'hand_equality_example_endpoints')
check(formula_cdf(4,2,2,0) == Fraction(1,6), 'hand_equality_example_atom')
result = {
    'status':'PASS',
    'scope':'Constructed binary finite worlds M=1..8; executable finite validation only, not a general proof, runtime refinement, data analysis, or physical evidence.',
    'counts':dict(sorted(COUNTS.items())),
    'per_M':per_M,
    'optional_stopping':{'permutations':len(paths),'first_rejections':first_rejects,'additional_rejections':additional_rejects,'fixed_three_rejections':fixed_three_rejects,'false_rejection':'2/3','eta':'1/2'},
    'hand_equality_example':{'M':4,'e':2,'eta':'1/6','upper_counts':manual_U},
}
base=Path(__file__).resolve().parent
for name,value in [('result.json',result),('exact-distributions.json',all_distributions),('optional-stopping-paths.json',paths)]:
    with (base/name).open('x') as handle:
        json.dump(value,handle,indent=2,sort_keys=True)
        handle.write('\n')
print(json.dumps({'status':'PASS','counts':result['counts'],'optional_stopping':result['optional_stopping']},sort_keys=True))
