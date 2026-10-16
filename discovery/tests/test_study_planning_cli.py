"""Public planner command checks; these use hypotheses, never archive targets."""
import contextlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from lupine_discovery.cli import main


class StudyPlanningCLI(unittest.TestCase):
    def command(self, *args):
        return subprocess.run([sys.executable, "-m", "lupine_discovery", *args],
                              capture_output=True, text=True, timeout=20)

    def test_pool_plan_is_prospective_and_preserves_unknown_probability(self):
        result = self.command("plan-pool", "--calibration-count", "20",
                              "--alpha", "1/10", "--cutoff", "3/4")
        self.assertEqual(result.returncode, 0, result.stderr)
        value = json.loads(result.stdout)
        self.assertEqual(value["schema"], "lupine.discovery.pool_threshold_plan.v1")
        plan = value["plan"]
        self.assertEqual(plan["rank"], 19)
        self.assertEqual(plan["tolerated_above_cutoff"], 1)
        self.assertIsNone(plan["threshold_event_probability"])
        self.assertEqual(plan["adequacy_status"], "unestablished")
        self.assertEqual(plan["calibrated_guarantee_status"], "not_established_by_planning")

    def test_exact_hypothetical_probability_and_no_problem_read(self):
        output = io.StringIO()
        with patch("lupine_discovery.cli._read_document", side_effect=AssertionError("data read")), \
                contextlib.redirect_stdout(output):
            status = main(["plan-pool", "--calibration-count", "2", "--alpha", "1/2",
                           "--cutoff", "3/4", "--iid-score-probability", "1/2"])
        self.assertEqual(status, 0)
        plan = json.loads(output.getvalue())["plan"]
        # Both independent calibration scores must meet the cutoff.
        self.assertEqual(plan["threshold_event_probability"], "1/4")
        self.assertEqual(plan["planning_status"], "hypothetical_iid")

    def test_zero_failure_resolution_is_not_power_or_observed_evidence(self):
        result = self.command("plan-zero-loss", "--loss-ceiling", "1/10",
                              "--significance", "1/20", "--maximum-evaluation-panels", "100")
        self.assertEqual(result.returncode, 0, result.stderr)
        value = json.loads(result.stdout)
        self.assertEqual(value["schema"], "lupine.discovery.zero_failure_resolution_plan.v1")
        self.assertEqual(value["plan"]["minimum_evaluation_panels"], 29)
        self.assertEqual(value["plan"]["power_status"], "not_computed")
        self.assertEqual(value["plan"]["observed_evidence_status"], "no_observations")

    def test_bounded_search_and_output_file_preserve_insufficient_result(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "plan.json"
            result = self.command("plan-zero-loss", "--loss-ceiling", "1/20",
                                  "--significance", "1/20", "--maximum-evaluation-panels", "58",
                                  "--output", str(target))
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout, "")
            plan = json.loads(target.read_text())["plan"]
            self.assertIsNone(plan["minimum_evaluation_panels"])
            self.assertEqual(plan["resolution_status"], "insufficient_resolution")

    def test_invalid_input_cannot_overwrite_existing_output(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "plan.json"
            target.write_text("existing result\n")
            for count, alpha in [("257", "1/10"), ("20", "1e-1000000000"), ("-1", "1/10")]:
                with self.subTest(count=count, alpha=alpha):
                    result = self.command("plan-pool", "--calibration-count", count,
                                          "--alpha", alpha, "--cutoff", "3/4", "--output", str(target))
                    self.assertEqual(result.returncode, 2, result.stderr)
                    self.assertEqual(result.stdout, "")
                    self.assertEqual(target.read_text(), "existing result\n")

    def test_maximum_exact_probability_is_json_serializable(self):
        result = self.command("plan-pool", "--calibration-count", "256", "--alpha", "1/2",
                              "--cutoff", "1/2", "--iid-score-probability", "1/4294967291")
        self.assertEqual(result.returncode, 0, result.stderr)
        plan = json.loads(result.stdout)["plan"]
        self.assertIsInstance(plan["threshold_event_probability"], str)
        self.assertLess(len(result.stdout), 20000)

    def test_outcome_input_option_is_not_supported(self):
        result = self.command("plan-pool", "--calibration-count", "20", "--alpha", "1/10",
                              "--cutoff", "3/4", "--outcomes", "never-opened.json")
        self.assertEqual(result.returncode, 2)
        self.assertIn("unrecognized arguments", result.stderr)
