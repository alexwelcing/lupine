import unittest
from fractions import Fraction as F
from unittest.mock import patch

from lupine_discovery.core import Candidate, Interval, select
from lupine_discovery.replay import TruthRow, evaluate


def candidate(cid, lower, upper, cl=-1, cu=-1):
    return Candidate(cid, Interval(F(lower), F(upper)), {"g": Interval(F(cl), F(cu))})


class ReplayTests(unittest.TestCase):
    def test_empty_universe_has_no_empirical_support(self):
        result = evaluate([], [])
        self.assertEqual(result["empirical_soundness"], "not_evaluated_empty_universe")
        self.assertEqual(result["score_coverage_count"], 0)
        self.assertIsNone(result["score_coverage"])

    def test_complete_archive_retains_all_tied_optima(self):
        candidates = [candidate("a", 0, 2), candidate("b", 0, 2), candidate("c", 4, 5)]
        result = evaluate(candidates, [TruthRow(cid, F(score), {"g": F(-1)}) for cid, score in [("a", 1), ("b", 1), ("c", 4)]])
        self.assertEqual(result["true_minimizers"], ("a", "b"))
        self.assertTrue(result["all_true_minimizers_retained"])
        self.assertEqual(result["pool_fraction"], F(2, 3))
        self.assertEqual(result["incumbent_regret"], 0)
        self.assertTrue(result["regret_bound_holds"])

    def test_missing_outcomes_are_unknown(self):
        result = evaluate([candidate("a", 0, 2), candidate("b", 4, 5)], [TruthRow("a", F(1), {"g": F(-1)})])
        self.assertEqual(result["missing_truth_ids"], ("b",))
        self.assertIsNone(result["true_minimizers"])
        self.assertIsNone(result["incumbent_regret"])
        self.assertIsNone(result["per_candidate"]["b"]["score_covered"])
        self.assertEqual(result["score_coverage"], 1)

    def test_unsound_inputs_expose_lost_optimum(self):
        result = evaluate([candidate("a", 1, 2), candidate("b", 4, 5)], [TruthRow("a", F(1), {"g": F(-1)}), TruthRow("b", F(0), {"g": F(-1)})])
        self.assertFalse(result["all_true_minimizers_retained"])
        self.assertEqual(result["empirical_soundness"], "refuted_on_observed_outcomes")

    def test_false_certified_rejection_is_recorded(self):
        result = evaluate([candidate("a", 0, 1, 1, 2)], [TruthRow("a", F(0), {"g": F(-1)})])
        self.assertFalse(result["certified_rejection_correctness"]["a"])

    def test_known_violation_can_verify_rejection_without_score(self):
        result = evaluate([candidate("a", 0, 1, 1, 2)], [TruthRow("a", None, {"g": F(1)})])
        self.assertTrue(result["certified_rejection_correctness"]["a"])
        self.assertEqual(result["outcome_completeness"], "partial")

    def test_selector_never_receives_hidden_outcomes(self):
        candidates = [candidate("a", 0, 2)]
        with patch("lupine_discovery.replay.select", wraps=select) as selector:
            evaluate(candidates, [TruthRow("a", F(100), {"g": F(100)})])
            selector.assert_called_once_with(candidates)

    def test_invalid_truth_identity_rejected(self):
        candidates = [candidate("a", 0, 2)]
        row = TruthRow("a", F(1), {"g": F(-1)})
        with self.assertRaises(ValueError):
            evaluate(candidates, [row, row])
        with self.assertRaises(ValueError):
            evaluate(candidates, [TruthRow("b", F(1), {})])
        with self.assertRaises(ValueError):
            evaluate(candidates, [TruthRow("a", F(1), {"other": F(0)})])

    def test_no_true_feasible_candidate_has_no_optimum_metric(self):
        result = evaluate([candidate("a", 0, 1, 1, 2)], [TruthRow("a", F(0), {"g": F(1)})])
        self.assertEqual(result["true_minimizers"], ())
        self.assertIsNone(result["all_true_minimizers_retained"])
        self.assertIsNone(result["incumbent_regret"])

    def test_nonzero_regret_has_sound_bound(self):
        result = evaluate([candidate("a", 0, 2), candidate("b", 0, 3)], [TruthRow("a", F(2), {"g": F(-1)}), TruthRow("b", F(0), {"g": F(-1)})])
        self.assertEqual(result["incumbent_regret"], 2)
        self.assertTrue(result["regret_bound_holds"])

    def test_missing_constraint_stays_unknown(self):
        result = evaluate([candidate("a", 0, 2)], [TruthRow("a", F(1), {})])
        self.assertIsNone(result["per_candidate"]["a"]["true_feasible"])
        self.assertIsNone(result["per_candidate"]["a"]["constraint_coverage"]["g"])

    def test_unconstrained_feasibility_needs_no_outcome(self):
        result = evaluate([Candidate("a", Interval(F(0), F(1)), {})], [])
        self.assertTrue(result["per_candidate"]["a"]["true_feasible"])
        self.assertIsNone(result["true_feasible_optimum"])


if __name__ == "__main__":
    unittest.main()
