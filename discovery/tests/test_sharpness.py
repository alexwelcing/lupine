"""Constructed compatible worlds test interval-box sharpness, not physics."""
from fractions import Fraction
from itertools import combinations, product
import random
import unittest

from lupine_discovery.core import Candidate, Interval, select


def compatible_witness_world(candidates, chosen):
    """Independent endpoint construction; never consults selector membership."""
    return {
        row.candidate_id: {
            'score': row.score.lower if row.candidate_id == chosen else row.score.upper,
            'constraints': {key: bounds.lower if row.candidate_id == chosen else bounds.upper
                            for key, bounds in row.constraints.items()},
        }
        for row in candidates
    }


def true_minimizers(world):
    feasible = {cid: row['score'] for cid, row in world.items()
                if all(value <= 0 for value in row['constraints'].values())}
    if not feasible:
        return set()
    minimum = min(feasible.values())
    return {cid for cid, score in feasible.items() if score == minimum}


class SharpnessTests(unittest.TestCase):
    def check_witness(self, candidates, chosen):
        world = compatible_witness_world(candidates, chosen)
        for candidate in candidates:
            truth = world[candidate.candidate_id]
            self.assertTrue(candidate.score.lower <= truth['score'] <= candidate.score.upper)
            self.assertEqual(set(truth['constraints']), set(candidate.constraints))
            for key, bounds in candidate.constraints.items():
                self.assertTrue(bounds.lower <= truth['constraints'][key] <= bounds.upper)
            if candidate.candidate_id != chosen:
                actual_feasible = all(value <= 0 for value in truth['constraints'].values())
                certified = all(bounds.upper <= 0 for bounds in candidate.constraints.values())
                self.assertEqual(actual_feasible, certified)
        self.assertIn(chosen, true_minimizers(world))
        return world

    def test_every_retained_candidate_has_witness_in_1296_interval_problems(self):
        intervals = [(low, high) for low in (-1, 0, 1) for high in (-1, 0, 1) if low <= high]
        count, witnesses = 0, 0
        for bounds in product(intervals, repeat=4):
            candidates = [Candidate(str(i), Interval(*bounds[i]), {'g': Interval(*bounds[2+i])})
                          for i in range(2)]
            result = select(candidates)
            certified = [row for row in candidates if all(bound.upper <= 0 for bound in row.constraints.values())]
            box_retained = {row.candidate_id for row in candidates
                            if all(bound.lower <= 0 for bound in row.constraints.values())
                            and all(row.score.lower <= other.score.upper for other in certified)}
            self.assertEqual(set(result.retained), box_retained)
            for chosen in result.retained:
                self.check_witness(candidates, chosen)
                witnesses += 1
            count += 1
        self.assertEqual(count, 1296)
        self.assertGreater(witnesses, 1000)

    def test_multiple_constraints_arbitrary_exact_endpoints_and_empty_constraints(self):
        rng = random.Random(84719)
        for trial in range(400):
            constraint_count = trial % 4
            candidates = []
            for index in range(6):
                endpoints = [sorted(Fraction(rng.randrange(-12, 13), rng.randrange(1, 8)) for _ in range(2))
                             for _ in range(1 + constraint_count)]
                candidates.append(Candidate(str(index), Interval(*endpoints[0]),
                                            {str(key): Interval(*endpoints[1+key]) for key in range(constraint_count)}))
            result = select(candidates)
            for chosen in result.retained:
                self.check_witness(candidates, chosen)

    def test_no_incumbent_can_make_even_worst_nominal_candidate_optimal(self):
        candidates = [Candidate('high', Interval(100, 101), {'g': Interval(-1, 1)}),
                      Candidate('middle', Interval(0, 1), {'g': Interval(-1, 1)}),
                      Candidate('low', Interval(-10, -9), {'g': Interval(-1, 1)})]
        result = select(candidates)
        self.assertIsNone(result.incumbent)
        self.assertEqual(set(result.retained), {'high', 'middle', 'low'})
        world = self.check_witness(candidates, 'high')
        self.assertEqual(true_minimizers(world), {'high'})
        self.assertEqual(world['high']['constraints']['g'], -1)
        self.assertEqual(world['low']['constraints']['g'], 1)

    def test_every_strict_pool_subset_has_constructive_lost_minimizer(self):
        candidates = [Candidate('a', Interval(0, 2), {}), Candidate('b', Interval(1, 3), {}),
                      Candidate('c', Interval(2, 4), {}), Candidate('excluded', Interval(5, 6), {})]
        retained = select(candidates).retained
        self.assertEqual(retained, ('a', 'b', 'c'))
        for size in range(len(retained)):
            for subset in combinations(retained, size):
                discarded = next(cid for cid in retained if cid not in subset)
                world = self.check_witness(candidates, discarded)
                self.assertFalse(true_minimizers(world) <= set(subset))

    def test_all_ties_requirement_is_stronger_than_preserving_one_winner(self):
        candidates = [Candidate(cid, Interval(0, 0), {}) for cid in ('a', 'b', 'c')]
        self.assertEqual(select(candidates).retained, ('a', 'b', 'c'))
        world = self.check_witness(candidates, 'c')
        front = true_minimizers(world)
        arbitrary_singleton = {'a'}
        self.assertTrue(front & arbitrary_singleton)
        self.assertFalse(front <= arbitrary_singleton)

    def test_empty_or_proven_infeasible_universe_has_no_required_witness(self):
        self.assertEqual(select([]).retained, ())
        candidates = [Candidate('a', Interval(-100, -99), {'g': Interval(1, 2)})]
        self.assertEqual(select(candidates).retained, ())
        world = compatible_witness_world(candidates, 'a')
        self.assertEqual(true_minimizers(world), set())

    def test_extra_coupling_can_exclude_an_interval_box_witness(self):
        candidates = [Candidate('a', Interval(0, 10), {}), Candidate('b', Interval(0, 10), {})]
        self.assertEqual(select(candidates).retained, ('a', 'b'))
        constructed = self.check_witness(candidates, 'a')
        self.assertEqual(true_minimizers(constructed), {'a'})
        # Additional information s(b)=s(a)-1 rules out this endpoint world.
        # It was never supplied to the independent-box selector or theorem.
        self.assertNotEqual(constructed['b']['score'], constructed['a']['score'] - 1)
        for a_score in range(1, 11):
            coupled = {'a': {'score': Fraction(a_score), 'constraints': {}},
                       'b': {'score': Fraction(a_score - 1), 'constraints': {}}}
            self.assertEqual(true_minimizers(coupled), {'b'})


if __name__ == '__main__':
    unittest.main()
