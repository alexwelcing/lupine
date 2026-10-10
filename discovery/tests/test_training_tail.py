"""Synthetic custody, isolation, engineering and resource tests. No real fits."""
from copy import deepcopy
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/"scripts"))
import training_tail as t


def rows(count=10):
    return [{"jid": f"JVASP-{i+1}", "composition_key": f"H:{i+1}|He:1", "counts": {"H": i+1, "He": 1}}
            for i in range(count)]


def fixture(cache, count=10):
    cache.mkdir()
    identities = {"protocol_id": t.original.PROTOCOL_ID, "protocol_commit": t.original.PROTOCOL_COMMIT,
                  "protocol_sha256": t.original.PROTOCOL_SHA256,
                  "format_amendment_commit": t.original.FORMAT_AMENDMENT_COMMIT,
                  "format_amendment_sha256": t.original.FORMAT_AMENDMENT_SHA256}
    metadata = {"selected": {"train": rows(count), "calibration": "MUST_NOT_BE_USED", "primary": "MUST_NOT_BE_USED"}}
    labels = {"protocol_id": t.original.PROTOCOL_ID, "role": "train", "targets": {
        r["jid"]: {"gap": str(i % 7), "formation": str(i % 5-3)} for i, r in enumerate(rows(count))}}
    hashes = {"metadata.json": t.write_json(cache/"metadata.json", metadata),
              "train.json": t.write_json(cache/"train.json", labels),
              "source-receipt.json": t.write_json(cache/"source-receipt.json", identities)}
    custody = {**identities, "metadata_sha256": hashes["metadata.json"], "train_sha256": hashes["train.json"],
               "source_receipt_sha256": hashes["source-receipt.json"]}
    hashes["custody-receipt.json"] = t.write_json(cache/"custody-receipt.json", custody)
    return hashes


def engineering_fixture(root):
    source_names = ("scripts/training_tail.py", "scripts/constrained_benchmark.py", "src/lupine_discovery/serialization.py")
    test_names = ("tests/test_training_tail.py", "tests/test_training_tail_review.py")
    for name in source_names+test_names:
        path = root/name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("# synthetic engineering fixture only\n")
    hashes = {name: hashlib.sha256((root/name).read_bytes()).hexdigest() for name in source_names+test_names}
    (root/"reports").mkdir()
    log = root/"reports/training-tail-engineering-tests-v1.txt"
    log.write_text("test_synthetic ... ok\n\nRan 1 test in 0.001s\n\nOK\n")
    receipt = {"schema": "lupine.discovery.training_tail.engineering.v1", "status": "PASS",
               "protocol_commit": t.PROTOCOL_COMMIT, "protocol_sha256": t.PROTOCOL_SHA256,
               "test_files": list(test_names), "source_sha256_before": hashes, "source_sha256_after": hashes,
               "tests": {"passed": 1, "failed": 0, "errors": 0, "skipped": 0, "exit_code": 0,
                         "command": [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "test_training_tail*.py", "-v"],
                         "log_path": str(log.relative_to(root)), "log_sha256": hashlib.sha256(log.read_bytes()).hexdigest()}}
    path = root/"reports/training-tail-engineering-validation-v1.json"
    path.write_bytes(t.json_bytes(receipt))
    identity = {"implementation_sha256": {name: hashes[name] for name in source_names}}
    return path, receipt, identity


