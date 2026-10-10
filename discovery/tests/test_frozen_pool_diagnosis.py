"""Exact post-hoc geometry tests; synthetic truths only, no real evaluation reads."""
from fractions import Fraction
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
SPEC = importlib.util.spec_from_file_location("diagnose_frozen_pool_for_tests", SCRIPTS / "diagnose_frozen_pool.py")
d = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(d)
b = d.benchmark


def panel(rows, score_radius=1, constraint_radius=1):
    q, r = Fraction(score_radius), Fraction(constraint_radius)
    candidates = []
    for jid, gap, formation in rows:
        gap, formation = Fraction(gap), Fraction(formation)
        candidates.append({"jid": jid, "predicted_gap": str(gap), "predicted_formation": str(formation),
                           "score_interval": list(map(str, [-gap-q, -gap+q])),
                           "constraint_interval": list(map(str, [formation-r, formation+r]))})
    return {"id": "primary-synthetic", "role": "primary", "candidates": candidates}


class FrozenPoolDiagnosisTests(unittest.TestCase):
    def test_wide_scores_retain_everyone_despite_an_incumbent(self):
        p = panel([("a", 3, -2), ("b", 2, 0), ("c", 1, 0)], 2, 1)
        result = d.diagnose_panel(p, 2, 1)
        self.assertEqual(result["incumbent"], "a")
        self.assertEqual(result["certified_feasible_count"], 1)
        self.assertEqual(result["retained_count"], 3)
        self.assertEqual(result["reason"], "all_possible_no_strict_objective_separation")
        self.assertEqual(result["common_objective_intersection"], ["-3", "-1"])
        self.assertEqual(result["objective_strict_pruning_margin"]["max"], "-2")

    def test_no_incumbent_does_not_permit_score_pruning(self):
        p = panel([("a", 100, 0), ("b", 0, 0)], 1, 1)
        result = d.diagnose_panel(p, 1, 1)
        self.assertIsNone(result["incumbent"])
        self.assertIsNone(result["common_objective_intersection"])
        self.assertEqual(result["retained_count"], 2)
        self.assertEqual(result["objective_strict_pruning_margin"]["count"], 0)
        self.assertEqual(result["reason"], "no_certified_incumbent_retains_all_possible")

    def test_exclusion_channels_and_strict_boundary(self):
        rows = [("a", 10, -2), ("tied_boundary", 8, 0), ("worse", 7, 0), ("infeasible", 100, 2)]
        result = d.diagnose_panel(panel(rows), 1, 1)
        self.assertEqual(result["certified_infeasible_count"], 1)
        self.assertEqual(result["objective_pruned_count"], 1)
        self.assertEqual(result["strict_pruning_boundary_ties_kept"], 1)
        self.assertEqual(result["retained_count"], 2)
        self.assertEqual(result["reason"], "both_exclusion_channels_active")
        score_only = d.diagnose_panel(panel(rows[:-1]), 1, 1)
        self.assertEqual(score_only["reason"], "objective_exclusions_only")
        constraint_only = d.diagnose_panel(panel([rows[0], rows[-1]]), 1, 1)
        self.assertEqual(constraint_only["reason"], "feasibility_exclusions_only")
        empty_possible = d.diagnose_panel(panel([rows[-1]]), 1, 1)
        self.assertEqual(empty_possible["reason"], "no_possibly_feasible_candidates")

    def test_sensitivity_distinguishes_axes_without_targets(self):
        p = panel([("a", 10, -1), ("b", 0, 0)], 6, 2)
        base = d.diagnose_panel(p, 6, 2)
        score_only = d.diagnose_panel(p, 6, 2, Fraction(1, 2), 1, verify_original=False)
        constraint_only = d.diagnose_panel(p, 6, 2, 1, Fraction(1, 2), verify_original=False)
        both = d.diagnose_panel(p, 6, 2, Fraction(1, 2), Fraction(1, 2), verify_original=False)
        self.assertEqual(base["retained_count"], 2)
        self.assertIsNone(score_only["incumbent"])
        self.assertEqual(score_only["retained_count"], 2)
        self.assertIsNotNone(constraint_only["incumbent"])
        self.assertEqual(constraint_only["retained_count"], 2)
        self.assertEqual(both["retained_count"], 1)
        with self.assertRaisesRegex(ValueError, "multipliers"):
            d.diagnose_panel(p, 0, 0, -1, 1, verify_original=False)
        with self.assertRaisesRegex(ValueError, "differ"):
            d.diagnose_panel(p, 5, 2)

    def test_exact_descriptive_statistics(self):
        result = d.exact_summary([Fraction(1, 3), Fraction(2, 3), 1, 2])
        self.assertEqual(result["median"], "5/6")
        self.assertEqual(result["mean"], "1")
        self.assertEqual(result["p90"], "2")
        self.assertEqual(d.exact_summary([])["count"], 0)
        self.assertIsNone(d.exact_summary([])["median"])
        self.assertEqual(d.exact_summary(range(1, 101))["p99"], "99")

    def test_calibration_rank_is_bound_and_no_training_residual_claim(self):
        frozen = {"calibration": {"count": 3, "rank": 2, "gap_radius": "2", "formation_radius": "1"}}
        metadata = {"selected": {"train": [{"jid": "t", "counts": {"H": 1}}],
                                "calibration": [{"jid": str(i), "counts": {"H": i+1, "He": 1}} for i in range(3)]}}
        predictions = {str(i): {"predicted_gap": "0", "predicted_formation": "0", "neighbors": ["t"]} for i in range(3)}
        labels = {"targets": {str(i): {"gap": str(i+1), "formation": str(i)} for i in range(3)}}
        result = d.calibration_diagnosis(frozen, metadata, predictions, labels)
        self.assertEqual(result["residuals"]["gap"]["above_applied_radius"], 1)
        self.assertEqual(result["residuals"]["formation"]["median"], "1")
        self.assertEqual(sum(g["count"] for g in result["residuals_by_fixed_distance_bucket"].values()), 3)
        frozen["calibration"]["gap_radius"] = "3"
        with self.assertRaisesRegex(ValueError, "order statistic"):
            d.calibration_diagnosis(frozen, metadata, predictions, labels)

    def test_verified_pipeline_forbids_evaluation_and_truth_reads_and_rejects_tampering(self):
        with tempfile.TemporaryDirectory() as temporary:
            cache = Path(temporary)
            # Distinct reduced compositions with a small source document. All
            # synthetic targets are known fixture constants, not archive values.
            rows = [{"jid": f"JVASP-{i+1}",
                     "atoms": {"elements": ["H"]*(i % 50+1) + ["He"]*(i//50+1) + ["Li"]},
                     "optb88vdw_bandgap": i % 7,
                     "formation_energy_peratom": i % 5-3} for i in range(1600)]
            member = cache / "synthetic.json"
            member.write_text(json.dumps(rows))
            source = {"schema": "synthetic-source-test-only", **b.protocol_identity(),
                      "member_sha256": b.sha256_file(member), "source_format": "strict"}
            b.write_immutable(cache / "source-receipt.json", source)
            b.custodian(member, cache, source)
            original_open = Path.open
            read_paths = []
            def guarded(path, *args, **kwargs):
                if path.name == "evaluation-targets.json" or "replay" in path.name or "truth" in path.name:
                    raise AssertionError("forbidden evaluation or truth read")
                if "r" in (args[0] if args else kwargs.get("mode", "r")):
                    read_paths.append(path.name)
                return original_open(path, *args, **kwargs)
            with patch.object(Path, "open", guarded), patch.object(b, "open_sealed_targets", side_effect=AssertionError):
                frozen = b.freeze(cache)
                self.assertEqual(frozen["calibration"]["outcome_kind"], "finite")
                report = d.run(cache / "freeze.json", cache / "diagnosis.json")
                self.assertEqual(report["diagnosis"]["status"], "complete")
                self.assertFalse(report["evaluation_target_file_opened"])
                self.assertFalse(report["evaluation_truth_report_opened"])
                self.assertTrue(all(s["status"] == "hypothetical_not_calibrated"
                                    for s in report["diagnosis"]["radius_sensitivity"][1:]))
                self.assertIn("calibration.json", read_paths)
                self.assertNotIn("evaluation-targets.json", read_paths)
                predictions = cache / "predictions.json"
                predictions.write_text(predictions.read_text() + " ")
                with self.assertRaisesRegex(ValueError, "digest mismatch"):
                    d.run(cache / "freeze.json", cache / "must-not-exist.json")
                self.assertFalse((cache / "must-not-exist.json").exists())


if __name__ == "__main__":
    unittest.main()
