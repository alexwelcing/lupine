#!/usr/bin/env python3
"""Frozen, training-only extreme-tail development. Never a calibration run.

The public `run` command executes two fresh single-thread processes. `pass` is
the worker command. Both refuse existing output directories. See the protocol
and run guide before executing on the original 4096 training representatives.
"""
from __future__ import annotations

import argparse
from fractions import Fraction
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import platform
import re
import resource
import subprocess
import sys
import time

import constrained_benchmark as original


ROOT = Path(__file__).resolve().parents[1]
PROTOCOL_ID = "jarvis-training-tail-v1"
PROTOCOL_COMMIT = "188752f733e4768a995165fe9770696d5bbf09e1"
PROTOCOL_SHA256 = "56b1810a2bae15261f64eef62abb7d74886d80b3116c7233700b0c52da88c9bf"
SOURCE_SHA256 = "0e9e53346a3d435ebdd6606117623df15121fa801e70a26d72433a3530235430"
INPUT_HASHES = {
    "metadata.json": "e4f623329be262c9057eb9a7e9d7ca96fb05c8e7877845e3da4fb450c8c90655",
    "train.json": "6ffb1e687ef888388f06b4ac4d2b951f3600e4ea00fb04f9d8a1d03c5c2a3a31",
    "source-receipt.json": "dd2fd4405009e0b897b986b7392f21f664b3928f7fc4330909bef207dd5e3def",
    "custody-receipt.json": "bed6061e33bc7961f6cff858d043b012c8e2337ae31decd6ac30acd5f82fe626",
}
TARGETS = ("gap", "formation")
FEATURES = tuple(sorted(original.ELEMENTS))
LAMBDAS = (Fraction(1, 1000000), Fraction(1, 1000), Fraction(1, 10))
MODELS = ("5nn",) + tuple("ridge_" + str(value).replace("/", "_") for value in LAMBDAS)
THREAD_VARIABLES = ("OPENBLAS_NUM_THREADS", "OMP_NUM_THREADS", "MKL_NUM_THREADS",
                    "BLIS_NUM_THREADS", "VECLIB_MAXIMUM_THREADS", "NUMEXPR_NUM_THREADS")
EXPECTED_COUNT = 4096
EXPECTED_FOLDS = [820, 819, 819, 819, 819]
PASS_SECONDS = 900
MAX_RSS_KIB = 2 * 1024 * 1024
TAU = Fraction(1, 1000000)
OUTPUT_BASE = ROOT / ".cache" / "training-tail"
SCIENTIFIC_FIELDS = ("protocol_id", "protocol_commit", "protocol_sha256", "input_sha256", "implementation_sha256",
                     "fold_manifest_sha256", "metadata_artifact_sha256", "metrics", "decision", "prediction_sha256")


class Blocked(RuntimeError):
    def __init__(self, status, reason):
        self.status = status
        super().__init__(reason)


def json_bytes(value):
    return original.canonical_bytes(value)


def digest(value):
    return hashlib.sha256(json_bytes(value)).hexdigest()


def immutable_bytes(path, raw):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        if path.read_bytes() != raw:
            raise ValueError("immutable artifact mismatch: " + path.name)
    else:
        with path.open("xb") as stream:
            stream.write(raw)
    return hashlib.sha256(raw).hexdigest()


def write_json(path, value):
    return immutable_bytes(path, json_bytes(value))


def read_verified(path, expected):
    raw = Path(path).read_bytes()
    if hashlib.sha256(raw).hexdigest() != expected:
        raise Blocked("BLOCKED_INPUT", "input digest mismatch: " + Path(path).name)
    return original.parse_json_bytes(raw)


def protocol_identity():
    if (Path(original.__file__).resolve() != ROOT/"scripts/constrained_benchmark.py"
            or Path(original.encode.__code__.co_filename).resolve() != ROOT/"src/lupine_discovery/serialization.py"):
        raise Blocked("BLOCKED_SOURCE", "loaded scientific helper is not the source file being hashed")
    paths = {
        "docs/training-tail-protocol-v1.md": PROTOCOL_SHA256,
        "docs/constrained-benchmark-protocol.md": original.PROTOCOL_SHA256,
        "docs/constrained-format-amendment.md": original.FORMAT_AMENDMENT_SHA256,
        "scripts/constrained_benchmark.py": SOURCE_SHA256,
    }
    for relative, expected in paths.items():
        if original.sha256_file(ROOT / relative) != expected:
            raise Blocked("BLOCKED_SOURCE", "pinned source changed: " + relative)
    return {"protocol_id": PROTOCOL_ID, "protocol_commit": PROTOCOL_COMMIT,
            "protocol_sha256": PROTOCOL_SHA256,
            "original_protocol_commit": original.PROTOCOL_COMMIT,
            "original_protocol_sha256": original.PROTOCOL_SHA256,
            "format_amendment_commit": original.FORMAT_AMENDMENT_COMMIT,
            "format_amendment_sha256": original.FORMAT_AMENDMENT_SHA256,
            "implementation_sha256": {"scripts/training_tail.py": original.sha256_file(Path(__file__)),
                                       "scripts/constrained_benchmark.py": SOURCE_SHA256,
                                       "src/lupine_discovery/serialization.py": original.sha256_file(
                                           ROOT/"src/lupine_discovery/serialization.py")}}


