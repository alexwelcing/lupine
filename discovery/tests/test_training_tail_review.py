"""Independent synthetic checks of the frozen training-tail numerical contract.

These tests never load original material records or target files. Expected
coefficients and gate outcomes are derived independently of the runner.
"""
from copy import deepcopy
from fractions import Fraction
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import training_tail as tail


def target_metrics(tail_value="8", mae="4", maximum="18"):
    row = {"tail": tail_value, "mae": mae, "maximum": maximum}
    return {"pooled": dict(row), "folds": [dict(row) for _ in range(5)]}


class IndependentNumericalReview(unittest.TestCase):
    def test_two_species_mean_loss_solution_and_unpenalized_intercept(self):
        # Two centered rows are (+1/2,-1/2) and (-1/2,+1/2).
        # The nonzero Gram eigenvalue is 1/2, so lambda=1/10
        # yields coefficient magnitude (1/2)/(1/2+1/10)=5/6.
        rows = [{"jid": "JVASP-1", "counts": {"H": 1}},
                {"jid": "JVASP-2", "counts": {"He": 1}}]
        labels = {"JVASP-1": {"gap": Fraction(3), "formation": Fraction(-2)},
                  "JVASP-2": {"gap": Fraction(1), "formation": Fraction(0)}}
        fit = tail.fit_ridge(tail.prepare_training(rows, labels), Fraction(1, 10))
        h, he = tail.FEATURES.index("H"), tail.FEATURES.index("He")
        np.testing.assert_allclose(fit["beta"][[h, he]],
                                   [[5/6, -5/6], [-5/6, 5/6]], rtol=0, atol=2e-15)
        self.assertEqual(fit["muy"], (Fraction(2), Fraction(-1)))
        other = [i for i in range(len(tail.FEATURES)) if i not in (h, he)]
        self.assertTrue((fit["beta"][other] == 0).all())
        query = [{"jid": "JVASP-3", "counts": {"Li": 1}}]
        raw, predicted = tail.predict_ridge(fit, query)
        np.testing.assert_allclose(raw, [[2, -1]], rtol=0, atol=2e-15)
        self.assertEqual(predicted["JVASP-3"], {"gap": "2", "formation": "-1"})
        # Incorrect sum-loss normalization would give 10/11, visibly distinct.
        self.assertGreater(abs(fit["beta"][h, 0] - 10/11), 0.05)

    def test_center_rationals_before_binary_conversion(self):
        rows = [{"jid": "JVASP-1", "counts": {"H": 1, "He": 2}},
                {"jid": "JVASP-2", "counts": {"H": 2, "He": 1}}]
        labels = {"JVASP-1": {"gap": Fraction(1, 3), "formation": Fraction(2, 3)},
                  "JVASP-2": {"gap": Fraction(2, 3), "formation": Fraction(1, 3)}}
        prepared = tail.prepare_training(rows, labels)
        h = tail.FEATURES.index("H")
        self.assertEqual(prepared["mux"][h], Fraction(1, 2))
        self.assertEqual(prepared["x"][0, h], float(Fraction(-1, 6)))
        self.assertEqual(prepared["y"][0, 0], float(Fraction(-1, 6)))
        self.assertNotEqual(float(Fraction(-1, 6)), float(Fraction(1, 3)) - 0.5)
        # Even otherwise valid labels from outside the training fold are refused.
        extra = dict(labels, **{"JVASP-3": {"gap": Fraction(999), "formation": Fraction(999)}})
        with self.assertRaises(ValueError):
            tail.prepare_training(rows, extra)

    def test_binary64_ties_even_and_exact_quantization_error(self):
        self.assertEqual(tail.quantize(1/512), Fraction(195312, 10**8))
        self.assertEqual(tail.quantize(3/512), Fraction(585938, 10**8))
        self.assertEqual(tail.quantize(-1/512), Fraction(-195312, 10**8))
        self.assertEqual(tail.quantize(-3/512), Fraction(-585938, 10**8))
        for value in (0.0, -0.0, 1/512, 3/512, -3/512, 2.5e-8,
                      np.nextafter(1/512, 0), np.nextafter(1/512, 1), -19.123456789):
            self.assertLessEqual(abs(tail.quantize(value)-Fraction.from_float(float(value))),
                                 Fraction(1, 2*10**8))
        for value in (float("inf"), float("-inf"), float("nan")):
            with self.assertRaises(tail.Blocked):
                tail.quantize(value)

    def test_backward_residual_uses_matrix_row_sums_and_blocks_bad_solution(self):
        rows = [{"jid": "JVASP-1", "counts": {"H": 1}},
                {"jid": "JVASP-2", "counts": {"He": 1}}]
        labels = {"JVASP-1": {"gap": Fraction(3), "formation": Fraction(-2)},
                  "JVASP-2": {"gap": Fraction(1), "formation": Fraction(0)}}
        prepared = tail.prepare_training(rows, labels)
        exact = tail.fit_ridge(prepared, Fraction(1, 10))["beta"]
        h = tail.FEATURES.index("H")
        # Perturb both output coefficients in the H row equally. Here ||A||inf
        # is 3/5, ||beta||inf is 5/3, and ||C||inf is 1. The residual row sum
        # is approximately 7*epsilon/10, giving relative error 7*epsilon/20.
        nearby = exact.copy()
        nearby[h, :] += 2.8e-10
        with patch.object(np.linalg, "solve", return_value=nearby):
            result = tail.fit_ridge(prepared, Fraction(1, 10))
        self.assertAlmostEqual(float(Fraction(result["relative_backward_residual"])),
                               9.8e-11, delta=1e-16)
        inaccurate = exact.copy()
        inaccurate[h, :] += 3e-10
        with patch.object(np.linalg, "solve", return_value=inaccurate):
            with self.assertRaises(tail.Blocked) as caught:
                tail.fit_ridge(prepared, Fraction(1, 10))
        self.assertEqual(caught.exception.status, "BLOCKED_NUMERICAL")
        with patch.object(np.linalg, "solve", side_effect=np.linalg.LinAlgError("synthetic failure")):
            with self.assertRaises(tail.Blocked):
                tail.fit_ridge(prepared, Fraction(1, 10))

    def test_constant_targets_accept_zero_numerator_and_denominator(self):
        rows = [{"jid": "JVASP-1", "counts": {"H": 1}},
                {"jid": "JVASP-2", "counts": {"He": 1}}]
        labels = {row["jid"]: {"gap": Fraction(3, 7), "formation": Fraction(-2, 9)} for row in rows}
        fit = tail.fit_ridge(tail.prepare_training(rows, labels), Fraction(1, 10))
        self.assertTrue((fit["beta"] == 0).all())
        self.assertEqual(fit["relative_backward_residual"], "0")

    def test_declared_tail_positions_are_not_maxima(self):
        for count, rank, tail_value in ((4096, 4087, 4086), (820, 819, 818), (819, 818, 817)):
            result = tail.residual_metrics(range(count))
            self.assertEqual(result["tail_rank"], rank)
            self.assertEqual(Fraction(result["tail"]), tail_value)
            self.assertEqual(Fraction(result["maximum"]), count-1)
            self.assertEqual(Fraction(result["median"]), Fraction(count-1, 2))
            for key, numerator in (("p90", 90), ("p95", 95), ("p99", 99)):
                expected_index = (count*numerator+99)//100-1
                self.assertEqual(Fraction(result[key]), expected_index)
        with self.assertRaises(tail.Blocked):
            tail.residual_metrics([0]*100)