class TrainingTailCustodyTests(unittest.TestCase):
    def test_fold_hash_balance_and_identity_are_target_independent(self):
        samples = t.validate_rows(rows(4096))
        manifest = t.fold_manifest(samples)
        self.assertEqual(manifest["fold_counts"], [820, 819, 819, 819, 819])
        self.assertEqual(manifest, t.fold_manifest(list(reversed(samples))))
        self.assertEqual([r["jid"] for r in manifest["records"]], sorted(r["jid"] for r in samples))
        self.assertLess([r["jid"] for r in samples].index("JVASP-10"), [r["jid"] for r in samples].index("JVASP-2"))
        expected = sorted(samples, key=lambda r: (hashlib.sha256(
            b"jarvis-training-tail-v1\nfold\n" + r["composition_key"].encode()).digest(), r["composition_key"], r["jid"]))
        assigned = {r["jid"]: r["fold"] for r in manifest["records"]}
        self.assertEqual([assigned[r["jid"]] for r in expected], [i % 5 for i in range(4096)])

    def test_invalid_metadata_blocks_without_silent_reduction(self):
        changes = [lambda r: r.update(jid="JVASP-x"), lambda r: r.update(counts={"O": 1}, composition_key="O:1"),
                   lambda r: r.update(counts={"H": True}), lambda r: r.update(counts={"H": 0}),
                   lambda r: r.update(counts={"H": 2, "He": 2}, composition_key="H:2|He:2"),
                   lambda r: r.update(counts={"Unknown": 1}), lambda r: r.update(composition_key="He:1|H:1")]
        for change in changes:
            sample = rows()
            change(sample[0])
            with self.assertRaises(t.Blocked):
                t.validate_rows(sample, 10)
        sample = rows()
        sample[1] = deepcopy(sample[0])
        with self.assertRaises(t.Blocked):
            t.validate_rows(sample, 10)

    def test_actual_open_boundary_and_persisted_manifest_precede_label_bytes(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            cache, output = base/"inputs", base/"outputs"
            hashes = fixture(cache)
            output.mkdir()
            forbidden = [cache/"calibration.json", cache/"evaluation-targets.json", base/"copied.zip", base/"truth.json.gz", base/"hidden.txt"]
            for path in forbidden:
                path.write_bytes(b"SYNTHETIC FORBIDDEN DATA")
            identity = {"protocol_commit": t.PROTOCOL_COMMIT, "protocol_sha256": t.PROTOCOL_SHA256}
            boundary = t.ReadBoundary(cache, output).start()
            original = t.read_verified
            def observed(path, sha):
                if Path(path).name == "train.json":
                    self.assertTrue((output/"folds.json").exists())
                    receipt = json.loads((output/"folds-receipt.json").read_text())
                    self.assertEqual(receipt["fold_manifest_sha256"], hashlib.sha256((output/"folds.json").read_bytes()).hexdigest())
                    self.assertFalse(receipt["training_label_file_opened"])
                return original(path, sha)
            try:
                with self.assertRaises(t.Blocked):
                    (cache/"train.json").read_bytes()
                for path in forbidden:
                    with self.assertRaises(t.Blocked):
                        with open(path, "rb") as stream:
                            stream.read()
                with patch.object(t, "read_verified", observed), patch.object(t.original, "verify_freeze", side_effect=AssertionError), \
                        patch.object(t.original, "load_fit_inputs", side_effect=AssertionError):
                    samples, labels, manifest, sha = t.load_training(cache, output, boundary, identity, hashes, 10)
                self.assertEqual(len(labels), 10)
                self.assertEqual(manifest["fold_counts"], [2]*5)
                self.assertEqual(set(boundary.opened_inputs), set(t.INPUT_HASHES))
                self.assertEqual(samples, sorted(samples, key=lambda r: r["jid"]))
                # Exercise late NumPy library imports/solve/predict while the
                # same production data-file boundary remains active.
                prepared = t.prepare_training(samples[:8], {r["jid"]: labels[r["jid"]] for r in samples[:8]})
                fit = t.fit_ridge(prepared, Fraction(1, 10))
                raw, predicted = t.predict_ridge(fit, samples[8:])
                t.write_json(output/"synthetic-fit-receipt.json", {"prediction_count": len(predicted), "raw_shape": list(raw.shape)})
            finally:
                boundary.stop()

    def test_label_digest_failure_preserves_prelabel_manifest_and_hash(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            cache, output = base/"inputs", base/"outputs"
            hashes = fixture(cache)
            output.mkdir()
            (cache/"train.json").write_text("corrupted fixture")
            boundary = t.ReadBoundary(cache, output).start()
            try:
                with self.assertRaisesRegex(t.Blocked, "digest mismatch"):
                    t.load_training(cache, output, boundary, {"protocol_commit": t.PROTOCOL_COMMIT,
                        "protocol_sha256": t.PROTOCOL_SHA256}, hashes, 10)
                self.assertTrue((output/"folds-receipt.json").exists())
            finally:
                boundary.stop()

    def test_aliases_and_public_output_escape_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            cache = base/"inputs"
            fixture(cache)
            (cache/"train.json").unlink()
            (cache/"train.json").symlink_to(cache/"metadata.json")
            with self.assertRaisesRegex(ValueError, "symlinks"):
                t.ReadBoundary(cache, base/"outputs")
            with patch.object(t, "OUTPUT_BASE", base/"allowed"):
                with self.assertRaises(ValueError):
                    t.validate_output_location(base/"elsewhere")
                (base/"allowed").mkdir()
                (base/"allowed/escape").symlink_to(base)
                with self.assertRaises(ValueError):
                    t.validate_output_location(base/"allowed/escape/elsewhere")
                t.validate_output_location(base/"allowed/new-run")

    def test_exact_neighbor_predictions_exclude_validation_and_preserve_ties(self):
        training = [{"jid": jid, "counts": {"H": i+1, "He": 1}} for i, jid in enumerate(
            ("JVASP-1", "JVASP-10", "JVASP-2", "JVASP-20", "JVASP-3", "JVASP-4"))]
        model = t.original.ExactNeighbors(training)
        self.assertEqual(model.neighbors({"Li": 1}), sorted(r["jid"] for r in training)[:5])
        query = {"H": 2, "He": 1}
        expected = sorted(training, key=lambda r: (sum((abs(Fraction(query.get(e, 0), 3)
            - Fraction(r["counts"].get(e, 0), sum(r["counts"].values())))
            for e in set(query)|set(r["counts"])), Fraction(0)), r["jid"]))[:5]
        self.assertEqual(model.neighbors(query), [r["jid"] for r in expected])


class TrainingTailEngineeringTests(unittest.TestCase):
    def test_engineering_log_source_scope_and_mutations(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            path, receipt, identity = engineering_fixture(root)
            with patch.object(t, "ROOT", root):
                valid = t.verify_engineering(path, identity)
                self.assertEqual(valid["passed"], 1)
                with self.assertRaisesRegex(t.Blocked, "changed"):
                    t.verify_engineering(path, identity, "0"*64)
                changed = deepcopy(receipt)
                changed["tests"]["skipped"] = 1
                path.write_bytes(t.json_bytes(changed))
                with self.assertRaisesRegex(t.Blocked, "skipped"):
                    t.verify_engineering(path, identity)
                path.write_bytes(t.json_bytes(receipt))
                (root/"tests/test_training_tail.py").write_text("changed")
                with self.assertRaisesRegex(t.Blocked, "hashes"):
                    t.verify_engineering(path, identity)
                with self.assertRaises(t.Blocked):
                    t.verify_engineering(root/"reports/constrained-v1.json", identity)

    def test_engineering_uses_final_summary_not_words_or_nested_ok(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            path, receipt, identity = engineering_fixture(root)
            log = root/receipt["tests"]["log_path"]
            texts = [
                ("test_rejects_skipped_receipt ... ok\n\nRan 1 test in 0.001s\n\nOK\n", True),
                ("test_case ... skipped 'fixture'\n\nRan 1 test in 0.001s\n\nOK (skipped=1)\n", False),
                ("Ran 1 test in 0.001s\n\nOK\nRan 1 test in 0.002s\n\nFAILED (failures=1)\n", False),
                ("Ran 2 tests in 0.001s\n\nOK\n", False)]
            with patch.object(t, "ROOT", root):
                for text, expected in texts:
                    log.write_text(text)
                    receipt["tests"]["log_sha256"] = hashlib.sha256(log.read_bytes()).hexdigest()
                    path.write_bytes(t.json_bytes(receipt))
                    if expected:
                        self.assertEqual(t.verify_engineering(path, identity)["passed"], 1)
                    else:
                        with self.assertRaises(t.Blocked):
                            t.verify_engineering(path, identity)

    def test_source_and_environment_mismatches_precede_fitting(self):
        with patch.object(t.original, "sha256_file", return_value="changed"):
            with self.assertRaisesRegex(t.Blocked, "pinned source"):
                t.protocol_identity()
        with patch.object(t.original, "__file__", "/tmp/shadowed-constrained.py"):
            with self.assertRaisesRegex(t.Blocked, "loaded scientific"):
                t.protocol_identity()
        with patch.object(t.platform, "python_version", return_value="0.0.0"):
            with self.assertRaisesRegex(t.Blocked, "CPython"):
                t.environment_identity()
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            with patch.object(t, "OUTPUT_BASE", base), patch.object(t, "protocol_identity",
                    side_effect=t.Blocked("BLOCKED_SOURCE", "synthetic source mismatch")), \
                    patch.object(t, "fit_ridge", side_effect=AssertionError), patch.object(t, "load_training", side_effect=AssertionError):
                result = t.execute_pass(base/"never-open", base/"pass", base/"never-open-engineering")
                self.assertEqual(result["status"], "BLOCKED_SOURCE")
                self.assertEqual(result["opened_original_input_files"], [])
                self.assertTrue((base/"pass/incomplete-checkpoint.json").exists())

    def test_resource_blocks_and_incomplete_receipts_cannot_advance(self):
        for budget in (t.Budget(seconds=-1), t.Budget(memory_kib=0)):
            with self.assertRaises(t.Blocked) as raised:
                budget.check()
            self.assertEqual(raised.exception.status, "INCOMPLETE")
            self.assertEqual(budget.usage()["budget_checks"], 1)
        self.assertEqual(t.compare_passes({"status": "INCOMPLETE"}, {"status": "INCOMPLETE"})["execution_status"], "BLOCKED_OR_INCOMPLETE")
        shell = {"status": "COMPLETE", "decision": {"status": "GO_DESIGN_FRESH_PROTOCOL", "selected_model": "ridge_1_10"}}
        self.assertEqual(t.compare_passes(shell, shell)["execution_status"], "BLOCKED_REPRODUCIBILITY")

    def test_worker_timeout_preserves_incomplete_reason_and_new_process_environment(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            identity = {"protocol_id": t.PROTOCOL_ID, "implementation_sha256": {"fake": "hash"}}
            class FakeProcess:
                def __init__(self, command, **kwargs):
                    self.killed = False
                    self.command = command
                    for key in t.THREAD_VARIABLES:
                        self_test.assertEqual(kwargs["env"][key], "1")
                    self_test.assertEqual(kwargs["env"]["PYTHONHASHSEED"], "0")
                def wait(self, timeout=None):
                    if not self.killed:
                        raise subprocess.TimeoutExpired(self.command, timeout)
                    return -9
                def kill(self):
                    self.killed = True
            self_test = self
            with patch.object(t, "OUTPUT_BASE", base), patch.object(t, "protocol_identity", return_value=identity), \
                    patch.object(t, "verify_engineering", return_value={"sha256": "receipt"}), \
                    patch.object(t.subprocess, "Popen", FakeProcess):
                result = t.run_two(base/"unused-input", base/"run", base/"unused-engineering")
            self.assertEqual(result["decision"]["execution_status"], "BLOCKED_OR_INCOMPLETE")
            self.assertTrue((base/"run/pass-1-termination.json").exists())
            self.assertTrue((base/"run/pass-2-termination.json").exists())

    def test_no_heldout_label_argument_and_fit_inputs_are_restricted(self):
        samples = sorted(rows(), key=lambda r: r["jid"])
        targets = {r["jid"]: {"gap": Fraction(i % 7), "formation": Fraction(i % 5-3)}
                   for i, r in enumerate(samples)}
        manifest = t.fold_manifest(samples)
        assignments = {r["jid"]: r["fold"] for r in manifest["records"]}
        original_prepare = t.prepare_training
        fit_scopes = []
        def spy(training, labels):
            train_ids = {r["jid"] for r in training}
            self.assertEqual(train_ids, set(labels))
            omitted = {assignments[jid] for jid in set(targets)-train_ids}
            self.assertEqual(len(omitted), 1)
            self.assertFalse(any(assignments[jid] in omitted for jid in labels))
            fit_scopes.append(train_ids)
            return original_prepare(training, labels)
        with tempfile.TemporaryDirectory() as temporary, patch.object(t, "prepare_training", spy):
            output = Path(temporary)
            checkpoint = {}
            # Tiny synthetic folds deliberately cannot supply the tail rank.
            # All 15 tiny fits finish, but unavailable ranks must block metrics.
            with self.assertRaisesRegex(t.Blocked, "order statistic unavailable"):
                t.compute_oof(samples, targets, manifest, output, t.Budget(), checkpoint)
            self.assertEqual(len(fit_scopes), 5)
            self.assertEqual(len(checkpoint["completed_fits"]), 15)
            self.assertTrue((output/"checkpoint-after-fold-4.json").exists())
            self.assertEqual(set(checkpoint["predictions"]["5nn"]), set(targets))


if __name__ == "__main__":
    unittest.main()
