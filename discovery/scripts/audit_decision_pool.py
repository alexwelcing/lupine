"""Independent finite-world counting checks for the proposed statistical pool.

Only constructed exact worlds are used. No runtime selector, calibration helper,
scientific data, random sample, fit, or external probability library is used.
"""
from fractions import Fraction
from hashlib import sha256
from itertools import combinations_with_replacement, permutations, product
import argparse
import json
from pathlib import Path


def truth_oracle(candidate_ids, ranking, scores, constraints):
    """Find all feasible tied minima directly by pairwise truth comparison."""
    ids = tuple(candidate_ids)
    assert len(set(ids)) == len(ids) and set(ranking) == set(ids) and len(ranking) == len(ids)
    assert set(scores) == set(constraints) == set(ids)
    feasible = tuple(sorted(cid for cid in ids if all(value <= 0 for value in constraints[cid].values())))
    minimizers = tuple(cid for cid in feasible if all(scores[cid] <= scores[other] for other in feasible))
    fractions = [Fraction(index + 1, len(ids)) for index, cid in enumerate(ranking) if cid in minimizers]
    score = max(fractions, default=Fraction(0))
    return {'feasible': feasible, 'minimizers': minimizers, 'score': score}


def prefix_oracle(ranking, threshold):
    return tuple(cid for index, cid in enumerate(ranking) if Fraction(index + 1, len(ranking)) <= threshold)


def rank_oracle(count, alpha):
    alpha = Fraction(alpha)
    numerator = (count + 1) * (alpha.denominator - alpha.numerator)
    return (numerator + alpha.denominator - 1) // alpha.denominator


def threshold_oracle(scores, alpha):
    k = rank_oracle(len(scores), alpha)
    return Fraction(1) if k > len(scores) else sorted(scores)[k - 1]


def leave_one_out_audit(max_n=6):
    alphabet = (Fraction(0), Fraction(1, 3), Fraction(2, 3), Fraction(1))
    vectors, cases, comparisons = 0, 0, 0
    for n in range(2, max_n + 1):
        for vector in combinations_with_replacement(alphabet, n):
            vectors += 1
            for k in range(1, n):
                failures = 0
                for index, value in enumerate(vector):
                    other = vector[:index] + vector[index + 1:]
                    failure = value > sorted(other)[k - 1]
                    assert failure == (sum(item < value for item in other) >= k)
                    failures += failure
                    comparisons += 1
                assert failures <= n - k
                cases += 1
    return {'multisets': vectors, 'vector_rank_cases': cases,
            'left_out_comparisons': comparisons, 'maximum_population_size': max_n,
            'all_failure_counts_bounded': True}


def weighted_exchangeable_audit():
    """A nonuniform symmetric finite score law, not just one uniform orbit."""
    alphabet = (Fraction(0), Fraction(1, 3), Fraction(2, 3), Fraction(1))
    worlds = tuple(product(alphabet, repeat=3))
    weight = lambda vector: 1 + vector.count(Fraction(0)) ** 2 + 2 * vector.count(Fraction(1))
    total_weight = sum(weight(vector) for vector in worlds)
    rows = []
    for k in (1, 2):
        indexed_failures = [0, 0, 0]
        for vector in worlds:
            assert all(weight(tuple(order)) == weight(vector) for order in permutations(vector))
            for index, value in enumerate(vector):
                other = vector[:index] + vector[index + 1:]
                indexed_failures[index] += weight(vector) * (value > sorted(other)[k - 1])
        probabilities = tuple(Fraction(count, total_weight) for count in indexed_failures)
        assert len(set(probabilities)) == 1
        assert probabilities[-1] <= Fraction(3 - k, 3)
        rows.append({'k': k, 'failure_probabilities_by_index': list(map(str, probabilities)),
                     'upper_bound': str(Fraction(3 - k, 3))})
    return {'world_count': len(worlds), 'total_integer_weight': total_weight,
            'law': 'weight(vector)=1+count(0)^2+2*count(1)', 'checks': rows}


def counterexample_audit():
    scores = (Fraction(0),) * 19 + (Fraction(1),)
    failures, feasible_tests, feasible_failures = 0, 0, 0
    for index, score in enumerate(scores):
        threshold = threshold_oracle(scores[:index] + scores[index + 1:], Fraction(1, 20))
        failed = score > threshold
        failures += failed
        feasible_tests += score > 0
        feasible_failures += failed and score > 0
    assert (failures, feasible_tests, feasible_failures) == (1, 1, 1)

    ordered = tuple(permutations((Fraction(1, 2), Fraction(1))))
    realized = [(calibration, future > threshold_oracle((calibration,), Fraction(1, 2)))
                for calibration, future in ordered]
    assert sum(failure for _, failure in realized) == 1
    conditioned = [failure for calibration, failure in realized if calibration == Fraction(1, 2)]
    assert conditioned == [True]

    ids = ('first', 'middle', 'last')
    truth = truth_oracle(ids, ids, {'first': 0, 'middle': 1, 'last': 0}, {cid: {} for cid in ids})
    assert truth['score'] == 1 and truth['minimizers'] == ('first', 'last')
    wrong_target_pool = prefix_oracle(ids, Fraction(1, 3))
    assert 'first' in wrong_target_pool and 'last' not in wrong_target_pool
    assert prefix_oracle(ids, Fraction(1, 3)) == ('first',)
    strict_prefix = tuple(cid for index, cid in enumerate(ids) if Fraction(index + 1, 3) < Fraction(1, 3))
    assert strict_prefix == ()
    return {
        'feasible_conditioning': {'exchangeable_test_positions': 20,
            'marginal_retention': str(Fraction(20 - failures, 20)), 'feasible_test_positions': feasible_tests,
            'feasible_conditional_retention': str(Fraction(feasible_tests - feasible_failures, feasible_tests))},
        'realized_calibration_conditioning': {'equally_likely_orders': 2, 'marginal_failure': '1/2',
            'failure_given_calibration_score_one_half': '1'},
        'wrong_best_rank_target': {'all_minimizer_score': '1', 'wrong_best_rank_score': '1/3',
            'lost_minimizers': ['last']},
        'strict_boundary_control': {'weak_pool': ['first'], 'wrong_strict_pool': []},
        'interpretation': 'Counterexamples refute stronger conditional or at-least-one interpretations, not the marginal theorem.',
    }


def audit():
    if not __debug__:
        raise RuntimeError('run this audit without Python optimization so every assertion executes')
    return {'schema': 'lupine.discovery.decision_pool.finite_oracle_review.v1',
            'scope': 'constructed_finite_combinatorial_checks_only',
            'source_sha256': sha256(Path(__file__).read_bytes()).hexdigest(),
            'leave_one_out': leave_one_out_audit(), 'weighted_finite_law': weighted_exchangeable_audit(),
            'negative_controls': counterexample_audit(),
            'limitations': ['No application exchangeability was established.',
                            'No scientific labels or fitted rankers were used.',
                            'This source-only oracle does not itself test the runtime implementation.',
                            'No Python-to-Lean refinement proof is claimed.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    encoded = json.dumps(audit(), indent=2, sort_keys=True) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        if args.output.exists() and args.output.read_text() != encoded:
            raise ValueError('refusing to replace a different audit record')
        args.output.write_text(encoded)
    else:
        print(encoded, end='')


if __name__ == '__main__':
    main()
