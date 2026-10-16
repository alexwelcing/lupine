#!/usr/bin/env python3
"""Verify three completed public development receipts and project their UI data.

This historical projection accepts exactly the three published receipt bytes.
It has no fitting or original-label input path. Receipt integrity and aggregate
consistency do not independently validate unseen target accuracy.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
PROTOCOL_ID = "jarvis-training-tail-v1"
PROTOCOL_COMMIT = "188752f733e4768a995165fe9770696d5bbf09e1"
PROTOCOL_SHA256 = "56b1810a2bae15261f64eef62abb7d74886d80b3116c7233700b0c52da88c9bf"
PUBLISHED_RECEIPT_SHA256 = (
    "649b54cdc6ba5de1bbac4b27f788da3e1b0a8febf9266463050b5d2f084c6348",
    "5c121c0e3b1c954b6b69e364dce3c22cf9acaf89630905c1c35d4225510c9fbd",
    "98615bde3ef4c1ad24a1693d56c2252152a8767ea52ec9b44a0d4dcde3101c93")
PUBLISHED_SCIENTIFIC_SHA256 = "60cbe9c1d8d4a4b6fe5810765dd9cd5f31f4fe5ac21c9e83e4e802c14fcd0656"
MODELS = ("5nn", "ridge_1_1000000", "ridge_1_1000", "ridge_1_10")
LAMBDAS = (Fraction(1, 1000000), Fraction(1, 1000), Fraction(1, 10))
TARGETS = ("gap", "formation")
FOLD_COUNTS = (820, 819, 819, 819, 819)
SCIENTIFIC_FIELDS = ("protocol_id", "protocol_commit", "protocol_sha256", "input_sha256", "implementation_sha256",
                     "fold_manifest_sha256", "metadata_artifact_sha256", "metrics", "decision", "prediction_sha256")
COMPARE_FIELDS = ("protocol_id", "protocol_commit", "protocol_sha256", "input_sha256", "implementation_sha256",
                  "environment", "engineering_validation", "fold_manifest_sha256", "metadata_artifact_sha256",
                  "prediction_sha256", "metrics", "decision", "scientific_result_sha256")
IDENTITY_FIELDS = ("protocol_id", "protocol_commit", "protocol_sha256", "original_protocol_commit", "original_protocol_sha256",
                   "format_amendment_commit", "format_amendment_sha256", "implementation_sha256", "engineering_validation")
INPUT_NAMES = {"metadata.json", "train.json", "source-receipt.json", "custody-receipt.json"}
INPUT_SHA256 = {
    "metadata.json": "e4f623329be262c9057eb9a7e9d7ca96fb05c8e7877845e3da4fb450c8c90655",
    "train.json": "6ffb1e687ef888388f06b4ac4d2b951f3600e4ea00fb04f9d8a1d03c5c2a3a31",
    "source-receipt.json": "dd2fd4405009e0b897b986b7392f21f664b3928f7fc4330909bef207dd5e3def",
    "custody-receipt.json": "bed6061e33bc7961f6cff858d043b012c8e2337ae31decd6ac30acd5f82fe626"}
IMPLEMENTATION_SHA256 = {
    "scripts/training_tail.py": "abb5782f3c135d54d36ac52d37edee329f9a8c3f310d15a30305fc3383276b43",
    "scripts/constrained_benchmark.py": "0e9e53346a3d435ebdd6606117623df15121fa801e70a26d72433a3530235430",
    "src/lupine_discovery/serialization.py": "cfec006ed4cb51fbbb6539422a5d829cadaa7bf0ff78bebbffd58aaba6f2523c"}
ORIGINAL_IDENTITY = {
    "original_protocol_commit": "b5d432d1e7123ae8c33d48bbef2e04c44de7b37c",
    "original_protocol_sha256": "1a61c76865525b62ad7ea7555b87e0fb334e8e2cc9a6db9ad18bd820199adef0",
    "format_amendment_commit": "e04c5d6cca8e677cadc0cefa4208f2625d89e227",
    "format_amendment_sha256": "3c97d3f2d2f8d586c0b3c60ce742d24cd87d0c327052fa5832f18a11daeae94a"}
RAW_FIELDS = {"jid", "training_ids", "validation_ids", "composition_key", "feature_means", "target_means",
              "targets", "predictions", "coefficients", "neighbors", "records", "raw_source", "raw_archive",
              "evaluation_targets", "evaluation_table", "target_table"}
CLAIM = "development selection only; not calibration, coverage, or independent evaluation"
USAGE_FIELDS = ("budget_checks", "elapsed_seconds", "limit_peak_rss_kib_linux", "limit_seconds",
                "peak_rss_kib_linux", "system_cpu_seconds", "user_cpu_seconds")
ENGINEERING_FIELDS = ("passed", "path", "sha256", "test_log_sha256")
ENGINEERING_TESTS = ("tests/test_training_tail.py", "tests/test_training_tail_review.py")
THREAD_FIELDS = ("BLIS_NUM_THREADS", "MKL_NUM_THREADS", "NUMEXPR_NUM_THREADS", "OMP_NUM_THREADS",
                 "OPENBLAS_NUM_THREADS", "VECLIB_MAXIMUM_THREADS")


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)+"\n").encode()


def digest(value):
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def _same(first, second):
    """JSON identity must not equate true/false with the integers 1/0."""
    return canonical_bytes(first) == canonical_bytes(second)


def _select(value, fields):
    """Never carry arbitrary input keys into the display artifact."""
    return {field: deepcopy(value[field]) for field in fields}


def _pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate receipt key")
        result[key] = value
    return result


def _reject_number(_):
    raise ValueError("receipt decimal/nonfinite JSON numbers must be exact strings")


def decode(raw):
    if not isinstance(raw, bytes):
        raise TypeError("receipt inputs must be captured bytes")
    value = json.loads(raw, object_pairs_hook=_pairs, parse_float=_reject_number, parse_constant=_reject_number)
    if not isinstance(value, dict):
        raise ValueError("receipt must be an object")
    _no_raw_payload(value)
    return value


def _no_raw_payload(value):
    if isinstance(value, dict):
        if RAW_FIELDS & value.keys():
            raise ValueError("per-record data cannot enter the public dashboard")
        for item in value.values():
            _no_raw_payload(item)
    elif isinstance(value, list):
        for item in value:
            _no_raw_payload(item)
    elif isinstance(value, str) and re.search(r"JVASP-[0-9]+", value):
        raise ValueError("per-record identities cannot enter the public dashboard")


def _fraction(value):
    if not isinstance(value, str) or not re.fullmatch(r"-?[0-9]+(?:/[1-9][0-9]*)?", value):
        raise ValueError("expected canonical rational metric string")
    result = Fraction(value)
    if str(result) != value:
        raise ValueError("noncanonical rational metric")
    return result


def _sha(value):
    if not isinstance(value, str) or not re.fullmatch(r"[a-f0-9]{64}", value):
        raise ValueError("expected SHA-256 identity")
    return value


def _hash_mapping(value, expected_keys=None):
    if not isinstance(value, dict) or not value or (expected_keys is not None and set(value) != set(expected_keys)):
        raise ValueError("missing or incomplete artifact hashes")
    for item in value.values():
        _sha(item)


def _metric_row(row, count):
    required = {"count", "tail_rank", "tail", "median", "mae", "maximum", "p90", "p95", "p99"}
    if not isinstance(row, dict) or set(row) != required:
        raise ValueError("incomplete aggregate metrics")
    rank = -(-((count+1)*399)//400)
    if type(row["count"]) is not int or row["count"] != count or type(row["tail_rank"]) is not int or row["tail_rank"] != rank:
        raise ValueError("aggregate count or tail rank changed")
    numbers = {key: _fraction(row[key]) for key in required-{"count", "tail_rank"}}
    ordered = [numbers[key] for key in ("median", "p90", "p95", "p99", "tail", "maximum")]
    if ordered != sorted(ordered) or min(numbers.values()) < 0 or numbers["mae"] > numbers["maximum"]:
        raise ValueError("inconsistent aggregate residual ordering")


def verify_metrics(metrics):
    if not isinstance(metrics, dict) or set(metrics) != set(MODELS):
        raise ValueError("all four completed model metrics are required")
    for model in MODELS:
        if set(metrics[model]) != set(TARGETS):
            raise ValueError("both target properties are required")
        for target in TARGETS:
            value = metrics[model][target]
            if set(value) != {"pooled", "folds", "fold_tail_range"} or len(value["folds"]) != 5:
                raise ValueError("all five held-out folds are required")
            _metric_row(value["pooled"], 4096)
            for row, count in zip(value["folds"], FOLD_COUNTS):
                _metric_row(row, count)
            tails = [_fraction(row["tail"]) for row in value["folds"]]
            expected_range = {"min": str(min(tails)), "max": str(max(tails)), "range": str(max(tails)-min(tails))}
            if value["fold_tail_range"] != expected_range:
                raise ValueError("fold tail range disagrees with fold metrics")
            if (_fraction(value["pooled"]["mae"]) != sum((_fraction(row["mae"])*count for row, count in
                    zip(value["folds"], FOLD_COUNTS)), Fraction(0))/4096
                    or _fraction(value["pooled"]["maximum"]) != max(_fraction(row["maximum"]) for row in value["folds"])):
                raise ValueError("pooled MAE or maximum disagrees with the folds")


def _gate_target(candidate, baseline, inflation):
    pooled, base = candidate["pooled"], baseline["pooled"]
    positive = _fraction(base["tail"]) > 0
    margins = {
        "pooled_tail_10pct": Fraction(9, 10)*_fraction(base["tail"])-_fraction(pooled["tail"])-inflation,
        "pooled_mae_nonincrease": _fraction(base["mae"])-_fraction(pooled["mae"])-inflation,
        "pooled_max_10pct_allowance": Fraction(11, 10)*_fraction(base["maximum"])-_fraction(pooled["maximum"])-inflation}
    folds = [{"strict_tail_improvement": _fraction(ref["tail"])-_fraction(row["tail"])-inflation,
              "tail_10pct_allowance": Fraction(11, 10)*_fraction(ref["tail"])-_fraction(row["tail"])-inflation,
              "max_10pct_allowance": Fraction(11, 10)*_fraction(ref["maximum"])-_fraction(row["maximum"])-inflation}
             for row, ref in zip(candidate["folds"], baseline["folds"])]
    improved = sum(row["strict_tail_improvement"] > 0 for row in folds)
    passed = positive and all(value >= 0 for value in margins.values()) and improved >= 4 and all(
        row["tail_10pct_allowance"] >= 0 and row["max_10pct_allowance"] >= 0 for row in folds)
    return {"passed": passed, "positive_baseline_tail": positive, "strictly_improving_folds": improved,
            "metric_inflation": str(inflation), "pooled_margins": {k: str(v) for k, v in margins.items()},
            "fold_margins": [{k: str(v) for k, v in row.items()} for row in folds],
            "pooled_tail_ratio": str(_fraction(pooled["tail"])/_fraction(base["tail"])) if positive else None,
            "ratio_unavailable_reason": None if positive else "zero_pooled_baseline_tail"}


def expected_decision(metrics):
    alternatives, eligible = {}, []
    for name, regularization in zip(MODELS[1:], LAMBDAS):
        ordinary = {target: _gate_target(metrics[name][target], metrics["5nn"][target], Fraction(0)) for target in TARGETS}
        guarded = {target: _gate_target(metrics[name][target], metrics["5nn"][target], Fraction(1, 1000000)) for target in TARGETS}
        provisional = all(value["passed"] for value in ordinary.values())
        robust = all(value["passed"] for value in guarded.values())
        alternatives[name] = {"status": "ELIGIBLE" if robust else ("NUMERICAL_BORDERLINE" if provisional else "INELIGIBLE"),
                              "lambda": str(regularization), "ordinary": ordinary, "numeric_guard": guarded}
        if robust:
            ratios = [_fraction(ordinary[target]["pooled_tail_ratio"]) for target in TARGETS]
            eligible.append(((max(ratios), sum(ratios, Fraction(0)), -regularization), name))
    selected = min(eligible)[1] if eligible else None
    return {"status": "GO_DESIGN_FRESH_PROTOCOL" if selected else "NO_GO_MODEL_IMPROVEMENT", "selected_model": selected,
            "alternatives": alternatives, "failures": {}, "claim": CLAIM}


def verify_pass(receipt):
    if receipt.get("schema") != "lupine.discovery.training_tail.pass.v1" or receipt.get("status") != "COMPLETE":
        raise ValueError("a complete public training-only pass receipt is required")
    if (receipt.get("protocol_id"), receipt.get("protocol_commit"), receipt.get("protocol_sha256")) != (
            PROTOCOL_ID, PROTOCOL_COMMIT, PROTOCOL_SHA256):
        raise ValueError("frozen training protocol identity mismatch")
    for field in COMPARE_FIELDS+IDENTITY_FIELDS:
        if field not in receipt or receipt[field] in (None, {}, ""):
            raise ValueError("complete pass is missing required identity or scientific fields")
    for field in ("calibration_targets_opened", "evaluation_targets_opened", "new_coverage_claim"):
        if receipt.get(field) is not False:
            raise ValueError("training-only scope boundary changed")
    if receipt.get("opened_original_input_files") != sorted(INPUT_NAMES):
        raise ValueError("unexpected original input access")
    _hash_mapping(receipt["input_sha256"], INPUT_NAMES)
    _hash_mapping(receipt["implementation_sha256"], {"scripts/training_tail.py", "scripts/constrained_benchmark.py",
                                                    "src/lupine_discovery/serialization.py"})
    _hash_mapping(receipt["prediction_sha256"], MODELS)
    _hash_mapping(receipt["metadata_artifact_sha256"],
                  {f"fold-{fold}-{kind}.json" for fold in range(5) for kind in ("neighbors", "preprocessing")})
    _hash_mapping(receipt.get("raw_artifact_sha256"),
                  {f"fold-{fold}-{model}-{kind}.f64le" for fold in range(5) for model in MODELS[1:]
                   for kind in ("predictions", "coefficients")})
    _hash_mapping(receipt["environment"].get("loaded_blas_sha256"))
    _hash_mapping(receipt["engineering_validation"].get("test_source_sha256"), ENGINEERING_TESTS)
    _sha(receipt["fold_manifest_sha256"])
    if (receipt["input_sha256"] != INPUT_SHA256 or receipt["implementation_sha256"] != IMPLEMENTATION_SHA256
            or any(receipt[field] != value for field, value in ORIGINAL_IDENTITY.items())):
        raise ValueError("frozen source/input identities changed")
    if receipt["scientific_result_sha256"] != digest({k: receipt[k] for k in SCIENTIFIC_FIELDS}):
        raise ValueError("scientific result digest mismatch")
    verify_metrics(receipt["metrics"])
    if canonical_bytes(receipt["decision"]) != canonical_bytes(expected_decision(receipt["metrics"])):
        raise ValueError("recorded gates or selection disagree with exact aggregate metrics")
    fitted = receipt.get("fitted_models", {})
    expected_fits = {f"fold-{fold}-{model}" for fold in range(5) for model in MODELS[1:]}
    if set(fitted) != expected_fits:
        raise ValueError("all fifteen completed ridge fits are required")
    for fold, count in enumerate(FOLD_COUNTS):
        for model, regularization in zip(MODELS[1:], LAMBDAS):
            fit = fitted[f"fold-{fold}-{model}"]
            if (fit.get("lambda") != str(regularization) or fit.get("coefficient_shape") != [118, 2]
                    or fit.get("raw_prediction_shape") != [count, 2] or fit.get("order") != "C_little_endian_float64"
                    or fit.get("preprocessing_artifact") != f"fold-{fold}-preprocessing.json"
                    or not 0 <= _fraction(fit["relative_backward_residual"]) <= Fraction.from_float(1e-10)):
                raise ValueError("fit numerical/shape evidence mismatch")
    usage = receipt.get("usage", {})
    if (usage.get("limit_seconds") != 900 or usage.get("limit_peak_rss_kib_linux") != 2097152
            or type(usage.get("peak_rss_kib_linux")) is not int or not 0 <= usage["peak_rss_kib_linux"] <= 2097152
            or type(usage.get("budget_checks")) is not int or usage["budget_checks"] < 4096):
        raise ValueError("resource limit evidence mismatch")
    for field in ("elapsed_seconds", "user_cpu_seconds", "system_cpu_seconds"):
        if not isinstance(usage.get(field), str) or Fraction(usage[field]) < 0:
            raise ValueError("missing or invalid resource cost")
    if Fraction(usage["elapsed_seconds"]) > 900:
        raise ValueError("completed process exceeds the frozen wall-time limit")
    stages = receipt.get("stages")
    expected_stages = [(fold, stage) for fold in range(5) for stage in ("5nn", "exact_centering", *MODELS[1:])]
    if not isinstance(stages, list) or len(stages) != len(expected_stages):
        raise ValueError("complete per-stage resource costs are required")
    for row, expected in zip(stages, expected_stages):
        if (set(row) != {"fold", "stage", "elapsed_seconds"} or type(row["fold"]) is not int
                or (row["fold"], row["stage"]) != expected or not isinstance(row["elapsed_seconds"], str)
                or Fraction(row["elapsed_seconds"]) < 0):
            raise ValueError("resource stage identity or cost mismatch")
    if sum((Fraction(row["elapsed_seconds"]) for row in stages), Fraction(0)) > Fraction(usage["elapsed_seconds"]):
        raise ValueError("nonoverlapping stage costs exceed complete process time")
    return receipt


def verify_receipts(first_raw, second_raw, reproduction_raw):
    passes = [verify_pass(decode(first_raw)), verify_pass(decode(second_raw))]
    reproduction = decode(reproduction_raw)
    if reproduction.get("schema") != "lupine.discovery.training_tail.reproduction.v1":
        raise ValueError("a public reproduction receipt is required")
    hashes = [hashlib.sha256(raw).hexdigest() for raw in (first_raw, second_raw)]
    if reproduction.get("pass_receipt_sha256") != hashes:
        raise ValueError("public pass bytes do not match the reproduction seals")
    for field in IDENTITY_FIELDS:
        if any(not _same(receipt[field], reproduction.get(field)) for receipt in passes):
            raise ValueError("parent/worker scientific identity mismatch")
    for field in ("calibration_targets_opened", "evaluation_targets_opened", "new_coverage_claim"):
        if reproduction.get(field) is not False:
            raise ValueError("reproduction boundary changed")
    comparisons = {field: _same(passes[0][field], passes[1][field]) for field in COMPARE_FIELDS}
    expected = {"status": passes[0]["decision"]["status"], "execution_status": "COMPLETE_REPRODUCED",
                "selected_model": passes[0]["decision"]["selected_model"], "comparisons": comparisons,
                "raw_artifacts_identical": _same(passes[0]["raw_artifact_sha256"], passes[1]["raw_artifact_sha256"]),
                "scientific_result_sha256": passes[0]["scientific_result_sha256"]}
    if not all(comparisons.values()) or canonical_bytes(reproduction.get("decision")) != canonical_bytes(expected):
        raise ValueError("reproduction claim disagrees with captured completed passes")
    usage = reproduction.get("process_usage")
    if not isinstance(usage, list) or len(usage) != 2:
        raise ValueError("both process resource rows are required")
    for number, row in enumerate(usage, 1):
        if (type(row.get("pass")) is not int or row["pass"] != number or type(row.get("returncode")) is not int
                or row["returncode"] != 0 or not isinstance(row.get("wall_seconds"), str) or Fraction(row["wall_seconds"]) < 0):
            raise ValueError("failed process cannot be projected as complete")
    if any(receipt["scientific_result_sha256"] != PUBLISHED_SCIENTIFIC_SHA256 for receipt in passes):
        raise ValueError("published historical scientific result identity changed")
    captured_hashes = (*hashes, hashlib.sha256(reproduction_raw).hexdigest())
    if captured_hashes != PUBLISHED_RECEIPT_SHA256:
        raise ValueError("published historical receipt bytes changed")
    return passes, reproduction, hashes


def project(first_raw, second_raw, reproduction_raw):
    passes, reproduction, hashes = verify_receipts(first_raw, second_raw, reproduction_raw)
    first = passes[0]
    github = "https://github.com/alexwelcing/lupine/blob/research/lupine-discovery/discovery/"
    links = {"protocol": f"https://github.com/alexwelcing/lupine/blob/{PROTOCOL_COMMIT}/discovery/docs/training-tail-protocol-v1.md",
             "result": github+"reports/training-tail-result-v1.md", "run_instructions": github+"docs/training-tail-run.md",
             "pass_1": github+"reports/training-tail-pass-1-v1.json", "pass_2": github+"reports/training-tail-pass-2-v1.json",
             "reproduction": github+"reports/training-tail-reproduction-v1.json",
             "source_audit": github+"docs/constrained-source-audit.md"}
    value = {"schema": "lupine.discovery.training_tail.dashboard.v1",
        "title": "Training-only prediction experiment",
        "protocol": {"id": PROTOCOL_ID, "commit": PROTOCOL_COMMIT, "sha256": PROTOCOL_SHA256},
        "decision": deepcopy(first["decision"]), "reproduction": deepcopy(reproduction["decision"]),
        "scientific_result_sha256": first["scientific_result_sha256"],
        "scope": {"kind": "training_only_development", "training_count": 4096, "fold_counts": list(FOLD_COUNTS),
                  "pooled_tail_rank": 4087, "fold_tail_ranks": [819, 818, 818, 818, 818],
                  "new_coverage_claim": False, "original_model_replaced": False, "original_benchmark_changed": False,
                  "calibration_targets_opened": False, "evaluation_targets_opened": False,
                  "claim": "Development selection on original training rows only. OOF residuals are not exchangeable calibration data or an independent selected-model test. The original benchmark and model remain unchanged."},
        "properties": [{"id": "gap", "label": "Band gap", "unit": "eV"},
                       {"id": "formation", "label": "Formation energy", "unit": "eV/atom"}],
        "models": [{"id": name, "label": "Exact composition 5NN" if name == "5nn" else "Element-fraction ridge",
                    "lambda": None if name == "5nn" else str(LAMBDAS[MODELS.index(name)-1]),
                    "role": "baseline" if name == "5nn" else "ridge", "metrics": deepcopy(first["metrics"][name])}
                   for name in MODELS],
        "resources": {"passes": [{"pass": number, **_select(receipt["usage"], USAGE_FIELDS),
                      "process_wall_seconds": reproduction["process_usage"][number-1]["wall_seconds"],
                      "completed_ridge_fits": len(receipt["fitted_models"]), "stages": deepcopy(receipt["stages"])}
                      for number, receipt in enumerate(passes, 1)],
                      "python": first["environment"]["python"], "numpy": first["environment"]["numpy_version"],
                      "platform": first["environment"]["platform"],
                      "thread_environment": _select(first["environment"]["thread_environment"], THREAD_FIELDS)},
        "provenance": {"source": {"name": "NIST JARVIS archived DFT calculations", "license": "CC BY 4.0",
                        "archive_file_id": "38521619", "source_url": "https://ndownloader.figshare.com/files/38521619",
                        "new_dft_performed": False}, "input_sha256": deepcopy(first["input_sha256"]),
                       "implementation_sha256": deepcopy(first["implementation_sha256"]),
                       "original_protocol_commit": first["original_protocol_commit"],
                       "original_protocol_sha256": first["original_protocol_sha256"],
                       "format_amendment_commit": first["format_amendment_commit"],
                       "format_amendment_sha256": first["format_amendment_sha256"],
                       "engineering_validation": {**_select(first["engineering_validation"], ENGINEERING_FIELDS),
                           "test_source_sha256": _select(first["engineering_validation"]["test_source_sha256"], ENGINEERING_TESTS)},
                       "fold_manifest_sha256": first["fold_manifest_sha256"],
                       "prediction_sha256": deepcopy(first["prediction_sha256"]),
                       "numpy_package_sha256": first["environment"]["numpy_package_sha256"],
                       "loaded_blas_sha256": deepcopy(first["environment"]["loaded_blas_sha256"]),
                       "public_receipt_sha256": {"pass_1": hashes[0], "pass_2": hashes[1],
                                                 "reproduction": hashlib.sha256(reproduction_raw).hexdigest()}},
        "links": links,
        "projection": {"input_scope": "three completed public aggregate receipts only",
                       "historical_public_receipt_bytes_pinned": True,
                       "historical_scientific_result_pinned": True,
                       "all_four_models_both_targets_and_all_fold_metrics_preserved": True,
                       "all_ordinary_and_numerical_guard_gates_preserved": True,
                       "gate_arithmetic_reconstructed_from_aggregates": True,
                       "raw_residuals_recomputed": False, "raw_per_record_data_included": False,
                       "identity_limit": "Hashes and aggregate consistency bind this projection; they do not establish physical validity or new predictive coverage."}}
    _no_raw_payload(value)
    value["dashboard_content_sha256"] = digest(value)
    return value


def build_dashboard(first_path, second_path, reproduction_path, output_path, resource_path):
    paths = [Path(path) for path in (first_path, second_path, reproduction_path, output_path, resource_path)]
    if len({path.resolve() for path in paths}) != 5:
        raise ValueError("the three inputs and two outputs must be distinct")
    captured = [path.read_bytes() for path in paths[:3]]
    dashboard = project(*captured)
    payload = canonical_bytes(dashboard)
    # Validate both existing destinations before creating or changing either.
    for path in paths[3:]:
        if path.exists() and path.read_bytes() != payload:
            raise ValueError("dashboard destination contains a different artifact")
    for path in paths[3:]:
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            path.write_bytes(payload)
    return dashboard


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pass-1", type=Path, default=ROOT/"reports/training-tail-pass-1-v1.json")
    parser.add_argument("--pass-2", type=Path, default=ROOT/"reports/training-tail-pass-2-v1.json")
    parser.add_argument("--reproduction", type=Path, default=ROOT/"reports/training-tail-reproduction-v1.json")
    parser.add_argument("--output", type=Path, default=ROOT/"reports/training-tail-v1.json")
    parser.add_argument("--resource", type=Path, default=ROOT/"src/lupine_discovery/resources/training-tail-v1.json")
    args = parser.parse_args()
    result = build_dashboard(args.pass_1, args.pass_2, args.reproduction, args.output, args.resource)
    print(json.dumps({"status": result["decision"]["status"], "execution_status": result["reproduction"]["execution_status"],
                      "output": str(args.output), "resource": str(args.resource),
                      "dashboard_content_sha256": result["dashboard_content_sha256"]}, sort_keys=True))


if __name__ == "__main__":
    main()