class ReadBoundary:
    """Audit all Python-level opens, including aliases and builtins/io/os.open.

    Installed only in a worker after numerical-library loading. The production
    worker keeps it active through receipt writing. Tests deactivate their own
    hook because Python audit hooks cannot be removed.
    """
    def __init__(self, input_cache, output_dir):
        self.cache, self.output = Path(input_cache).resolve(), Path(output_dir).resolve()
        if self.cache == self.output or self.cache in self.output.parents or self.output in self.cache.parents:
            raise ValueError("input and experiment output directories must be separate")
        self.paths = {name: (self.cache / name).resolve() for name in INPUT_HASHES}
        if any((self.cache/name).is_symlink() or path.parent != self.cache or path.name != name
               for name, path in self.paths.items()):
            raise ValueError("original input files must not be symlinks or aliases")
        self.labels_allowed = False
        self.source_paths = {(ROOT/relative).resolve() for relative in (
            "docs/training-tail-protocol-v1.md", "docs/constrained-benchmark-protocol.md",
            "docs/constrained-format-amendment.md", "scripts/constrained_benchmark.py", "scripts/training_tail.py",
            "src/lupine_discovery/serialization.py")}
        self.library_roots = tuple({Path(sys.prefix).resolve(), Path(sys.base_prefix).resolve(), (ROOT/"src").resolve()})
        self.active = False
        self.opened_inputs = []

    def _hook(self, event, args):
        if not self.active or event != "open" or isinstance(args[0], int):
            return
        supplied = Path(os.path.abspath(os.fsdecode(args[0])))
        path = supplied.resolve()
        mode = args[1]
        flags = args[2]
        writing = (isinstance(mode, str) and any(c in mode for c in "wax+")) or (
            isinstance(flags, int) and bool(flags & (os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC)))
        if self.output == path or self.output in path.parents:
            return
        name = next((name for name, expected in self.paths.items() if path == supplied == expected), None)
        if name is not None:
            if writing or (name == "train.json" and not self.labels_allowed):
                raise Blocked("BLOCKED_ACCESS", "input read boundary rejected: " + path.name)
            self.opened_inputs.append(name)
            return
        if path in self.source_paths and not writing:
            return
        library = any(root in path.parents for root in self.library_roots)
        if library and path.suffix in (".py", ".pyc", ".so") and (not writing or path.suffix == ".pyc"):
            return
        raise Blocked("BLOCKED_ACCESS", "unexpected data-file access: " + path.name)

    def start(self):
        sys.addaudithook(self._hook)
        self.active = True
        return self

    def stop(self):
        self.active = False


def validate_rows(rows, expected_count=EXPECTED_COUNT):
    if not isinstance(rows, list) or len(rows) != expected_count:
        raise Blocked("BLOCKED_INPUT", "training representative count mismatch")
    clean, ids, keys = [], set(), set()
    for row in rows:
        jid, key, counts = row.get("jid"), row.get("composition_key"), row.get("counts")
        if not isinstance(jid, str) or not re.fullmatch(r"JVASP-[0-9]+", jid) or jid in ids:
            raise Blocked("BLOCKED_INPUT", "invalid or duplicate training JID")
        if not isinstance(counts, dict) or not counts or "O" in counts or any(
                e not in FEATURES or type(n) is not int or n <= 0 for e, n in counts.items()):
            raise Blocked("BLOCKED_INPUT", "invalid training composition")
        normalized_key = "|".join(f"{e}:{counts[e]}" for e in sorted(counts))
        if math.gcd(*counts.values()) != 1 or key != normalized_key or key in keys:
            raise Blocked("BLOCKED_INPUT", "duplicate or noncanonical composition identity")
        ids.add(jid)
        keys.add(key)
        clean.append({"jid": jid, "composition_key": key, "counts": dict(sorted(counts.items()))})
    return sorted(clean, key=lambda row: row["jid"])


def fold_manifest(rows):
    def order(row):
        key = row["composition_key"]
        return hashlib.sha256(f"{PROTOCOL_ID}\nfold\n{key}".encode("utf-8")).digest(), key, row["jid"]
    assignment = {row["jid"]: i % 5 for i, row in enumerate(sorted(rows, key=order))}
    return {"schema": "lupine.discovery.training_tail.folds.v1", "protocol_id": PROTOCOL_ID,
            "hash_prefix": PROTOCOL_ID + "\nfold\n", "fold_counts": [sum(v == f for v in assignment.values()) for f in range(5)],
            "records": [{"jid": r["jid"], "composition_key": r["composition_key"], "fold": assignment[r["jid"]]}
                        for r in sorted(rows, key=lambda r: r["jid"])]}


