import itertools
import random
import unittest
from fractions import Fraction

from lupine_discovery.core import Candidate, Interval, select
from lupine_discovery.pareto import (
    ParetoCandidate, refine_pareto_selection, select_pareto, validate_pareto_refinement,
)


def candidate(candidate_id, objectives, constraints=None):
    return ParetoCandidate(candidate_id, {key: Interval(*pair) for key, pair in objectives.items()},
                           {key: Interval(*pair) for key, pair in (constraints or {}).items()})


def truth_front(objectives, constraints):
    """Truth-only oracle: no interval endpoints, witnesses, or selector calls."""
    feasible = {key for key, values in constraints.items() if all(value <= 0 for value in values)}
    front = set()
    for key in feasible:
        better = False
        for other in feasible - {key}:
            comparisons = [left - right for left, right in zip(objectives[other], objectives[key])]
            if max(comparisons) <= 0 and min(comparisons) < 0:
                better = True
                break
        if not better:
            front.add(key)
    return feasible, front


class ParetoTests(unittest.TestCase):
    def test_exhaustive_contained_worlds(self):
        # All intervals on {-1, 0, 1}, two candidates, two objectives, and one
        # constraint. Every contained integer world is checked independently:
        # 46,656 interval problems and 1,000,000 compatible true worlds.
        endpoints = tuple((low, high) for low in (-1, 0, 1)
                          for high in (-1, 0, 1) if low <= high)
        problem_count = world_count = 0
        for bounds in itertools.product(endpoints, repeat=6):
            candidates = [candidate(str(i), {'x': bounds[2*i], 'y': bounds[2*i+1]},
                                    {'g': bounds[4+i]}) for i in range(2)]
            result = select_pareto(candidates)
            certified, possible, retained = map(set, (result.certified_feasible,
                                                      result.possible_feasible, result.retained))
            problem_count += 1
            for world in itertools.product(*(range(low, high + 1) for low, high in bounds)):
                objectives = {'0': world[0:2], '1': world[2:4]}
                feasible, front = truth_front(objectives, {'0': (world[4],), '1': (world[5],)})
                self.assertTrue(certified <= feasible <= possible)
                self.assertTrue(front <= retained)
                for excluded, witness in result.dominance_witnesses.items():
                    self.assertIn(witness, feasible)
                    self.assertTrue(all(left <= right for left, right in
                                        zip(objectives[witness], objectives[excluded])))
                    self.assertTrue(any(left < right for left, right in
                                        zip(objectives[witness], objectives[excluded])))
                world_count += 1
        self.assertEqual(problem_count, 46656)
        self.assertEqual(world_count, 1000000)

    def test_exact_front_and_duplicate_objective_ties(self):
        candidates = [candidate(f'{x},{y}', {'x': (x, x), 'y': (y, y)})
                      for x in range(3) for y in range(3)]
        candidates.append(candidate('duplicate', {'y': (0, 0), 'x': (0, 0)}))
        result = select_pareto(candidates)
        self.assertEqual(result.retained, ('0,0', 'duplicate'))
        feasible, front = truth_front(
            {row.candidate_id: tuple(row.objectives[key].lower for key in ('x', 'y'))
             for row in candidates}, {row.candidate_id: () for row in candidates})
        self.assertEqual(set(result.retained), front)
        self.assertEqual(set(result.certified_feasible), feasible)
        self.assertFalse(hasattr(result, 'regret_bound'))
        self.assertFalse(hasattr(result, 'incumbent'))

    def test_tradeoffs_are_not_scalarized_or_truncated(self):
        candidates = [candidate(str(i), {'cost': (i, i), 'failure': (4-i, 4-i)})
                      for i in range(5)]
        result = select_pareto(candidates)
        self.assertEqual(result.retained, ('0', '1', '2', '3', '4'))
        self.assertFalse(result.dominated)
        self.assertFalse(result.dominance_witnesses)

    def test_only_certified_feasible_witness_can_exclude(self):
        candidates = [candidate('uncertain-best', {'x': (0, 0), 'y': (0, 0)}, {'g': (-1, 1)}),
                      candidate('feasible-worse', {'x': (1, 1), 'y': (1, 1)}, {'g': (-1, 0)}),
                      candidate('infeasible-best', {'x': (-1, -1), 'y': (-1, -1)}, {'g': (1, 2)})]
        result = select_pareto(candidates)
        self.assertEqual(result.certified_feasible, ('feasible-worse',))
        self.assertEqual(result.retained, ('feasible-worse', 'uncertain-best'))
        self.assertEqual(result.certified_infeasible, ('infeasible-best',))
        self.assertFalse(result.dominance_witnesses)
        uncertain = [candidate('a', {'x': (0, 0)}, {'g': (-1, 1)}),
                     candidate('b', {'x': (1, 1)}, {'g': (-1, 1)})]
        self.assertEqual(select_pareto(uncertain).retained, ('a', 'b'))

    def test_strict_coordinate_and_interval_overlap(self):
        candidates = [candidate('a', {'x': (0, 1), 'y': (0, 1)}),
                      candidate('touch', {'x': (1, 2), 'y': (1, 2)}),
                      candidate('strict', {'x': (1, 2), 'y': (2, 3)}),
                      candidate('overlap', {'x': ('1/2', 2), 'y': (2, 3)})]
        result = select_pareto(candidates)
        self.assertEqual(result.retained, ('a', 'overlap', 'touch'))
        self.assertEqual(dict(result.dominance_witnesses), {'strict': 'a'})

    def test_unsound_interval_negative_control_loses_true_front(self):
        # The engine cannot repair a false enclosure premise. This case must
        # exhibit the scientific failure, not count as sound-world evidence.
        candidates = [candidate('false-witness', {'x': (0, 0), 'y': (0, 0)}),
                      candidate('true-optimum', {'x': (1, 1), 'y': (1, 1)})]
        result = select_pareto(candidates)
        true_values = {'false-witness': (2, 2), 'true-optimum': (1, 1)}
        _, true_front = truth_front(true_values, {key: () for key in true_values})
        self.assertFalse(candidates[0].objectives['x'].contains(2))
        self.assertEqual(true_front, {'true-optimum'})
        self.assertFalse(true_front <= set(result.retained))
        self.assertEqual(dict(result.dominance_witnesses), {'true-optimum': 'false-witness'})

    def test_witnesses_and_serial_order_are_deterministic(self):
        candidates = [candidate('z', {'x': (0, 0), 'y': (1, 1)}),
                      candidate('a', {'y': (0, 0), 'x': (1, 1)}),
                      candidate('excluded', {'x': (2, 3), 'y': (2, 4)})]
        expected = select_pareto(candidates)
        self.assertEqual(dict(expected.dominance_witnesses), {'excluded': 'a'})
        for permutation in itertools.permutations(candidates):
            self.assertEqual(select_pareto(permutation), expected)
        with self.assertRaises(TypeError):
            expected.dominance_witnesses['excluded'] = 'z'

    def test_exact_fraction_order_beyond_binary_float(self):
        small = Fraction(2**60, 3)
        large = small + Fraction(1, 10**20)
        self.assertEqual(float(small), float(large))
        candidates = [candidate('smaller', {'x': (small, small), 'y': ('0.1', '1/10')}),
                      candidate('larger', {'x': (large, large), 'y': ('0.1', '1/10')})]
        self.assertEqual(select_pareto(candidates).retained, ('smaller',))
        self.assertEqual(candidates[0].objectives['y'].lower, Fraction(1, 10))
        for bad in (0.1, True, float('inf'), float('nan')):
            with self.assertRaises(TypeError):
                candidate('bad', {'x': (bad, 1)})

    def test_empty_and_wholly_infeasible_universes(self):
        empty = select_pareto([])
        self.assertEqual(empty.retained, ())
        self.assertEqual(empty.certified_infeasible, ())
        self.assertFalse(empty.dominance_witnesses)
        impossible = [candidate('a', {'x': (0, 1)}, {'g': (1, 2)}),
                      candidate('b', {'x': (0, 1)}, {'g': (2, 2)})]
        result = select_pareto(impossible)
        self.assertEqual(result.possible_feasible, ())
        self.assertEqual(result.certified_infeasible, ('a', 'b'))
        self.assertEqual(result.dominated, ())

    def test_validation_and_immutable_input_snapshots(self):
        row = candidate('a', {'x': (0, 1)})
        for bad in ('', '  ', None, 4):
            with self.assertRaises(ValueError):
                ParetoCandidate(bad, {'x': Interval(0, 1)}, {})
        with self.assertRaises(ValueError):
            ParetoCandidate('a', {}, {})
        for bad in ([], None, {'': Interval(0, 1)}, {2: Interval(0, 1)}, {'x': (0, 1)}):
            with self.assertRaises(TypeError):
                ParetoCandidate('a', bad, {})
            with self.assertRaises(TypeError):
                ParetoCandidate('a', {'x': Interval(0, 1)}, bad)
        with self.assertRaises(ValueError):
            select_pareto([row, row])
        with self.assertRaises(TypeError):
            select_pareto([Candidate('a', Interval(0, 1), {})])
        with self.assertRaises(ValueError):
            select_pareto([row, candidate('b', {'y': (0, 1)})])
        with self.assertRaises(ValueError):
            select_pareto([row, candidate('b', {'x': (0, 1)}, {'g': (-1, 1)})])
        objectives, constraints = {'x': Interval(0, 1)}, {'g': Interval(-1, 1)}
        snapshot = ParetoCandidate('snapshot', objectives, constraints)
        objectives.clear()
        constraints.clear()
        self.assertEqual(set(snapshot.objectives), {'x'})
        self.assertEqual(set(snapshot.constraints), {'g'})
        with self.assertRaises(TypeError):
            snapshot.objectives['x'] = Interval(2, 3)

    def test_refinement_monotonicity_and_witness_preservation(self):
        rng = random.Random(4004)
        for _ in range(500):
            before, after = [], []
            for i in range(6):
                pairs = []
                for _ in range(5):
                    low, high = sorted(rng.randrange(-10, 11) for _ in range(2))
                    new_low, new_high = sorted(rng.randrange(low, high+1) for _ in range(2))
                    pairs.append((Interval(low, high), Interval(new_low, new_high)))
                before.append(ParetoCandidate(str(i), {str(j): pairs[j][0] for j in range(3)},
                                              {str(j): pairs[j+3][0] for j in range(2)}))
                after.append(ParetoCandidate(str(i), {str(j): pairs[j][1] for j in range(3)},
                                             {str(j): pairs[j+3][1] for j in range(2)}))
            initial = select_pareto(before)
            refined = refine_pareto_selection(before, after)
            self.assertTrue(set(initial.certified_feasible) <= set(refined.certified_feasible))
            self.assertTrue(set(refined.possible_feasible) <= set(initial.possible_feasible))
            self.assertTrue(set(refined.retained) <= set(initial.retained))
            for excluded, witness in initial.dominance_witnesses.items():
                first, second = after[int(witness)], after[int(excluded)]
                self.assertTrue(all(bound.upper <= 0 for bound in first.constraints.values()))
                self.assertTrue(all(first.objectives[key].upper <= second.objectives[key].lower
                                    for key in first.objectives))
                self.assertTrue(any(first.objectives[key].upper < second.objectives[key].lower
                                    for key in first.objectives))

    def test_refinement_rejects_identity_scope_and_interval_changes(self):
        before = [candidate('a', {'x': (0, 2)}, {'g': (-1, 1)})]
        alternatives = [[], [candidate('b', {'x': (0, 2)}, {'g': (-1, 1)})],
                        [candidate('a', {'y': (0, 2)}, {'g': (-1, 1)})],
                        [candidate('a', {'x': (0, 2)}, {'h': (-1, 1)})],
                        [candidate('a', {'x': (-1, 2)}, {'g': (-1, 1)})],
                        [candidate('a', {'x': (0, 2)}, {'g': (-1, 2)})]]
        for after in alternatives:
            with self.assertRaises(ValueError):
                validate_pareto_refinement(before, after)
        self.assertEqual(refine_pareto_selection([], []).retained, ())

    def test_single_objective_agrees_with_scalar_pool(self):
        rng = random.Random(4104)
        for _ in range(200):
            rows = []
            for i in range(6):
                low, high = sorted(rng.randrange(-10, 11) for _ in range(2))
                gl, gu = sorted(rng.randrange(-2, 3) for _ in range(2))
                rows.append(candidate(str(i), {'score': (low, high)}, {'g': (gl, gu)}))
            scalar = select([Candidate(row.candidate_id, row.objectives['score'], row.constraints)
                             for row in rows])
            pareto = select_pareto(rows)
            for field in ('certified_feasible', 'possible_feasible', 'retained',
                          'certified_infeasible', 'dominated'):
                self.assertEqual(getattr(scalar, field), getattr(pareto, field))


if __name__ == '__main__':
    unittest.main()
