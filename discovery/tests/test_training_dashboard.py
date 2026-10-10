"""Public-receipt projection/corruption checks; no original labels or fitting."""
from copy import deepcopy
from fractions import Fraction
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("training_dashboard_test", ROOT/"scripts/training_tail_dashboard.py")
d = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(d)


def rebind(first, second, reproduction, update_decisions=False):
    """Reseal deliberate aggregate corruption, so semantic checks face it too."""
    passes = [deepcopy(first), deepcopy(second)]
    reproduction = deepcopy(reproduction)
    for value in passes:
        if update_decisions:
            value["decision"] = d.expected_decision(value["metrics"])
        value["scientific_result_sha256"] = d.digest({key: value[key] for key in d.SCIENTIFIC_FIELDS})
    raw = [d.canonical_bytes(value) for value in passes]
    reproduction["pass_receipt_sha256"] = [hashlib.sha256(value).hexdigest() for value in raw]
    for key in d.IDENTITY_FIELDS:
        reproduction[key] = deepcopy(passes[0][key])
    reproduction["decision"] = {"status": passes[0]["decision"]["status"], "execution_status": "COMPLETE_REPRODUCED",
        "selected_model": passes[0]["decision"]["selected_model"],
        "comparisons": {key: passes[0][key] == passes[1][key] for key in d.COMPARE_FIELDS},
        "raw_artifacts_identical": passes[0]["raw_artifact_sha256"] == passes[1]["raw_artifact_sha256"],
        "scientific_result_sha256": passes[0]["scientific_result_sha256"]}
    return *raw, d.canonical_bytes(reproduction)


class TrainingDashboardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # These are already public aggregate receipts, not the material data.
        cls.raw = tuple((ROOT/"reports"/name).read_bytes() for name in (
            "training-tail-pass-1-v1.json", "training-tail-pass-2-v1.json", "training-tail-reproduction-v1.json"))

    def decoded(self):
        return [json.loads(raw) for raw in self.raw]

    def build(self, root, raw=None):
        paths = [root/name for name in ("pass-1.json", "pass-2.json", "reproduction.json")]
        for path, value in zip(paths, raw or self.raw):
            path.write_bytes(value)
        output, resource = root/"reports/dashboard.json", root/"package/dashboard.json"
        result = d.build_dashboard(*paths, output, resource)
        return result, paths, output, resource

    def test_exact_complete_negative_projection_and_identical_resources(self):
        first = self.decoded()[0]
        with tempfile.TemporaryDirectory() as temporary:
            result, sources, output, resource = self.build(Path(temporary))
            self.assertEqual(output.read_bytes(), resource.read_bytes())
            self.assertEqual([p.read_bytes() for p in sources], list(self.raw))
            self.assertEqual(d.build_dashboard(*sources, output, resource), result)
        self.assertEqual(result["schema"], "lupine.discovery.training_tail.dashboard.v1")
        self.assertEqual(result["decision"], first["decision"])
        self.assertEqual(result["decision"]["status"], "NO_GO_MODEL_IMPROVEMENT")
        self.assertIsNone(result["decision"]["selected_model"])
        self.assertEqual([model["id"] for model in result["models"]], list(d.MODELS))
        for model in result["models"]:
            self.assertEqual(model["metrics"], first["metrics"][model["id"]])
        self.assertEqual(result["scope"]["fold_tail_ranks"], [819, 818, 818, 818, 818])
        for field in ("new_coverage_claim", "original_model_replaced", "original_benchmark_changed",
                      "calibration_targets_opened", "evaluation_targets_opened"):
            self.assertIs(result["scope"][field], False)
        self.assertEqual(result["dashboard_content_sha256"], d.digest({k:v for k,v in result.items() if k != "dashboard_content_sha256"}))
        self.assertLess(len(d.canonical_bytes(result)), sum(map(len, self.raw))/3)

    def test_only_three_public_inputs_are_read(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            inputs = [root/name for name in ("pass-1.json", "pass-2.json", "reproduction.json")]
            outputs = [root/"output.json", root/"resource.json"]
            for path, raw in zip(inputs, self.raw):
                path.write_bytes(raw)
            allowed = set(inputs+outputs)
            reads = []
            old = Path.open
            def guarded(path, *args, **kwargs):
                if path not in allowed:
                    raise AssertionError("projector accessed another data file")
                mode = args[0] if args else kwargs.get("mode", "r")
                if "r" in mode:
                    reads.append(path)
                return old(path, *args, **kwargs)
            with patch.object(Path, "open", guarded):
                d.build_dashboard(*inputs, *outputs)
            self.assertEqual(reads, inputs)

    def test_captured_pass_bytes_and_scientific_digests_are_both_required(self):
        changed = list(self.raw)
        changed[0] += b" "
        with self.assertRaisesRegex(ValueError, "reproduction seals"):
            d.project(*changed)
        first, second, reproduction = self.decoded()
        first["scientific_result_sha256"] = "0"*64
        with self.assertRaisesRegex(ValueError, "scientific result digest"):
            d.project(d.canonical_bytes(first), self.raw[1], self.raw[2])

    def test_resealed_gate_forgery_and_bool_integer_confusion_are_rejected(self):
        for attack in ("gate", "margin", "integer_boolean"):
            first, second, reproduction = self.decoded()
            for value in (first, second):
                gate = value["decision"]["alternatives"]["ridge_1_1000"]["ordinary"]["formation"]
                if attack == "gate":
                    gate["passed"] = True
                elif attack == "margin":
                    gate["pooled_margins"]["pooled_mae_nonincrease"] = "0"
                else:
                    gate["positive_baseline_tail"] = 1
            with self.subTest(attack=attack), self.assertRaisesRegex(ValueError, "recorded gates"):
                d.project(*rebind(first, second, reproduction))

    def test_resealed_inconsistent_pooled_metrics_and_missing_folds_block(self):
        for attack in ("pooled_mae", "range", "fold_count", "missing_fold", "noncanonical", "missing_model"):
            first, second, reproduction = self.decoded()
            for value in (first, second):
                metrics = value["metrics"]["ridge_1_1000"]["gap"]
                if attack == "pooled_mae":
                    metrics["pooled"]["mae"] = "0"
                elif attack == "range":
                    metrics["fold_tail_range"]["range"] = "0"
                elif attack == "fold_count":
                    metrics["folds"][0]["count"] = 819
                elif attack == "missing_fold":
                    metrics["folds"].pop()
                elif attack == "noncanonical":
                    metrics["pooled"]["median"] = "2/2"
                else:
                    del value["metrics"]["ridge_1_10"]
            with self.subTest(attack=attack), self.assertRaises((ValueError, KeyError)):
                d.project(*rebind(first, second, reproduction))

    def test_resealed_source_scope_and_completion_changes_block(self):
        for attack in ("input", "implementation", "scope", "access", "incomplete", "fit", "resources"):
            first, second, reproduction = self.decoded()
            for value in (first, second):
                if attack == "input":
                    value["input_sha256"]["train.json"] = "0"*64
                elif attack == "implementation":
                    value["implementation_sha256"]["scripts/training_tail.py"] = "0"*64
                elif attack == "scope":
                    value["new_coverage_claim"] = True
                elif attack == "access":
                    value["opened_original_input_files"].append("calibration.json")
                elif attack == "incomplete":
                    value["status"] = "INCOMPLETE"
                elif attack == "fit":
                    del value["fitted_models"]["fold-0-ridge_1_10"]
                else:
                    value["usage"]["elapsed_seconds"] = "901"
            with self.subTest(attack=attack), self.assertRaises(ValueError):
                d.project(*rebind(first, second, reproduction))

    def test_reproduction_must_tell_the_truth_about_both_passes(self):
        for attack in ("missing_comparison", "fake_true", "raw_match", "failure_code", "bool_comparison"):
            first, second, reproduction = self.decoded()
            if attack == "missing_comparison":
                del reproduction["decision"]["comparisons"]["metrics"]
            elif attack == "fake_true":
                reproduction["decision"]["selected_model"] = "ridge_1_1000"
            elif attack == "raw_match":
                reproduction["decision"]["raw_artifacts_identical"] = False
            elif attack == "bool_comparison":
                reproduction["decision"]["comparisons"]["metrics"] = 1
            else:
                reproduction["process_usage"][0]["returncode"] = 1
            with self.subTest(attack=attack), self.assertRaises(ValueError):
                d.project(self.raw[0], self.raw[1], d.canonical_bytes(reproduction))

    def test_raw_only_variation_cannot_replace_the_published_historical_receipts(self):
        first, second, reproduction = self.decoded()
        artifact = next(iter(second["raw_artifact_sha256"]))
        second["raw_artifact_sha256"][artifact] = "0"*64
        with self.assertRaisesRegex(ValueError, "published historical receipt bytes"):
            d.project(*rebind(first, second, reproduction))

    def test_self_consistent_replacement_cannot_turn_the_historical_no_go_into_go(self):
        first, second, reproduction = self.decoded()
        for value in (first, second):
            for target in d.TARGETS:
                metrics = value["metrics"]["5nn"][target]
                for row in [metrics["pooled"], *metrics["folds"]]:
                    for key in ("tail", "median", "mae", "maximum", "p90", "p95", "p99"):
                        row[key] = str(10*Fraction(row[key]))
                metrics["fold_tail_range"] = {key: str(10*Fraction(item))
                                             for key, item in metrics["fold_tail_range"].items()}
        altered = rebind(first, second, reproduction, update_decisions=True)
        self.assertEqual(json.loads(altered[0])["decision"]["status"], "GO_DESIGN_FRESH_PROTOCOL")
        with self.assertRaisesRegex(ValueError, "published historical scientific result"):
            d.project(*altered)

    def test_structured_identities_distinguish_booleans_from_integers(self):
        first, second, reproduction = self.decoded()
        second["environment"]["numpy_configuration"]["Build Dependencies"]["blas"]["found"] = 1
        # Legacy Python equality says these environments match; JSON identity must not.
        self.assertEqual(first["environment"], second["environment"])
        with self.assertRaisesRegex(ValueError, "reproduction claim"):
            d.project(*rebind(first, second, reproduction))
        first, second, reproduction = self.decoded()
        for value in (first, second):
            value["engineering_validation"]["extra"] = True
        raw = rebind(first, second, reproduction)
        parent = json.loads(raw[2])
        parent["engineering_validation"]["extra"] = 1
        with self.assertRaisesRegex(ValueError, "parent/worker scientific identity"):
            d.project(raw[0], raw[1], d.canonical_bytes(parent))

    def test_unknown_payloads_cannot_be_smuggled_through_resource_metadata(self):
        for field in ("usage", "environment", "engineering_validation"):
            first, second, reproduction = self.decoded()
            for value in (first, second):
                value[field]["unknown"] = {"rows": [["0", "1"], ["2", "3"]]}
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "published historical receipt bytes"):
                d.project(*rebind(first, second, reproduction))
        self.assertEqual(d._select({"known": "value", "unknown": [["0", "1"]]}, ("known",)), {"known": "value"})

    def test_raw_data_injection_is_rejected_even_when_receipts_are_resealed(self):
        for injected in ({"targets": {"any": "1"}}, {"note": "JVASP-123"}, {"rows": [{"coefficients": ["1"]}]}):
            first, second, reproduction = self.decoded()
            for value in (first, second):
                value["extra"] = injected
            with self.assertRaisesRegex(ValueError, "per-record"):
                d.project(*rebind(first, second, reproduction))

    def test_strict_json_and_corruption_never_create_outputs(self):
        bad = [b'{"schema":"duplicate",'+self.raw[0][1:], self.raw[0].replace(b'"new_coverage_claim":false', b'"new_coverage_claim":NaN'),
               self.raw[0].replace(b'"count":4096', b'"count":4096.0', 1)]
        for raw in bad:
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                inputs = [root/name for name in ("pass-1.json", "pass-2.json", "reproduction.json")]
                for path, content in zip(inputs, (raw, self.raw[1], self.raw[2])):
                    path.write_bytes(content)
                with self.assertRaises(ValueError):
                    d.build_dashboard(*inputs, root/"new/out.json", root/"new/resource.json")
                self.assertFalse((root/"new").exists())

    def test_existing_output_conflict_is_atomic_and_input_alias_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            inputs = [root/name for name in ("pass-1.json", "pass-2.json", "reproduction.json")]
            for path, raw in zip(inputs, self.raw):
                path.write_bytes(raw)
            conflict = root/"resource.json"
            conflict.write_text("existing content")
            with self.assertRaisesRegex(ValueError, "different artifact"):
                d.build_dashboard(*inputs, root/"new/out.json", conflict)
            self.assertFalse((root/"new").exists())
            self.assertEqual(conflict.read_text(), "existing content")
            with self.assertRaisesRegex(ValueError, "distinct"):
                d.build_dashboard(*inputs, inputs[0], root/"other.json")


if __name__ == "__main__":
    unittest.main()
