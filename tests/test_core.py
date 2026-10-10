import itertools
import random
import unittest
from fractions import Fraction
from lupine_discovery.core import (Interval, Candidate, select, validate_refinement,
                                    linear_interval, min_interval, max_interval)


class CoreTests(unittest.TestCase):
    def test_exact_and_validation(self):
        self.assertEqual(Interval('0.1', '1/2').lower, Fraction(1, 10))
        for bad in [0.1, float('inf'), float('nan'), True]:
            with self.assertRaises(TypeError): Interval(bad, 1)
        with self.assertRaises(ValueError): Interval(2, 1)
        c = Candidate('a', Interval(0, 1), {})
        with self.assertRaises(ValueError): select([c, c])
        with self.assertRaises(ValueError): select([c, Candidate('b', c.score, {'g': c.score})])
        with self.assertRaises(TypeError): c.constraints['g'] = c.score
        self.assertEqual(select([]).retained, ())

    def test_exhaustive_worlds(self):
        # Every integer interval on {-1,0,1}, all two-candidate rectangles,
        # with and without constraints, and every contained true world.
        endpoints = [(a, b) for a in range(-1, 2) for b in range(a, 2)]
        for constrained in [False, True]:
            for score_pairs in itertools.product(endpoints, repeat=2):
                constraints = itertools.product(endpoints, repeat=2) if constrained else [(None, None)]
                for gs in constraints:
                    cs = [Candidate(str(i), Interval(*score_pairs[i]),
                                    {'g': Interval(*gs[i])} if constrained else {}) for i in range(2)]
                    result = select(cs)
                    axes = [range(a, b + 1) for a, b in score_pairs]
                    if constrained: axes += [range(a, b + 1) for a, b in gs]
                    for world in itertools.product(*axes):
                        feasible = {str(i) for i in range(2) if not constrained or world[2+i] <= 0}
                        self.assertTrue(set(result.certified_feasible) <= feasible <= set(result.possible_feasible))
                        if feasible:
                            optimum = min(world[int(i)] for i in feasible)
                            optimizers = {i for i in feasible if world[int(i)] == optimum}
                            self.assertTrue(optimizers <= set(result.retained))
                            if result.incumbent is not None:
                                self.assertLessEqual(world[int(result.incumbent)] - optimum, result.regret_bound)

    def test_refinement_monotone(self):
        rng = random.Random(214)
        for _ in range(500):
            before, after = [], []
            for i in range(5):
                pairs = []
                for _ in range(3):
                    lo, hi = sorted([rng.randrange(-10, 11), rng.randrange(-10, 11)])
                    nl, nu = sorted([rng.randrange(lo, hi+1), rng.randrange(lo, hi+1)])
                    pairs.append((Interval(lo, hi), Interval(nl, nu)))
                before.append(Candidate(str(i), pairs[0][0], {'a': pairs[1][0], 'b': pairs[2][0]}))
                after.append(Candidate(str(i), pairs[0][1], {'a': pairs[1][1], 'b': pairs[2][1]}))
            validate_refinement(before, after)
            b, a = select(before), select(after)
            self.assertTrue(set(b.certified_feasible) <= set(a.certified_feasible))
            self.assertTrue(set(a.possible_feasible) <= set(b.possible_feasible))
            self.assertTrue(set(a.retained) <= set(b.retained))
            if b.regret_bound is not None and a.regret_bound is not None:
                self.assertLessEqual(a.regret_bound, b.regret_bound)
        with self.assertRaises(ValueError): validate_refinement(before, after[:-1])
        with self.assertRaises(ValueError): validate_refinement([Candidate('x', Interval(0,1), {})], [Candidate('x', Interval(-1,1), {})])

    def test_ties_no_incumbent_and_top_k_counterexample(self):
        tied = [Candidate(i, Interval(1, 1), {}) for i in ['z', 'a']]
        self.assertEqual(select(tied).incumbent, 'a')
        self.assertEqual(select(tied).retained, ('a', 'z'))
        uncertain = [Candidate('a', Interval(0,100), {'g':Interval(-1,1)}), Candidate('b', Interval(1,2), {'g':Interval(-1,1)})]
        self.assertEqual(select(uncertain).retained, ('a', 'b'))
        self.assertIsNone(select(uncertain).regret_bound)
        # Ranking by lower bound and keeping only a drops the true optimum b.
        self.assertTrue(uncertain[0].score.contains(100))
        self.assertTrue(uncertain[1].score.contains(1))
        screened = select([Candidate('a',Interval(0,1),{}),Candidate('b',Interval(2,3),{})])
        self.assertEqual(screened.dominated, ('b',))
        impossible = select([Candidate('a',Interval(0,1),{'g':Interval(1,2)})])
        self.assertEqual(impossible.certified_infeasible, ('a',))

    def test_aggregations(self):
        x, y = Interval(-2,3), Interval(4,5)
        self.assertEqual(linear_interval([(-2,x),(3,y)],1), Interval(7,20))
        self.assertEqual(min_interval([x,y]), x)
        self.assertEqual(max_interval([x,y]), y)
        for fn in [min_interval,max_interval]:
            with self.assertRaises(ValueError): fn([])
