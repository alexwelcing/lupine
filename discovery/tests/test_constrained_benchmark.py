"""Adversarial custody/freeze checks; no network or real archive targets."""
from decimal import Decimal
from fractions import Fraction
import importlib.util
import json
from pathlib import Path
import random
import tempfile
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "constrained_benchmark.py"
SPEC = importlib.util.spec_from_file_location("constrained_benchmark_for_tests", SCRIPT)
b = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(b)


def synthetic_rows(count=250):
    rows = []
    for i in range(1, count + 1):
        rows.append({"jid": f"JVASP-{i}", "atoms": {"elements": ["H"] * i + ["He"]},
                     "optb88vdw_bandgap": i % 7, "formation_energy_peratom": (i % 5) - 3})
    for i in range(1, 41):
        rows.append({"jid": f"JVASP-{count + i}", "atoms": {"elements": ["O"] * i + ["Li"]},
                     "optb88vdw_bandgap": i % 4, "formation_energy_peratom": (i % 3) - 1})
    return rows


def fixture(cache, rows=None):
    member = cache / "synthetic.json"
    member.write_text(json.dumps(synthetic_rows() if rows is None else rows))
    source = {"schema": "synthetic-source-test-only", **b.protocol_identity(),
              "member_sha256": b.sha256_file(member), "source_format": "strict"}
    b.write_immutable(cache / "source-receipt.json", source)
    b.custodian(member, cache, source)
    return member