def load_training(input_cache, output_dir, boundary, identity, input_hashes=None, expected_count=EXPECTED_COUNT):
    hashes = INPUT_HASHES if input_hashes is None else input_hashes
    cache, output = Path(input_cache), Path(output_dir)
    custody = read_verified(cache / "custody-receipt.json", hashes["custody-receipt.json"])
    source = read_verified(cache / "source-receipt.json", hashes["source-receipt.json"])
    for filename, field in (("source-receipt.json", "source_receipt_sha256"),
                            ("metadata.json", "metadata_sha256"), ("train.json", "train_sha256")):
        if custody.get(field) != hashes[filename]:
            raise Blocked("BLOCKED_INPUT", "custody dependency mismatch: " + filename)
    for receipt in (custody, source):
        for key, expected in (("protocol_id", original.PROTOCOL_ID), ("protocol_commit", original.PROTOCOL_COMMIT),
                              ("protocol_sha256", original.PROTOCOL_SHA256),
                              ("format_amendment_commit", original.FORMAT_AMENDMENT_COMMIT),
                              ("format_amendment_sha256", original.FORMAT_AMENDMENT_SHA256)):
            if receipt.get(key) != expected:
                raise Blocked("BLOCKED_INPUT", "original protocol identity mismatch")
    metadata = read_verified(cache / "metadata.json", hashes["metadata.json"])
    rows = validate_rows(metadata["selected"]["train"], expected_count)
    manifest = fold_manifest(rows)
    if expected_count == EXPECTED_COUNT and manifest["fold_counts"] != EXPECTED_FOLDS:
        raise Blocked("BLOCKED_INPUT", "fold count mismatch")
    manifest["input_sha256"] = dict(hashes)
    manifest["protocol_commit"] = identity["protocol_commit"]
    manifest["protocol_sha256"] = identity["protocol_sha256"]
    # Do not read even train.json bytes for hashing before this immutable write.
    manifest_sha = write_json(output / "folds.json", manifest)
    write_json(output/"folds-receipt.json", {"protocol_id": PROTOCOL_ID, "protocol_commit": identity["protocol_commit"],
                                           "protocol_sha256": identity["protocol_sha256"],
                                           "fold_manifest_sha256": manifest_sha,
                                           "training_label_file_opened": False})
    boundary.labels_allowed = True
    labels = read_verified(cache / "train.json", hashes["train.json"])
    if labels.get("role") != "train" or labels.get("protocol_id") != original.PROTOCOL_ID:
        raise Blocked("BLOCKED_INPUT", "training label role/protocol mismatch")
    targets = labels.get("targets", {})
    if set(targets) != {r["jid"] for r in rows}:
        raise Blocked("BLOCKED_INPUT", "training target identity mismatch")
    values = {}
    for jid, pair in targets.items():
        if not isinstance(pair, dict) or set(pair) != set(TARGETS):
            raise Blocked("BLOCKED_INPUT", "training target fields mismatch")
        values[jid] = {}
        for target, value in pair.items():
            if not isinstance(value, str) or not re.fullmatch(r"-?[0-9]+(?:/[1-9][0-9]*)?", value):
                raise Blocked("BLOCKED_INPUT", "training target must be a finite rational string")
            values[jid][target] = Fraction(value)
    return rows, values, manifest, manifest_sha


def environment_identity():
    if platform.python_implementation() != "CPython" or platform.python_version() != "3.12.14":
        raise Blocked("BLOCKED_ENVIRONMENT", "requires CPython3.12.14")
    if platform.system() != "Linux" or platform.machine() != "x86_64":
        raise Blocked("BLOCKED_ENVIRONMENT", "requires Linux x86-64")
    if os.environ.get("PYTHONHASHSEED") != "0" or any(os.environ.get(k) != "1" for k in THREAD_VARIABLES):
        raise Blocked("BLOCKED_ENVIRONMENT", "fresh process hash/thread environment mismatch")
    import numpy as np
    configuration = np.__config__.show(mode="dicts")
    dependencies = configuration["Build Dependencies"]
    if np.__version__ != "2.3.5" or any(
            dependencies[name].get("version") != "0.3.30" or
            "USE64BITINT" not in dependencies[name].get("openblas configuration", "")
            for name in ("blas", "lapack")):
        raise Blocked("BLOCKED_ENVIRONMENT", "requires NumPy2.3.5 and OpenBLAS/LAPACK0.3.30 ILP64")
    distribution = importlib.metadata.distribution("numpy")
    package_files = {}
    for relative in sorted(distribution.files or (), key=str):
        if "__pycache__" not in str(relative) and not str(relative).endswith(".pyc"):
            path = Path(distribution.locate_file(relative))
            if path.is_file():
                package_files[str(relative)] = original.sha256_file(path)
    libraries = {}
    for line in Path("/proc/self/maps").read_text().splitlines():
        parts = line.split(maxsplit=5)
        if len(parts) == 6 and "openblas" in parts[5].lower() and Path(parts[5]).is_file():
            path = Path(parts[5]).resolve()
            libraries[str(path)] = original.sha256_file(path)
    if not libraries or not package_files:
        raise Blocked("BLOCKED_ENVIRONMENT", "unable to identify loaded BLAS or NumPy package")
    cpu = {}
    for line in Path("/proc/cpuinfo").read_text().splitlines():
        if ":" in line:
            key, value = (part.strip() for part in line.split(":", 1))
            if key in ("vendor_id", "cpu family", "model", "model name", "stepping", "flags"):
                cpu.setdefault(key, value)
    return {"python": platform.python_version(), "implementation": platform.python_implementation(),
            "executable": str(Path(sys.executable).resolve()), "platform": platform.platform(), "machine": platform.machine(),
            "cpu": cpu, "numpy_version": np.__version__, "numpy_configuration": configuration,
            "numpy_package_sha256": digest(package_files), "numpy_package_files": package_files,
            "loaded_blas_sha256": libraries, "thread_environment": {k: os.environ[k] for k in THREAD_VARIABLES},
            "pythonhashseed": os.environ["PYTHONHASHSEED"]}


def feature_vector(row):
    counts = row["counts"]
    total = sum(counts.values())
    return tuple(Fraction(counts.get(e, 0), total) for e in FEATURES)


def prepare_training(rows, training_targets):
    """Only training rows and their labels cross this fitting interface."""
    import numpy as np
    if [r["jid"] for r in rows] != sorted(r["jid"] for r in rows):
        raise ValueError("training matrix rows must be in ASCII JID order")
    if set(training_targets) != {r["jid"] for r in rows} or not rows:
        raise ValueError("fit target scope must equal training-fold IDs")
    vectors = [feature_vector(r) for r in rows]
    n = len(rows)
    mux = tuple(sum((x[j] for x in vectors), Fraction(0)) / n for j in range(len(FEATURES)))
    muy = tuple(sum((training_targets[r["jid"]][target] for r in rows), Fraction(0)) / n for target in TARGETS)
    try:
        x = np.array([[float(v-m) for v, m in zip(row, mux)] for row in vectors], dtype=np.float64)
        y = np.array([[float(training_targets[r["jid"]][target]-muy[j]) for j, target in enumerate(TARGETS)]
                      for r in rows], dtype=np.float64)
    except (OverflowError, FloatingPointError) as error:
        raise Blocked("BLOCKED_NUMERICAL", "training value exceeds binary64 range") from error
    if not np.isfinite(x).all() or not np.isfinite(y).all():
        raise Blocked("BLOCKED_NUMERICAL", "nonfinite centered training matrix")
    return {"ids": [r["jid"] for r in rows], "mux": mux, "muy": muy, "x": x, "y": y,
            "seen_elements": sorted({e for row in rows for e in row["counts"]})}