class IndependentDecisionReview(unittest.TestCase):
    def metrics(self):
        baseline = {target: target_metrics("10", "5", "20") for target in tail.TARGETS}
        return {"5nn": baseline, **{name: {target: target_metrics() for target in tail.TARGETS}
                                    for name in tail.MODELS[1:]}}

    def test_common_lambda_and_larger_lambda_final_tiebreak(self):
        metrics = self.metrics()
        result = tail.decide(metrics)
        self.assertEqual(result["status"], "GO_DESIGN_FRESH_PROTOCOL")
        self.assertEqual(result["selected_model"], "ridge_1_10")
        for name in tail.MODELS[1:]:
            metrics[name]["formation"] = target_metrics("11", "4", "18")
        result = tail.decide(metrics)
        self.assertEqual(result["status"], "NO_GO_MODEL_IMPROVEMENT")
        self.assertIsNone(result["selected_model"])

    def test_exact_boundary_and_numerical_guard_do_not_pass(self):
        metrics = self.metrics()
        for name in tail.MODELS[1:]:
            metrics[name]["gap"]["pooled"]["tail"] = "9"
        result = tail.decide(metrics)
        self.assertIsNone(result["selected_model"])
        self.assertTrue(all(row["status"] == "NUMERICAL_BORDERLINE"
                            for row in result["alternatives"].values()))
        ordinary = result["alternatives"][tail.MODELS[1]]["ordinary"]["gap"]
        guarded = result["alternatives"][tail.MODELS[1]]["numeric_guard"]["gap"]
        self.assertEqual(ordinary["pooled_margins"]["pooled_tail_10pct"], "0")
        self.assertEqual(guarded["pooled_margins"]["pooled_tail_10pct"], "-1/1000000")

    def test_tied_folds_zero_baselines_and_failed_models(self):
        candidate, baseline = target_metrics(), target_metrics("10", "5", "20")
        candidate["folds"][0]["tail"] = "10"
        self.assertTrue(tail.gate_target(candidate, baseline)["passed"])
        candidate["folds"][1]["tail"] = "10"
        self.assertFalse(tail.gate_target(candidate, baseline)["passed"])
        zero = target_metrics("0", "0", "0")
        result = tail.gate_target(zero, zero)
        self.assertFalse(result["passed"])
        self.assertIsNone(result["pooled_tail_ratio"])
        self.assertEqual(result["ratio_unavailable_reason"], "zero_pooled_baseline_tail")
        metrics = self.metrics()
        failures = {name: [{"fold": 0, "status": "BLOCKED_NUMERICAL"}] for name in tail.MODELS[1:]}
        self.assertIsNone(tail.decide(metrics, failures)["selected_model"])

    def test_raw_only_difference_is_disclosed_but_quantized_difference_blocks(self):
        first = {"status": "COMPLETE", "protocol_id": "synthetic-review", "protocol_commit": "same-commit",
                 "protocol_sha256": "same-protocol", "input_sha256": {"synthetic": "same-input"},
                 "implementation_sha256": {"synthetic": "same-source"}, "environment": {"synthetic": "same-stack"},
                 "engineering_validation": {"synthetic": "same-tests"}, "fold_manifest_sha256": "same-folds",
                 "metadata_artifact_sha256": {"synthetic": "same-metadata"}, "metrics": {"synthetic": "same-metrics"},
                 "decision": {"status": "NO_GO_MODEL_IMPROVEMENT", "selected_model": None},
                 "prediction_sha256": {"ridge": "same"},
                 "raw_artifact_sha256": {"raw": "one"}}
        first["scientific_result_sha256"] = tail.digest({key: first[key] for key in tail.SCIENTIFIC_FIELDS})
        missing = dict(first)
        del missing["metrics"]
        self.assertEqual(tail.compare_passes(missing, missing)["execution_status"], "BLOCKED_REPRODUCIBILITY")
        second = deepcopy(first)
        second["raw_artifact_sha256"] = {"raw": "two"}
        result = tail.compare_passes(first, second)
        self.assertEqual(result["execution_status"], "COMPLETE_REPRODUCED")
        self.assertFalse(result["raw_artifacts_identical"])
        second["prediction_sha256"] = {"ridge": "different"}
        second["scientific_result_sha256"] = tail.digest({key: second[key] for key in tail.SCIENTIFIC_FIELDS})
        self.assertEqual(tail.compare_passes(first, second)["execution_status"], "BLOCKED_REPRODUCIBILITY")
        second["status"] = "INCOMPLETE"
        self.assertEqual(tail.compare_passes(first, second)["execution_status"], "BLOCKED_OR_INCOMPLETE")


if __name__ == "__main__":
    unittest.main()