class ConstrainedBenchmarkTests(unittest.TestCase):
    def test_streaming_strict_decimal_duplicates_and_chunk_boundaries(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "rows.json"
            path.write_text('[{"x":0.100000000000000000000001,"nested":{"x":"a\\\"b"}}, {"y":2}]')
            for chunk in (1, 2, 7, 64):
                rows = list(b.iter_json_records(path, chunk_size=chunk))
                self.assertEqual(rows[0]["x"], Decimal("0.100000000000000000000001"))
                self.assertEqual(rows[0]["nested"]["x"], 'a"b')
            for text in ['[{"x":1,"x":2}]', '[{"x":{"y":1,"y":2}}]', '[{"x":NaN}]',
                         '[{},]', '[{}] {}', '[{} {}]', '{}', '[', '[3]']:
                path.write_text(text)
                with self.assertRaises(ValueError, msg=text):
                    list(b.iter_json_records(path, chunk_size=2))
            path.write_text('[] \n')
            self.assertEqual(list(b.iter_json_records(path, chunk_size=1)), [])

    def test_representative_choice_precedes_target_access_and_missingness(self):
        class Guard(dict):
            def get(self, key, *args):
                if key not in ("jid", "atoms"):
                    raise AssertionError("target read during representative selection")
                return super().get(key, *args)
        candidates = [Guard(jid="JVASP-1", atoms={"elements": ["H", "He"]}),
                      Guard(jid="JVASP-2", atoms={"elements": ["He", "H", "He", "H"]})]
        metadata = b.metadata_pass(candidates)
        group = metadata["groups"][0]
        chosen = min((c["jid"] for c in candidates), key=lambda jid: (b.H("representative", jid), jid))
        self.assertEqual(group["representative"]["jid"], chosen)
        self.assertEqual(group["composition_key"], "H:1|He:1")
        records = [{"jid": c["jid"], "optb88vdw_bandgap": None if c["jid"] == chosen else 8,
                    "formation_energy_peratom": -1} for c in candidates]
        targets, unresolved = b.extract_targets(records, metadata)
        self.assertEqual(targets, {})
        self.assertEqual(set(unresolved), {chosen})
        with self.assertRaisesRegex(ValueError, "duplicate"):
            b.metadata_pass(candidates + [candidates[0]])

    def test_invalid_ids_numeric_grammar_and_unresolved_records(self):
        records = [{"jid": [], "atoms": {"elements": ["H"]}},
                   {"jid": "JVASP-1", "atoms": {"elements": ["H"]},
                    "optb88vdw_bandgap": Decimal("0.1234567890123456789"),
                    "formation_energy_peratom": "-1.25e-2"}]
        metadata = b.metadata_pass(records)
        targets, unresolved = b.extract_targets(records, metadata)
        self.assertEqual(len(metadata["invalid_metadata"]), 1)
        self.assertFalse(unresolved)
        self.assertEqual(Fraction(targets["JVASP-1"]["gap"]), Fraction(1234567890123456789, 10**19))
        self.assertEqual(targets["JVASP-1"]["formation"], "-1/80")
        for value in (None, "na", True, [], {}, "1.", "+1", "01"):
            self.assertIsNotNone(b.parse_target(value)[1])
        with self.assertRaises(TypeError):
            b.parse_target(0.1)

    def test_exact_neighbors_match_exhaustive_oracle_and_ties(self):
        rng = random.Random(901)
        elements = ["H", "He", "Li", "Be", "B", "C", "N", "O"]
        rows = []
        for i in range(45):
            chosen = rng.sample(elements, rng.randint(1, 4))
            rows.append({"jid": f"JVASP-{i}", "counts": {e: rng.randint(1, 30) for e in chosen}})
        engine = b.ExactNeighbors(rows)
        queries = [{"U": 1}, {"H": 2, "He": 2}, {"H": 1, "He": 1}]
        queries += [{e: rng.randint(1, 20) for e in rng.sample(elements, rng.randint(1, 4))}
                    for _ in range(120)]
        for query in queries:
            total = sum(query.values())
            def reference(row):
                other, n = row["counts"], sum(row["counts"].values())
                d = sum((abs(Fraction(query.get(e, 0), total) - Fraction(other.get(e, 0), n))
                         for e in set(query) | set(other)), Fraction(0))
                return d, row["jid"]
            expected = [r["jid"] for r in sorted(rows, key=reference)[:5]]
            self.assertEqual(engine.neighbors(query), expected)
        self.assertEqual(engine.neighbors({"U": 1}), sorted(r["jid"] for r in rows)[:5])

    def test_format_amendment_sentinels_preserve_target_blind_choices(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "rows.json"
            chosen = min(("JVASP-1", "JVASP-2"), key=lambda jid: (b.H("representative", jid), jid))
            for token in ("NaN", "Infinity", "-Infinity"):
                rows = [{"jid": "JVASP-1", "atoms": {"elements": ["H", "He"]},
                         "optb88vdw_bandgap": 2, "formation_energy_peratom": -1},
                        {"jid": "JVASP-2", "atoms": {"elements": ["H", "He", "H", "He"]},
                         "optb88vdw_bandgap": 3, "formation_energy_peratom": -2}]
                ordinary = b.metadata_pass(rows)
                for row in rows:
                    if row["jid"] == chosen:
                        row["optb88vdw_bandgap"] = "TOKEN_PLACEHOLDER"
                    row["forbidden_unused_property"] = "TOKEN_PLACEHOLDER"
                path.write_text(json.dumps(rows).replace('"TOKEN_PLACEHOLDER"', token))
                parsed = list(b.iter_json_records(path, allow_invalid_nonfinite=True, chunk_size=7))
                metadata = b.metadata_pass(parsed)
                self.assertEqual(metadata, ordinary)
                targets, unresolved = b.extract_targets(parsed, metadata)
                self.assertFalse(targets)
                self.assertEqual(unresolved, {chosen: {"gap": "invalid_nonfinite"}})
                self.assertIs(parsed[0]["forbidden_unused_property"], b.InvalidNonfinite(token))
                with self.assertRaises(TypeError):
                    bool(b.INVALID_NONFINITE)
                invalid_rows = [{"jid": b.INVALID_NONFINITE, "atoms": {"elements": ["H"]}},
                                {"jid": "JVASP-9", "atoms": {"elements": [b.INVALID_NONFINITE]}}]
                self.assertEqual(len(b.metadata_pass(invalid_rows)["invalid_metadata"]), 2)
            for token in ("NAN", "+Infinity", "undefined", "inf"):
                path.write_text('[{"x":' + token + '}]')
                with self.assertRaises(ValueError):
                    list(b.iter_json_records(path, allow_invalid_nonfinite=True))
            with self.assertRaises(ValueError):
                b.parse_json_bytes(b'{"x":NaN}')
            self.assertEqual(b.H("split", "Al:2|O:3").hex(),
                             b.hashlib.sha256(b"jarvis-gap-formation-v1\nsplit\nAl:2|O:3").hexdigest())

    def test_freeze_and_verify_never_read_evaluation_targets(self):
        with tempfile.TemporaryDirectory() as temporary:
            cache = Path(temporary)
            fixture(cache)
            original = Path.open
            def guarded(path, *args, **kwargs):
                if path.name == "evaluation-targets.json":
                    raise AssertionError("evaluation target opened before replay")
                return original(path, *args, **kwargs)
            with patch.object(Path, "open", guarded):
                frozen = b.freeze(cache)
                self.assertEqual(b.verify_freeze(cache / "freeze.json"), frozen)
            self.assertEqual(frozen["calibration"]["outcome_kind"], "unbounded")
            self.assertEqual(frozen["calibration"]["epsilon"], "1/400")
            for panel in frozen["panels"]:
                self.assertEqual(len(panel["random_orders"]), 100)
                self.assertEqual(len(panel["operational_retained"]), 20)
                for candidate in panel["candidates"]:
                    self.assertIsNone(candidate["score_interval"])
                    self.assertNotIn("gap", candidate)
                if panel["role"] == "shift":
                    self.assertEqual(panel["operational_status"], "abstain_unsupported_scope")
                    self.assertEqual(panel["premise_status"], "unsupported")
            targets = b.open_sealed_targets(cache / "freeze.json", frozen)
            self.assertEqual(set(targets["panels"]), {p["id"] for p in frozen["panels"]})

    def test_source_split_assignments_and_finite_interval_sign(self):
        with tempfile.TemporaryDirectory() as temporary:
            cache = Path(temporary)
            fixture(cache, synthetic_rows(1500))
            metadata = b.read_json(cache / "metadata.json")
            for group in metadata["groups"]:
                if group["role"] == "shift":
                    self.assertIn("O", group["counts"])
                else:
                    self.assertNotIn("O", group["counts"])
                    n = int.from_bytes(b.H("split", group["composition_key"]), "big") % 100
                    expected = "train" if n < 50 else "calibration" if n < 80 else "primary"
                    self.assertEqual(group["role"], expected)
            frozen = b.freeze(cache)
            self.assertGreaterEqual(frozen["calibration"]["count"], 399)
            self.assertEqual(frozen["calibration"]["outcome_kind"], "finite")
            q = Fraction(frozen["calibration"]["gap_radius"])
            for panel in frozen["panels"]:
                for row in panel["candidates"]:
                    s = -Fraction(row["predicted_gap"])
                    self.assertEqual(list(map(Fraction, row["score_interval"])), [s - q, s + q])
                if panel["role"] == "shift":
                    self.assertIn("unsupported_transfer_diagnostic", panel)
                    self.assertEqual(len(panel["operational_retained"]), 20)

    def test_broken_seals_and_postfreeze_model_changes_fail_before_target_open(self):
        with tempfile.TemporaryDirectory() as temporary:
            cache = Path(temporary)
            fixture(cache)
            frozen = b.freeze(cache)
            path = cache / "evaluation-targets.json"
            path.write_text(path.read_text() + " ")
            # Verifying prediction freeze must not open the target bytes, so
            # target corruption is detected only at the explicit later open.
            self.assertEqual(b.verify_freeze(cache / "freeze.json"), frozen)
            with self.assertRaisesRegex(ValueError, "digest mismatch"):
                b.open_sealed_targets(cache / "freeze.json", frozen)
            with patch.object(b, "implementation_identity", return_value={"changed": "yes"}):
                with self.assertRaisesRegex(ValueError, "implementation changed"):
                    b.verify_freeze(cache / "freeze.json")
            path = cache / "predictions.json"
            path.write_text(path.read_text() + " ")
            with self.assertRaisesRegex(ValueError, "digest mismatch"):
                b.verify_freeze(cache / "freeze.json")

    def test_same_captured_bytes_are_hashed_and_decoded(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "target.json"
            original = b.canonical_bytes({"gap": "1"})
            path.write_bytes(original)
            expected = b.sha256_file(path)
            original_parser = b.parse_json_bytes
            def replace_after_capture(raw):
                path.write_bytes(b.canonical_bytes({"gap": "999"}))
                return original_parser(raw)
            with patch.object(b, "parse_json_bytes", side_effect=replace_after_capture):
                self.assertEqual(b.read_verified_json(path, expected), {"gap": "1"})

    def test_timeout_preserves_incomplete_checkpoint_without_release_receipt(self):
        with tempfile.TemporaryDirectory() as temporary:
            cache = Path(temporary)
            fixture(cache)
            failed = b.PredictionBudgetExceeded({"JVASP-1": {"neighbors": []}}, ["JVASP-2"])
            with patch.object(b, "predict", side_effect=failed):
                with self.assertRaises(b.PredictionBudgetExceeded):
                    b.freeze(cache)
            checkpoint = b.read_json(cache / "predictions-incomplete.json")
            self.assertEqual(checkpoint["status"], "incomplete_not_a_freeze")
            self.assertIn("JVASP-1", checkpoint["predictions"])
            self.assertEqual(checkpoint["unexecuted_prediction_ids"], ["JVASP-2"])
            self.assertFalse((cache / "freeze.json").exists())


if __name__ == "__main__":
    unittest.main()