def fit_ridge(prepared, regularization):
    import numpy as np
    if Fraction(regularization) <= 0:
        raise ValueError("ridge regularization must be positive")
    x, y = prepared["x"], prepared["y"]
    n = len(prepared["ids"])
    gram = x.T @ x / n
    cross = x.T @ y / n
    a = gram + np.float64(float(regularization)) * np.eye(len(FEATURES), dtype=np.float64)
    if not np.isfinite(a).all() or not np.isfinite(cross).all():
        raise Blocked("BLOCKED_NUMERICAL", "nonfinite ridge normal equation")
    try:
        beta = np.linalg.solve(a, cross)
    except np.linalg.LinAlgError as error:
        raise Blocked("BLOCKED_NUMERICAL", "ridge solver failed") from error
    if not np.isfinite(beta).all():
        raise Blocked("BLOCKED_NUMERICAL", "nonfinite ridge coefficient")
    numerator = float(np.linalg.norm(a @ beta-cross, ord=np.inf))
    denominator = float(np.linalg.norm(a, ord=np.inf) * np.linalg.norm(beta, ord=np.inf)
                        + np.linalg.norm(cross, ord=np.inf))
    if not math.isfinite(numerator) or not math.isfinite(denominator):
        raise Blocked("BLOCKED_NUMERICAL", "nonfinite numerical residual check")
    residual = numerator / denominator if denominator else (0.0 if numerator == 0 else math.inf)
    if residual > 1e-10:
        raise Blocked("BLOCKED_NUMERICAL", "ridge backward residual exceeds1e-10")
    return {"beta": beta, "mux": prepared["mux"], "muy": prepared["muy"],
            "training_ids": prepared["ids"], "seen_elements": prepared["seen_elements"],
            "relative_backward_residual": str(Fraction.from_float(residual))}


def quantize(value):
    value = float(value)
    if not math.isfinite(value):
        raise Blocked("BLOCKED_NUMERICAL", "nonfinite raw prediction")
    return Fraction(round(Fraction.from_float(value) * 10**8), 10**8)


def predict_ridge(fit, rows):
    """Only query metadata crosses this interface; no held-out targets."""
    import numpy as np
    if [r["jid"] for r in rows] != sorted(r["jid"] for r in rows):
        raise ValueError("validation matrix rows must be in ASCII JID order")
    if set(fit["training_ids"]) & {r["jid"] for r in rows}:
        raise ValueError("fit and validation identities overlap")
    try:
        x = np.array([[float(v-m) for v, m in zip(feature_vector(row), fit["mux"])] for row in rows], dtype=np.float64)
        raw = x @ fit["beta"] + np.array([float(v) for v in fit["muy"]], dtype=np.float64)
    except (OverflowError, FloatingPointError) as error:
        raise Blocked("BLOCKED_NUMERICAL", "prediction value exceeds binary64 range") from error
    if not np.isfinite(x).all() or not np.isfinite(raw).all():
        raise Blocked("BLOCKED_NUMERICAL", "nonfinite validation matrix or prediction")
    predictions = {row["jid"]: {target: str(quantize(raw[i, j])) for j, target in enumerate(TARGETS)}
                   for i, row in enumerate(rows)}
    return raw, predictions


