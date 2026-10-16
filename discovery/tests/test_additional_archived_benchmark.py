import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from fractions import Fraction


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "additional_archived_benchmark.py"
SPEC = importlib.util.spec_from_file_location("additional_archived_benchmark", SCRIPT)
benchmark = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(benchmark)


class GuardedRecord(dict):
    def __getitem__(self, key):
        if key == "experimental" and benchmark.split_name(dict.__getitem__(self, "smiles")) == "test":
            raise AssertionError("test label accessed before prediction freeze")
        return super().__getitem__(key)


class AdditionalArchiveTests(unittest.TestCase):
    def records(self):
        return [{"id": f"fixture-{i:03d}", "smiles": "C" * (i + 1) + "O",
                 "experimental": str(i), "experimental_uncertainty": "0.5",
                 "experimental_reference": "fixture", "notes": ""} for i in range(100)]

    def test_test_labels_cannot_influence_frozen_predictions(self):
        records = self.records()
        guarded = [GuardedRecord(row) for row in records]
        before = benchmark.freeze_predictions(guarded)
        perturbed = [dict(row) for row in records]
        for row in perturbed:
            if benchmark.split_name(row["smiles"]) == "test":
                row["experimental"] = "invalid-held-out-answer"
        after = benchmark.freeze_predictions(perturbed)
        self.assertEqual(before, after)
        with self.assertRaises(ValueError):
            benchmark.run_records(perturbed)

    def test_split_identity_and_feature_normalization(self):
        rows = [{"id": "a", "smiles": "CCO"}, {"id": "b", "smiles": "CCO"}]
        frozen = benchmark.freeze_rows(rows)
        self.assertEqual(frozen[0]["split"], frozen[1]["split"])
        self.assertAlmostEqual(sum(benchmark.features("CCCO").values()), 1.0)
        self.assertEqual(benchmark.features("C"), {"C": 1.0})
        self.assertEqual(benchmark.squared_distance({"CC": 1.0}, {"CO": 1.0}), 2.0)

    def test_source_corruption_fails_closed(self):
        with TemporaryDirectory() as tmp:
            cache = Path(tmp)
            (cache / "freesolv-database.txt").write_text("corrupted")
            with self.assertRaisesRegex(ValueError, "hash mismatch"):
                benchmark.fetch(cache)

    def test_raw_calculated_answers_are_not_features_or_targets(self):
        prefix = "m1; CCO; ethanol; -5; 0.1; "
        tail = "; calculation-uncertainty; experimental-reference; calculation-reference; note"
        first = benchmark.parse_records(prefix + "12345" + tail)
        second = benchmark.parse_records(prefix + "-999999" + tail)
        self.assertEqual(first, second)
        self.assertEqual(first[0]["experimental"], "-5")
        with self.assertRaisesRegex(ValueError, "duplicate"):
            benchmark.parse_records((prefix + "0" + tail + "\n") * 2)

    def test_insufficient_calibration_cannot_claim_finite_radius(self):
        with self.assertRaises(ValueError):
            benchmark.conformal_radius([Fraction(0)] * 8)
        self.assertEqual(benchmark.conformal_radius([Fraction(i) for i in range(9)]), 8)


if __name__ == "__main__":
    unittest.main()
