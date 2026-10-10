"""Independent expected solutions and adversarial integrity checks for fixtures."""
from copy import deepcopy
from dataclasses import replace
from fractions import Fraction
from importlib.resources import files
import json
from pathlib import Path
import unittest
from unittest.mock import patch

from lupine_discovery import benchmarks
from lupine_discovery.cli import certificate
from lupine_discovery.core import select
from lupine_discovery.evidence import digest
from lupine_discovery.serialization import parse_problem


class KnownAnswerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = benchmarks.run_known_answers()
        cls.cases = {case["id"]: case for case in cls.report["cases"]}

    def test_predeclared_answers_and_negative_controls_are_separate(self):
        self.assertEqual(self.report["summary"], {"total": 13, "passed": 13, "failed": 0})
        self.assertEqual(self.report["sound_case_metrics"]["total"], 11)
        self.assertEqual(self.report["sound_case_metrics"]["cases_with_feasible_optima"], 10)
        self.assertEqual(self.report["sound_case_metrics"]["cases_retaining_all_optima"], 10)
        controls = self.report["negative_control_metrics"]
        self.assertEqual(controls["total"], 2)
        self.assertEqual(controls["lost_optimum_cases"], 2)
        self.assertTrue(controls["not_counted_as_sound_case_successes"])
        self.assertIn("unestablished", self.report["physical_validation_status"])
        self.assertIn("negative-control passes mean failures were exposed", self.report["pass_meaning"])

    def test_grid_formula_solution_and_nontrivial_pool_reduction(self):
        case = self.cases["integer-design-grid"]
        observed = case["observed"]
        self.assertEqual(observed["true_minimizers"], ["x3-y5"])
        self.assertEqual(observed["candidate_count"], 81)
        self.assertEqual(observed["true_feasible_count"], 35)
        self.assertEqual(observed["pool_size"], 1)
        self.assertTrue(case["checks"]["stored_truth_matches_independent_formula_enumeration"])

    def test_feasibility_ties_and_regret_are_not_conflated(self):
        self.assertEqual(self.cases["tied-optima"]["observed"]["retained"], ["A", "B"])
        uncertain = self.cases["uncertified-optimum"]["observed"]
        self.assertNotEqual(uncertain["incumbent"], uncertain["true_minimizers"][0])
        self.assertEqual(uncertain["incumbent_regret"], "4")
        tight = self.cases["tight-nonzero-regret"]["observed"]
        self.assertEqual(tight["incumbent_regret"], tight["regret_bound"])
        self.assertEqual(tight["regret_bound"], "2")
        unresolved = self.cases["no-incumbent"]["observed"]
        self.assertIsNone(unresolved["incumbent"])
        self.assertIsNone(unresolved["regret_bound"])
        infeasible = self.cases["finite-infeasible"]["observed"]
        self.assertEqual(infeasible["true_minimizers"], [])
        self.assertIsNone(infeasible["all_true_minimizers_retained"])

    def test_exact_rational_fixture_defeats_float_rounding(self):
        values = benchmarks.get_case("exact-rational-order")["problem"]["candidates"]
        a, b = (Fraction(row["score"][0]) for row in values[:2])
        self.assertLess(a, b)
        self.assertEqual(float(a), float(b))
        self.assertEqual(self.cases["exact-rational-order"]["observed"]["retained"], ["A"])

    def test_refinement_preserves_scope_and_shrinks_pool(self):
        check = self.report["refinement_check"]
        self.assertTrue(check["same_semantic_scope"])
        self.assertTrue(check["intervals_nested"])
        self.assertTrue(check["retained_subset"])
        self.assertTrue(check["regret_bound_nonincreasing"])
        self.assertEqual((check["pool_size_before"], check["pool_size_after"]), (6, 1))

    def test_catalog_never_reveals_answers(self):
        allowed = {"id", "title", "description", "kind", "has_outcomes"}
        for entry in benchmarks.case_catalog():
            self.assertEqual(set(entry), allowed)
            case = benchmarks.get_case(entry["id"])
            self.assertEqual(set(case), {"id", "title", "description", "kind", "problem"})
            self.assertNotIn("outcomes", case["problem"])
            self.assertNotIn("expected", case)
            self.assertLessEqual(len(case["problem"]["candidates"]), 200)
            certificate(case["problem"])

    def test_outcomes_are_bound_to_the_entire_problem(self):
        problem = benchmarks.get_case("tied-optima")["problem"]
        outcomes = benchmarks.get_case_outcomes("tied-optima", problem)
        self.assertEqual(outcomes["problem_digest"], digest(problem))
        edited = deepcopy(problem)
        edited["candidates"][0]["score"] = ["-100", "100"]
        with self.assertRaisesRegex(ValueError, "unchanged packaged problem"):
            benchmarks.get_case_outcomes("tied-optima", edited)
        edited = deepcopy(problem)
        edited["scenario"]["objective"]["unit"] = "changed-unit"
        with self.assertRaises(ValueError):
            benchmarks.get_case_outcomes("tied-optima", edited)
        with self.assertRaises(ValueError):
            benchmarks.get_case("../../archived-v1")

    def test_resource_reads_return_independent_values(self):
        case = benchmarks.get_case("tied-optima")
        case["problem"]["candidates"].clear()
        self.assertEqual(len(benchmarks.get_case("tied-optima")["problem"]["candidates"]), 4)
        archive = benchmarks.archived_reports()
        archive["tasks"].clear()
        self.assertEqual(len(benchmarks.archived_reports()["tasks"]), 2)

    def test_selection_occurs_before_outcomes_are_opened(self):
        state = {"selected": False}
        read = benchmarks._resource

        def tracked_select(candidates):
            result = select(candidates)
            state["selected"] = True
            return result

        def guarded_read(name):
            if name.startswith("outcomes/"):
                self.assertTrue(state["selected"], "outcomes were opened before selection")
            return read(name)

        with patch.object(benchmarks, "select", tracked_select), patch.object(benchmarks, "_resource", guarded_read):
            benchmarks._run_case(benchmarks._entry("tied-optima"))

    def test_top_one_regression_cannot_receive_a_passing_report(self):
        def truncate(candidates):
            result = select(candidates)
            return replace(result, retained=result.retained[:1])

        with patch.object(benchmarks, "select", truncate):
            report = benchmarks.run_known_answers()
        self.assertGreater(report["summary"]["failed"], 0)
        tied = next(case for case in report["cases"] if case["id"] == "tied-optima")
        self.assertFalse(tied["checks"]["all_feasible_optima_retained"])
        self.assertEqual(tied["status"], "fail")

    def test_corrupted_truth_cannot_pass_predeclared_answers(self):
        reveal = benchmarks.get_case_outcomes

        def corrupt(case_id, problem):
            result = reveal(case_id, problem)
            if case_id == "integer-design-grid":
                result["outcomes"][0]["score"] = "99999"
            return result

        with patch.object(benchmarks, "get_case_outcomes", corrupt):
            report = benchmarks.run_known_answers()
        grid = next(case for case in report["cases"] if case["id"] == "integer-design-grid")
        self.assertEqual(grid["status"], "fail")
        self.assertFalse(grid["checks"]["stored_truth_matches_independent_formula_enumeration"])

    def test_report_is_deterministic_and_archived_failures_preserved(self):
        self.assertEqual(benchmarks.run_known_answers(), self.report)
        archived = benchmarks.archived_reports()
        gap, steels = archived["tasks"]
        self.assertFalse(gap["interval_pool"]["all_optima_retained"])
        self.assertEqual(gap["interval_pool"]["optimum_count"] - gap["interval_pool"]["retained_optimum_count"], 5)
        for task in (gap, steels):
            self.assertEqual(task["empirical_soundness"], "refuted_on_observed_outcomes")
        original = Path(__file__).resolve().parents[1] / "reports" / "archived-v1.json"
        bundled = files("lupine_discovery.resources").joinpath("archived-v1.json").read_bytes()
        self.assertEqual(original.read_bytes(), bundled)
        self.assertEqual(json.loads(json.dumps(self.report)), self.report)


if __name__ == "__main__":
    unittest.main()
