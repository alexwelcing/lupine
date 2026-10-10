#!/usr/bin/env python3
"""Frozen FreeSolv experimental-answer replay; see docs/additional-archived-benchmark.md."""

import argparse
from collections import Counter
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import urllib.request

from lupine_discovery.core import Candidate, Interval, select
from lupine_discovery.replay import TruthRow, evaluate
from lupine_discovery.serialization import encode

COMMIT = "6c7d19b4b565537365ffd22006aa2cd4643200c6"
URL = f"https://raw.githubusercontent.com/MobleyLab/FreeSolv/{COMMIT}/database.txt"
SOURCE_SHA256 = "2d13f095713bc39b85f85dd7b4e5483fbb12fc694bf253bb1d92a4c4d484f260"
SEED = "lupine-freesolv-v1-2026-10-10"
K = 5
ALPHA = Fraction(1, 10)


def digest(value):
    return hashlib.sha256(json.dumps(encode(value), sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def split_name(smiles):
    bucket = int.from_bytes(hashlib.sha256((SEED + smiles).encode()).digest()[:8], "big") % 100
    return "train" if bucket < 60 else "calibration" if bucket < 80 else "test"


def parse_records(text):
    records = []
    seen = set()
    for line in text.splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        fields = [field.strip() for field in line.split(";", 9)]
        if len(fields) != 10 or not fields[0] or not fields[1]:
            raise ValueError("malformed FreeSolv record")
        if fields[0] in seen:
            raise ValueError("duplicate FreeSolv ID")
        seen.add(fields[0])
        records.append({"id": fields[0], "smiles": fields[1], "experimental": fields[3],
                        "experimental_uncertainty": fields[4], "experimental_reference": fields[7],
                        "notes": fields[9]})
    if not records:
        raise ValueError("empty FreeSolv archive")
    return records


def freeze_rows(records):
    """Only IDs and structures enter the split manifest."""
    return sorted([{"id": r["id"], "smiles": r["smiles"], "split": split_name(r["smiles"])}
                   for r in records], key=lambda r: r["id"])


def features(smiles):
    counts = Counter(smiles[i:i + 2] for i in range(len(smiles) - 1))
    # One-character structures are represented by a one-character token.
    if not counts:
        counts[smiles] = 1
    total = sum(counts.values())
    return {token: count / total for token, count in counts.items()}


def squared_distance(left, right):
    return math.fsum((left.get(k, 0.0) - right.get(k, 0.0)) ** 2 for k in sorted(left.keys() | right.keys()))


def conformal_radius(errors):
    rank = math.ceil((len(errors) + 1) * (1 - ALPHA))
    if not errors or rank > len(errors):
        raise ValueError("insufficient calibration for a finite radius")
    return sorted(errors)[rank - 1]


def freeze_predictions(records):
    rows = freeze_rows(records)
    by_id = {r["id"]: r for r in records}
    train = [r for r in rows if r["split"] == "train"]
    calibration = [r for r in rows if r["split"] == "calibration"]
    test = [r for r in rows if r["split"] == "test"]
    if len(train) < K or not test:
        raise ValueError("insufficient training or test rows")
    train_features = {r["id"]: features(r["smiles"]) for r in train}
    train_targets = {r["id"]: Fraction(by_id[r["id"]]["experimental"]) for r in train}
    predictions = {}
    for row in calibration + test:
        query = features(row["smiles"])
        neighbors = sorted(train, key=lambda r: (squared_distance(query, train_features[r["id"]]), r["id"]))[:K]
        predictions[row["id"]] = sum((train_targets[r["id"]] for r in neighbors), Fraction(0)) / K
    errors = [abs(predictions[r["id"]] - Fraction(by_id[r["id"]]["experimental"])) for r in calibration]
    radius = conformal_radius(errors)
    candidates = [Candidate(r["id"], Interval(predictions[r["id"]] - radius,
                                              predictions[r["id"]] + radius), {}) for r in test]
    # Seal the selector decision before held-out answers are converted or read.
    selection = select(candidates)
    return rows, candidates, predictions, radius, selection


def fetch(cache):
    cache.mkdir(parents=True, exist_ok=True)
    path = cache / "freesolv-database.txt"
    if not path.exists():
        path.write_bytes(urllib.request.urlopen(URL, timeout=40).read())
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_SHA256:
        raise ValueError("FreeSolv archive hash mismatch")
    return parse_records(raw.decode("utf-8"))


def run_records(records):
    rows, candidates, predictions, radius, sealed_selection = freeze_predictions(records)
    manifest_hash, prediction_hash = digest(rows), digest(candidates)
    by_id = {r["id"]: r for r in records}
    test = [r for r in rows if r["split"] == "test"]
    # First held-out target conversion is strictly after the predictions freeze.
    truths = [TruthRow(r["id"], Fraction(by_id[r["id"]]["experimental"]), {}) for r in test]
    audit = evaluate(candidates, truths)
    if audit["selection"] != sealed_selection:
        raise AssertionError("replay changed the sealed selector decision")
    truth = {r.candidate_id: r.score for r in truths}
    optimum = min(truth.values())
    minimizers = {i for i, value in truth.items() if value == optimum}
    nominal = sorted(truth, key=lambda i: (predictions[i], i))
    random_order = sorted(truth, key=lambda i: hashlib.sha256((SEED + "random" + i).encode()).digest())
    def metrics(ids):
        return {"size": len(ids), "all_optima_retained": minimizers <= set(ids),
                "some_optimum_retained": bool(minimizers & set(ids)),
                "optimum_count": len(minimizers), "retained_optimum_count": len(minimizers & set(ids)),
                "best_pool_regret": str(min(truth[i] for i in ids) - optimum),
                "first_candidate_regret": str(truth[ids[0]] - optimum)}
    budget = len(sealed_selection.retained)
    pool_order = [sealed_selection.incumbent] + [i for i in sealed_selection.retained if i != sealed_selection.incumbent]
    uncertainty = [Fraction(by_id[r["id"]]["experimental_uncertainty"]) for r in test]
    if any(u < 0 for u in uncertainty):
        raise ValueError("negative experimental uncertainty")
    return {
        "task": "freesolv_experimental_hydration_free_energy",
        "archive_url": URL, "archive_sha256": SOURCE_SHA256, "archive_rows": len(rows),
        "manifest_sha256": manifest_hash, "prediction_manifest_sha256": prediction_hash,
        "split_counts": dict(Counter(r["split"] for r in rows)),
        "objective": "minimize experimental hydration free energy (kcal/mol)",
        "calibration_radius": str(radius), "empirical_test_coverage": str(audit["score_coverage"]),
        "covered_count": sum(v["score_covered"] for v in audit["per_candidate"].values()),
        "test_simultaneous_coverage": all(v["score_covered"] for v in audit["per_candidate"].values()),
        "uncovered_test_ids": [i for i, v in audit["per_candidate"].items() if not v["score_covered"]],
        "empirical_soundness": audit["empirical_soundness"],
        "incumbent": sealed_selection.incumbent, "incumbent_regret": str(audit["incumbent_regret"]),
        "conditional_regret_bound": str(sealed_selection.regret_bound),
        "observed_regret_bound_holds": audit["regret_bound_holds"],
        "interval_pool": metrics(pool_order), "nominal_same_budget": metrics(nominal[:budget]),
        "random_same_budget": metrics(random_order[:budget]), "nominal_top_one": metrics(nominal[:1]),
        "random_top_one": metrics(random_order[:1]),
        "experimental_uncertainty": {"test_min": str(min(uncertainty)), "test_max": str(max(uncertainty)),
            "test_rows_with_default_uncertainty_note": sum("default" in by_id[r["id"]]["notes"].lower() for r in test),
            "interpretation": "source-reported uncertainty, sometimes assigned defaults; not used as a physical enclosure"},
        "test_experimental_references": sorted({by_id[r["id"]]["experimental_reference"] for r in test}),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", type=Path, default=Path(".cache"))
    parser.add_argument("--output", type=Path, default=Path("reports/additional-archived-v1.json"))
    args = parser.parse_args()
    report = {"schema": "lupine.discovery.additional_archived_benchmark.v1",
        "protocol": {"seed": SEED, "k": K, "alpha": str(ALPHA), "split": "exact archived SMILES hash 60/20/20",
            "descriptor": "normalized SMILES character bigram counts; no chemical canonicalization",
            "surrogate": "Euclidean 5-nearest-neighbor mean; exact rational target averaging",
            "interval_status": "empirical calibration only; no simultaneous or physical certificate",
            "evaluation_scope": "retrospective public point-value answers; no scaffold or prospective independence claim"},
        "tasks": [run_records(fetch(args.cache))]}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(encode(report), indent=2, sort_keys=True) + "\n")
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