def tail_rank(n):
    return -(-((n+1)*399) // 400)


def residual_metrics(values):
    residuals = sorted(Fraction(v) for v in values)
    if not residuals or residuals[0] < 0:
        raise ValueError("nonempty nonnegative residuals required")
    n, rank = len(residuals), tail_rank(len(residuals))
    if rank > n:
        raise Blocked("BLOCKED_RANK", "descriptive extreme-tail order statistic unavailable")
    middle = residuals[n//2] if n % 2 else (residuals[n//2-1]+residuals[n//2])/2
    result = {"count": n, "tail_rank": rank, "tail": str(residuals[rank-1]), "median": str(middle),
              "mae": str(sum(residuals, Fraction(0))/n), "maximum": str(residuals[-1])}
    for name, p in (("p90", Fraction(9, 10)), ("p95", Fraction(19, 20)), ("p99", Fraction(99, 100))):
        result[name] = str(residuals[-(-(n*p.numerator)//p.denominator)-1])
    return result


def model_metrics(predictions, labels, assignments):
    if set(predictions) != set(labels) or set(predictions) != set(assignments):
        raise ValueError("out-of-fold metric identities must match")
    result = {}
    for target in TARGETS:
        residuals = {jid: abs(Fraction(labels[jid][target])-Fraction(pair[target]))
                     for jid, pair in predictions.items()}
        folds = [residual_metrics([v for jid, v in residuals.items() if assignments[jid] == f]) for f in range(5)]
        tails = [Fraction(f["tail"]) for f in folds]
        result[target] = {"pooled": residual_metrics(list(residuals.values())), "folds": folds,
                          "fold_tail_range": {"min": str(min(tails)), "max": str(max(tails)),
                                              "range": str(max(tails)-min(tails))}}
    return result


def gate_target(candidate, baseline, inflation=Fraction(0)):
    q = lambda row, key: Fraction(row[key])
    pooled, base = candidate["pooled"], baseline["pooled"]
    positive = q(base, "tail") > 0
    margins = {
        "pooled_tail_10pct": Fraction(9, 10)*q(base, "tail")-q(pooled, "tail")-inflation,
        "pooled_mae_nonincrease": q(base, "mae")-q(pooled, "mae")-inflation,
        "pooled_max_10pct_allowance": Fraction(11, 10)*q(base, "maximum")-q(pooled, "maximum")-inflation,
    }
    folds = []
    for row, ref in zip(candidate["folds"], baseline["folds"]):
        folds.append({"strict_tail_improvement": q(ref, "tail")-q(row, "tail")-inflation,
                      "tail_10pct_allowance": Fraction(11, 10)*q(ref, "tail")-q(row, "tail")-inflation,
                      "max_10pct_allowance": Fraction(11, 10)*q(ref, "maximum")-q(row, "maximum")-inflation})
    if len(folds) != 5 or len(candidate["folds"]) != 5 or len(baseline["folds"]) != 5:
        raise ValueError("exactly five fold metrics required")
    improvements = sum(row["strict_tail_improvement"] > 0 for row in folds)
    passed = positive and all(v >= 0 for v in margins.values()) and improvements >= 4 and all(
        row["tail_10pct_allowance"] >= 0 and row["max_10pct_allowance"] >= 0 for row in folds)
    return {"passed": passed, "positive_baseline_tail": positive, "strictly_improving_folds": improvements,
            "metric_inflation": str(inflation), "pooled_margins": {k: str(v) for k, v in margins.items()},
            "fold_margins": [{k: str(v) for k, v in row.items()} for row in folds],
            "pooled_tail_ratio": str(q(pooled, "tail")/q(base, "tail")) if positive else None,
            "ratio_unavailable_reason": None if positive else "zero_pooled_baseline_tail"}


def decide(metrics, failures=None):
    failures = failures or {}
    alternatives, eligible = {}, []
    if "5nn" not in metrics:
        return {"status": "NO_GO_MODEL_IMPROVEMENT", "reason": "baseline_incomplete", "selected_model": None,
                "alternatives": {}, "failures": failures}
    for model, regularization in zip(MODELS[1:], LAMBDAS):
        if model not in metrics or model in failures:
            alternatives[model] = {"status": "INCOMPLETE_OR_BLOCKED", "lambda": str(regularization),
                                   "failures": failures.get(model, [])}
            continue
        ordinary = {target: gate_target(metrics[model][target], metrics["5nn"][target]) for target in TARGETS}
        guarded = {target: gate_target(metrics[model][target], metrics["5nn"][target], TAU) for target in TARGETS}
        provisional = all(result["passed"] for result in ordinary.values())
        robust = all(result["passed"] for result in guarded.values())
        status = "ELIGIBLE" if robust else ("NUMERICAL_BORDERLINE" if provisional else "INELIGIBLE")
        alternatives[model] = {"status": status, "lambda": str(regularization), "ordinary": ordinary, "numeric_guard": guarded}
        if robust:
            ratios = [Fraction(ordinary[target]["pooled_tail_ratio"]) for target in TARGETS]
            eligible.append(((max(ratios), sum(ratios, Fraction(0)), -regularization), model))
    selected = min(eligible)[1] if eligible else None
    return {"status": "GO_DESIGN_FRESH_PROTOCOL" if selected else "NO_GO_MODEL_IMPROVEMENT",
            "selected_model": selected, "alternatives": alternatives, "failures": failures,
            "claim": "development selection only; not calibration, coverage, or independent evaluation"}


class Budget:
    def __init__(self, seconds=PASS_SECONDS, memory_kib=MAX_RSS_KIB):
        self.started = time.monotonic()
        self.initial = resource.getrusage(resource.RUSAGE_SELF)
        self.seconds, self.memory_kib = seconds, memory_kib
        self.checks = 0

    def check(self):
        self.checks += 1
        if time.monotonic()-self.started > self.seconds:
            raise Blocked("INCOMPLETE", "process wall-time budget exceeded")
        if resource.getrusage(resource.RUSAGE_SELF).ru_maxrss > self.memory_kib:
            raise Blocked("INCOMPLETE", "process peak-RSS budget exceeded")

    def usage(self):
        current = resource.getrusage(resource.RUSAGE_SELF)
        return {"elapsed_seconds": str(time.monotonic()-self.started),
                "user_cpu_seconds": str(current.ru_utime-self.initial.ru_utime),
                "system_cpu_seconds": str(current.ru_stime-self.initial.ru_stime),
                "peak_rss_kib_linux": current.ru_maxrss, "budget_checks": self.checks,
                "limit_seconds": self.seconds, "limit_peak_rss_kib_linux": self.memory_kib}


def compute_oof(rows, labels, manifest, output, budget, checkpoint):
    import numpy as np
    assignments = {r["jid"]: r["fold"] for r in manifest["records"]}
    predictions = {name: {} for name in MODELS}
    failures, fitted, artifacts, stages = {}, {}, {}, []
    checkpoint.update(predictions=predictions, failures=failures, completed_fits=fitted, artifacts=artifacts, stages=stages)
    for fold in range(5):
        stage_start = time.monotonic()
        training = [r for r in rows if assignments[r["jid"]] != fold]
        validation = [r for r in rows if assignments[r["jid"]] == fold]
        train_targets = {r["jid"]: labels[r["jid"]] for r in training}
        # The fitting API receives this restricted map, not the complete labels.
        neighbor_model = original.ExactNeighbors(training)
        neighbor_ids = {}
        for row in validation:
            budget.check()
            neighbors = neighbor_model.neighbors(row["counts"])
            if row["jid"] in neighbors:
                raise AssertionError("held-out candidate became own neighbor")
            neighbor_ids[row["jid"]] = neighbors
            predictions["5nn"][row["jid"]] = {
                target: str(sum((train_targets[jid][target] for jid in neighbors), Fraction(0))/5)
                for target in TARGETS}
        stages.append({"fold": fold, "stage": "5nn", "elapsed_seconds": str(time.monotonic()-stage_start)})
        artifacts[f"fold-{fold}-neighbors.json"] = write_json(output/f"fold-{fold}-neighbors.json", neighbor_ids)
        budget.check()
        preparation_start = time.monotonic()
        try:
            prepared = prepare_training(training, train_targets)
        except Blocked as error:
            if error.status != "BLOCKED_NUMERICAL":
                raise
            for model in MODELS[1:]:
                failures.setdefault(model, []).append({"fold": fold, "status": error.status, "reason": str(error)})
            stages.append({"fold": fold, "stage": "exact_centering_failed", "elapsed_seconds": str(time.monotonic()-preparation_start)})
            write_json(output/f"checkpoint-after-fold-{fold}.json", checkpoint)
            continue
        stages.append({"fold": fold, "stage": "exact_centering", "elapsed_seconds": str(time.monotonic()-preparation_start)})
        fold_meta = {"training_ids": prepared["ids"], "validation_ids": [r["jid"] for r in validation],
                     "feature_order": list(FEATURES), "target_order": list(TARGETS),
                     "feature_means": list(map(str, prepared["mux"])), "target_means": list(map(str, prepared["muy"])),
                     "unseen_element_validation_count": sum(any(e not in prepared["seen_elements"] for e in r["counts"])
                                                            for r in validation)}
        artifacts[f"fold-{fold}-preprocessing.json"] = write_json(output/f"fold-{fold}-preprocessing.json", fold_meta)
        for model, regularization in zip(MODELS[1:], LAMBDAS):
            budget.check()
            stage_start = time.monotonic()
            try:
                fit = fit_ridge(prepared, regularization)
                raw, predicted = predict_ridge(fit, validation)
                prefix = f"fold-{fold}-{model}"
                raw_hash = immutable_bytes(output/(prefix+"-predictions.f64le"), np.asarray(raw, dtype="<f8").tobytes(order="C"))
                beta_hash = immutable_bytes(output/(prefix+"-coefficients.f64le"), np.asarray(fit["beta"], dtype="<f8").tobytes(order="C"))
                artifacts[prefix+"-predictions.f64le"] = raw_hash
                artifacts[prefix+"-coefficients.f64le"] = beta_hash
                fitted[prefix] = {"lambda": str(regularization), "raw_prediction_shape": list(raw.shape),
                                  "coefficient_shape": list(fit["beta"].shape), "order": "C_little_endian_float64",
                                  "relative_backward_residual": fit["relative_backward_residual"],
                                  "preprocessing_artifact": f"fold-{fold}-preprocessing.json"}
                predictions[model].update(predicted)
            except Blocked as error:
                if error.status != "BLOCKED_NUMERICAL":
                    raise
                failures.setdefault(model, []).append({"fold": fold, "status": error.status, "reason": str(error)})
            stages.append({"fold": fold, "stage": model, "elapsed_seconds": str(time.monotonic()-stage_start)})
            budget.check()
        write_json(output/f"checkpoint-after-fold-{fold}.json", checkpoint)
    metrics = {name: model_metrics(values, labels, assignments) for name, values in predictions.items()
               if name not in failures and set(values) == set(labels)}
    hashes = {}
    for name, values in predictions.items():
        hashes[name] = write_json(output/(name+"-oof.json"), {"status": "complete" if set(values) == set(labels) else "incomplete",
                                 "protocol_id": PROTOCOL_ID, "predictions": dict(sorted(values.items()))})
    return {"metrics": metrics, "decision": decide(metrics, failures), "prediction_sha256": hashes,
            "raw_artifact_sha256": {k: v for k, v in artifacts.items() if k.endswith(".f64le")},
            "metadata_artifact_sha256": {k: v for k, v in artifacts.items() if k.endswith(".json")},
            "fitted_models": fitted}, stages


def verify_engineering(path, identity, expected_sha=None):
    path = Path(path).absolute()
    if path.parent != ROOT/"reports" or path.is_symlink() or not re.fullmatch(r"training-tail-engineering-[A-Za-z0-9_-]+\.json", path.name):
        raise Blocked("BLOCKED_ENGINEERING", "engineering receipt must be a named training-tail receipt in discovery/reports")
    raw = path.read_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    if expected_sha is not None and sha != expected_sha:
        raise Blocked("BLOCKED_ENGINEERING", "engineering receipt changed between orchestrator and worker")
    receipt = original.parse_json_bytes(raw)
    if receipt.get("schema") != "lupine.discovery.training_tail.engineering.v1" or receipt.get("status") != "PASS":
        raise Blocked("BLOCKED_ENGINEERING", "missing passed training-tail engineering receipt")
    if receipt.get("protocol_commit") != PROTOCOL_COMMIT or receipt.get("protocol_sha256") != PROTOCOL_SHA256:
        raise Blocked("BLOCKED_ENGINEERING", "engineering protocol identity mismatch")
    tests = receipt.get("test_files")
    required_tests = {"tests/test_training_tail.py", "tests/test_training_tail_review.py"}
    if not isinstance(tests, list) or set(tests) != required_tests:
        raise Blocked("BLOCKED_ENGINEERING", "both focused and independent review test files are required")
    expected = {**identity["implementation_sha256"], **{name: original.sha256_file(ROOT/name) for name in tests}}
    if receipt.get("source_sha256_before") != expected or receipt.get("source_sha256_after") != expected:
        raise Blocked("BLOCKED_ENGINEERING", "test/source hashes do not bind the current implementation")
    outcome = receipt.get("tests", {})
    if (type(outcome.get("passed")) is not int or outcome["passed"] <= 0 or outcome.get("exit_code") != 0
            or any(outcome.get(key) != 0 for key in ("failed", "errors", "skipped"))):
        raise Blocked("BLOCKED_ENGINEERING", "engineering tests incomplete, failed, or skipped")
    command = outcome.get("command", [])
    if command[1:] != ["-m", "unittest", "discover", "-s", "tests", "-p", "test_training_tail*.py", "-v"]:
        raise Blocked("BLOCKED_ENGINEERING", "engineering command must run the complete focused/review test pattern")
    log = Path(outcome.get("log_path", ""))
    if not log.is_absolute():
        log = ROOT/log
    if (log.parent != ROOT/"reports" or log.is_symlink()
            or not re.fullmatch(r"training-tail-engineering-[A-Za-z0-9_-]+\.txt", log.name)):
        raise Blocked("BLOCKED_ENGINEERING", "unexpected engineering test log path")
    log_raw = log.read_bytes()
    if hashlib.sha256(log_raw).hexdigest() != outcome.get("log_sha256"):
        raise Blocked("BLOCKED_ENGINEERING", "engineering test log digest mismatch")
    text = log_raw.decode("utf-8")
    summary = re.search(r"(?:^|\n)Ran ([0-9]+) tests? in [0-9.]+s\n\nOK\n?\Z", text)
    if summary is None or summary.group(1) != str(outcome["passed"]):
        raise Blocked("BLOCKED_ENGINEERING", "test log does not establish the declared complete passing run")
    return {"path": str(path.relative_to(ROOT)), "sha256": sha, "passed": outcome["passed"],
            "test_log_sha256": outcome["log_sha256"], "test_source_sha256": {name: expected[name] for name in tests}}


def execute_pass(input_cache, pass_dir, engineering_validation, engineering_sha=None):
    output = Path(pass_dir).resolve()
    validate_output_location(output)
    output.mkdir(parents=True, exist_ok=False)
    budget = Budget()
    checkpoint, boundary, identity = {}, None, None
    receipt = {"schema": "lupine.discovery.training_tail.pass.v1", "protocol_id": PROTOCOL_ID,
               "status": "STARTED", "calibration_targets_opened": False, "evaluation_targets_opened": False,
               "new_coverage_claim": False, "input_sha256": dict(INPUT_HASHES)}
    try:
        identity = protocol_identity()
        receipt.update(identity)
        receipt["engineering_validation"] = verify_engineering(engineering_validation, identity, engineering_sha)
        if "numpy" in sys.modules:
            raise Blocked("BLOCKED_ENVIRONMENT", "worker requires a fresh process before NumPy import")
        receipt["environment"] = environment_identity()
        budget.check()
        boundary = ReadBoundary(input_cache, output).start()
        rows, labels, manifest, manifest_sha = load_training(input_cache, output, boundary, identity)
        receipt["fold_manifest_sha256"] = manifest_sha
        budget.check()
        result, stages = compute_oof(rows, labels, manifest, output, budget, checkpoint)
        receipt.update(result)
        receipt["stages"] = stages
        budget.check()
        # Inputs/protocol/source must still bind after the computation.
        if protocol_identity() != identity:
            raise Blocked("BLOCKED_SOURCE", "source changed during training-only pass")
        for name, expected in INPUT_HASHES.items():
            read_verified(Path(input_cache)/name, expected)
        receipt["status"] = "COMPLETE"
        receipt["scientific_result_sha256"] = digest({k: receipt[k] for k in SCIENTIFIC_FIELDS})
    except (Exception, KeyboardInterrupt) as error:
        receipt["status"] = error.status if isinstance(error, Blocked) else "BLOCKED_IMPLEMENTATION"
        receipt["error_type"] = type(error).__name__
        receipt["reason"] = str(error)
        receipt["decision"] = {"status": "NO_GO_MODEL_IMPROVEMENT", "selected_model": None,
                               "reason": "complete_reproducible_execution_required"}
        receipt["checkpoint_sha256"] = write_json(output/"incomplete-checkpoint.json", checkpoint)
    finally:
        receipt["usage"] = budget.usage()
        receipt["opened_original_input_files"] = sorted(set(boundary.opened_inputs)) if boundary else []
        write_json(output/"pass-receipt.json", receipt)
        if boundary:
            boundary.stop()
    return receipt


def compare_passes(first, second):
    if any(receipt.get("status") != "COMPLETE" for receipt in (first, second)):
        return {"status": "NO_GO_MODEL_IMPROVEMENT", "execution_status": "BLOCKED_OR_INCOMPLETE",
                "selected_model": None, "reason": "two_complete_passes_required"}
    fields = ("protocol_id", "protocol_commit", "protocol_sha256", "input_sha256", "implementation_sha256",
              "environment", "engineering_validation", "fold_manifest_sha256", "metadata_artifact_sha256",
              "prediction_sha256", "metrics", "decision", "scientific_result_sha256")
    for receipt in (first, second):
        if (any(key not in receipt or receipt[key] in (None, {}, "") for key in fields)
                or not isinstance(receipt.get("raw_artifact_sha256"), dict)):
            return {"status": "NO_GO_MODEL_IMPROVEMENT", "execution_status": "BLOCKED_REPRODUCIBILITY",
                    "selected_model": None, "reason": "complete_receipt_missing_required_fields"}
        if receipt["scientific_result_sha256"] != digest({k: receipt[k] for k in SCIENTIFIC_FIELDS}):
            return {"status": "NO_GO_MODEL_IMPROVEMENT", "execution_status": "BLOCKED_REPRODUCIBILITY",
                    "selected_model": None, "reason": "scientific_receipt_digest_mismatch"}
    comparisons = {field: first.get(field) == second.get(field) for field in fields}
    raw_equal = first.get("raw_artifact_sha256") == second.get("raw_artifact_sha256")
    if not all(comparisons.values()):
        return {"status": "NO_GO_MODEL_IMPROVEMENT", "execution_status": "BLOCKED_REPRODUCIBILITY",
                "selected_model": None, "comparisons": comparisons, "raw_artifacts_identical": raw_equal}
    return {"status": first["decision"]["status"], "execution_status": "COMPLETE_REPRODUCED",
            "selected_model": first["decision"]["selected_model"], "comparisons": comparisons,
            "raw_artifacts_identical": raw_equal, "scientific_result_sha256": first["scientific_result_sha256"]}


def run_two(input_cache, output_dir, engineering_validation):
    output = Path(output_dir).resolve()
    validate_output_location(output)
    output.mkdir(parents=True, exist_ok=False)
    # Validate the frozen source before launching any fitting process.
    try:
        identity = protocol_identity()
        engineering = verify_engineering(engineering_validation, identity)
    except (Blocked, ValueError, OSError) as error:
        result = {"schema": "lupine.discovery.training_tail.reproduction.v1", "protocol_id": PROTOCOL_ID,
                  "decision": {"status": "NO_GO_MODEL_IMPROVEMENT", "execution_status":
                               error.status if isinstance(error, Blocked) else "BLOCKED_IMPLEMENTATION",
                               "selected_model": None, "reason": str(error)}}
        write_json(output/"reproduction.json", result)
        return result
    environment = os.environ.copy()
    environment.update({key: "1" for key in THREAD_VARIABLES})
    environment["PYTHONHASHSEED"] = "0"
    passes, commands, costs, receipt_hashes = [], [], [], []
    for number in (1, 2):
        pass_dir = output/f"pass-{number}"
        command = [sys.executable, str(Path(__file__).resolve()), "pass", "--input-cache", str(Path(input_cache).resolve()),
                   "--pass-dir", str(pass_dir), "--engineering-validation", str(Path(engineering_validation).absolute()),
                   "--engineering-sha256", engineering["sha256"]]
        commands.append(command)
        start = time.monotonic()
        with (output/f"pass-{number}.stdout.txt").open("xb") as stdout, (output/f"pass-{number}.stderr.txt").open("xb") as stderr:
            process = subprocess.Popen(command, env=environment, cwd=str(ROOT), stdout=stdout, stderr=stderr)
            try:
                code = process.wait(timeout=PASS_SECONDS)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
                code = -9
        costs.append({"pass": number, "returncode": code, "wall_seconds": str(time.monotonic()-start)})
        path = pass_dir/"pass-receipt.json"
        if path.exists():
            captured = path.read_bytes()
            receipt_hashes.append(hashlib.sha256(captured).hexdigest())
            receipt = original.parse_json_bytes(captured)
        else:
            receipt_hashes.append(None)
            receipt = {"status": "INCOMPLETE", "reason": "worker_terminated_without_complete_receipt",
                       "returncode": code, "preserved_partial_artifacts": True}
            write_json(output/f"pass-{number}-termination.json", receipt)
        if code != 0 and receipt.get("status") == "COMPLETE":
            receipt = {"status": "BLOCKED_IMPLEMENTATION", "reason": "complete_receipt_but_nonzero_process_exit", "returncode": code}
        passes.append(receipt)
    decision = compare_passes(*passes)
    parent_bindings = [
        all(receipt.get(key) == value for key, value in identity.items()) if receipt.get("status") == "COMPLETE"
        else (all(receipt[key] == value for key, value in identity.items() if key in receipt)
              if any(key in receipt for key in identity) else None)
        for receipt in passes]
    try:
        source_unchanged = protocol_identity() == identity
    except (Blocked, OSError):
        source_unchanged = False
    if any(binding is False for binding in parent_bindings) or not source_unchanged:
        decision = {"status": "NO_GO_MODEL_IMPROVEMENT", "execution_status": "BLOCKED_SOURCE",
                    "selected_model": None, "reason": "parent_worker_source_identity_mismatch",
                    "worker_identity_matches_parent_start": parent_bindings, "parent_source_unchanged": source_unchanged}
    result = {"schema": "lupine.discovery.training_tail.reproduction.v1", **identity,
              "engineering_validation": engineering,
              "decision": decision, "commands": commands, "process_usage": costs,
              "pass_receipt_sha256": receipt_hashes,
              "calibration_targets_opened": False, "evaluation_targets_opened": False,
              "new_coverage_claim": False, "claim": "training-only model development; original results unchanged"}
    write_json(output/"reproduction.json", result)
    return result


def validate_output_location(path):
    path = Path(path).resolve()
    if OUTPUT_BASE.resolve() not in path.parents:
        raise ValueError("prediction artifacts must stay inside discovery/.cache/training-tail/")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    run = commands.add_parser("run")
    run.add_argument("--input-cache", type=Path, default=original.DEFAULT_CACHE)
    run.add_argument("--output-dir", type=Path, required=True)
    run.add_argument("--engineering-validation", type=Path, required=True)
    worker = commands.add_parser("pass")
    worker.add_argument("--input-cache", type=Path, default=original.DEFAULT_CACHE)
    worker.add_argument("--pass-dir", type=Path, required=True)
    worker.add_argument("--engineering-validation", type=Path, required=True)
    worker.add_argument("--engineering-sha256")
    args = parser.parse_args()
    if args.command == "run":
        receipt = run_two(args.input_cache, args.output_dir, args.engineering_validation)
        print(json.dumps(receipt["decision"], sort_keys=True))
        return 0 if receipt["decision"]["execution_status"] == "COMPLETE_REPRODUCED" else 1
    receipt = execute_pass(args.input_cache, args.pass_dir, args.engineering_validation, args.engineering_sha256)
    print(json.dumps({"status": receipt["status"], "decision": receipt["decision"]["status"]}, sort_keys=True))
    return 0 if receipt["status"] == "COMPLETE" else 1


if __name__ == "__main__":
    raise SystemExit(main())
