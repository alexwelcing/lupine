#!/usr/bin/env python3
"""Custody and exact prediction freeze for the preregistered JARVIS experiment.

No evaluation values are opened by freeze/verify. See the frozen protocol and
the separate constrained_replay.py for the deliberately later outcome replay.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from decimal import Decimal
from enum import Enum
from fractions import Fraction
import hashlib
import heapq
import json
import math
from pathlib import Path
import platform
import re
import resource
import sys
import time
import urllib.request
import zipfile

from lupine_discovery.calibration import calibrate, plan_calibration
from lupine_discovery.core import Candidate, Interval, select
from lupine_discovery.serialization import encode


PROTOCOL_ID = "jarvis-gap-formation-v1"
PROTOCOL_COMMIT = "b5d432d1e7123ae8c33d48bbef2e04c44de7b37c"
PROTOCOL_SHA256 = "1a61c76865525b62ad7ea7555b87e0fb334e8e2cc9a6db9ad18bd820199adef0"
AUDIT_SHA256 = "69f868d124056fe88157dd73efe2b04119a6f92cc5f5465e3bd5b54a6bda540b"
FORMAT_AMENDMENT_COMMIT = "e04c5d6cca8e677cadc0cefa4208f2625d89e227"
FORMAT_AMENDMENT_SHA256 = "3c97d3f2d2f8d586c0b3c60ce742d24cd87d0c327052fa5832f18a11daeae94a"
SOURCE_URL = "https://ndownloader.figshare.com/files/38521619"
SOURCE_BYTES = 40811489
SOURCE_MD5 = "fb3e1eb80339a70ff313af1c644c1777"
ZIP_NAME = "jdft_3d-12-12-2022.json.zip"
MEMBER_NAME = "jdft_3d-12-12-2022.json"
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CACHE = ROOT / ".cache" / "constrained" / (PROTOCOL_ID + "-format-compat")
TARGET_FIELDS = {"gap": "optb88vdw_bandgap", "formation": "formation_energy_peratom"}
ELEMENTS = frozenset("""H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn
Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu
Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm
Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og""".split())
NUMERIC_STRING = re.compile(r"-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?\Z")
CAPS = {"train": 4096, "calibration": 2048, "primary": 1000, "shift": 1000}
TAGS = {"train": "train-cap", "calibration": "cal-cap",
        "primary": "primary-panel", "shift": "shift-panel"}


def H(tag, text):
    return hashlib.sha256(f"{PROTOCOL_ID}\n{tag}\n{text}".encode("utf-8")).digest()


def fraction_string(value):
    return str(value if isinstance(value, Fraction) else Fraction(value))


def canonical_bytes(value):
    return (json.dumps(encode(value), sort_keys=True, separators=(",", ":"),
                       ensure_ascii=False, allow_nan=False) + "\n").encode("utf-8")


def digest(value):
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def sha256_file(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def write_immutable(path, value):
    path = Path(path)
    raw = canonical_bytes(value)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        if path.read_bytes() != raw:
            raise ValueError(f"immutable artifact already exists with different contents: {path.name}")
    else:
        temporary = path.with_suffix(path.suffix + ".partial")
        with temporary.open("xb") as stream:
            stream.write(raw)
        temporary.rename(path)
    return hashlib.sha256(raw).hexdigest()


def _pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def _nonfinite(_):
    raise ValueError("nonfinite JSON number")


class InvalidNonfinite(Enum):
    """Source-format marker only; it has no numeric conversion or truth value."""
    NAN = "NaN"
    POSITIVE_INFINITY = "Infinity"
    NEGATIVE_INFINITY = "-Infinity"

    def __bool__(self):
        raise TypeError("invalid source number has no truth value")


INVALID_NONFINITE = InvalidNonfinite.NAN


def _source_nonfinite(token):
    if token not in ("NaN", "Infinity", "-Infinity"):
        raise ValueError("unrecognized nonfinite source token")
    return InvalidNonfinite(token)


def parse_json_bytes(raw):
    return json.loads(raw.decode("utf-8"), parse_float=Decimal,
                      object_pairs_hook=_pairs, parse_constant=_nonfinite)


def read_json(path):
    return parse_json_bytes(Path(path).read_bytes())


def read_verified_json(path, expected):
    """Hash and decode the same captured bytes, never two separate opens."""
    path = Path(path)
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != expected:
        raise ValueError(f"sealed dependency digest mismatch: {path.name}")
    return parse_json_bytes(raw)


def iter_json_records(path, chunk_size=65536, max_record_chars=16 * 1024 * 1024,
                      allow_invalid_nonfinite=False):
    """Stream a strict top-level JSON array with only one decoded row resident.

    Values become Decimal directly; nested duplicate keys fail closed. Under
    the explicitly bound format amendment, nonfinite source tokens are typed
    invalid sentinels; strict mode still rejects them. Never convert to floats.
    A bounded buffer makes full-archive materialization unnecessary.
    """
    decoder = json.JSONDecoder(parse_float=Decimal, object_pairs_hook=_pairs,
                               parse_constant=_source_nonfinite if allow_invalid_nonfinite else _nonfinite)
    with Path(path).open(encoding="utf-8") as stream:
        buffer, pos, eof = "", 0, False

        def refill():
            nonlocal buffer, pos, eof
            buffer = buffer[pos:]
            pos = 0
            chunk = stream.read(chunk_size)
            if not chunk:
                eof = True
            buffer += chunk
            if len(buffer) > max_record_chars:
                raise ValueError("archive record exceeds buffer limit")

        def skip_space():
            nonlocal pos
            while True:
                while pos < len(buffer) and buffer[pos] in " \t\r\n":
                    pos += 1
                if pos < len(buffer) or eof:
                    return
                refill()

        skip_space()
        if pos == len(buffer) or buffer[pos] != "[":
            raise ValueError("archive must be a JSON array")
        pos += 1
        first = True
        while True:
            skip_space()
            if pos == len(buffer):
                raise ValueError("truncated archive")
            if buffer[pos] == "]":
                if not first:
                    raise ValueError("trailing comma in archive")
                pos += 1
                break
            while True:
                try:
                    row, end = decoder.raw_decode(buffer, pos)
                    break
                except json.JSONDecodeError:
                    if eof:
                        raise ValueError("malformed archive record") from None
                    refill()
            if not isinstance(row, dict):
                raise ValueError("archive rows must be objects")
            pos = end
            yield row
            first = False
            skip_space()
            if pos == len(buffer):
                raise ValueError("truncated archive after record")
            if buffer[pos] == "]":
                pos += 1
                break
            if buffer[pos] != ",":
                raise ValueError("missing archive separator")
            pos += 1
        skip_space()
        if pos < len(buffer):
            raise ValueError("trailing data after archive")


def protocol_identity():
    checks = {"docs/constrained-benchmark-protocol.md": PROTOCOL_SHA256,
              "docs/constrained-source-audit.md": AUDIT_SHA256,
              "docs/constrained-format-amendment.md": FORMAT_AMENDMENT_SHA256}
    for name, expected in checks.items():
        if sha256_file(ROOT / name) != expected:
            raise ValueError(f"frozen protocol source changed: {name}")
    return {"protocol_id": PROTOCOL_ID, "protocol_commit": PROTOCOL_COMMIT,
            "protocol_sha256": PROTOCOL_SHA256, "source_audit_sha256": AUDIT_SHA256,
            "format_amendment_commit": FORMAT_AMENDMENT_COMMIT,
            "format_amendment_sha256": FORMAT_AMENDMENT_SHA256}


def acquire_source(cache, source_format):
    if source_format not in ("strict", "nonfinite-sentinels"):
        raise ValueError("source format must be explicitly selected")
    cache = Path(cache)
    cache.mkdir(parents=True, exist_ok=True)
    protocol = protocol_identity()
    archive = cache / ZIP_NAME
    if not archive.exists():
        temporary = cache / (ZIP_NAME + ".partial")
        with urllib.request.urlopen(SOURCE_URL, timeout=60) as incoming, temporary.open("xb") as out:
            for chunk in iter(lambda: incoming.read(1024 * 1024), b""):
                out.write(chunk)
        temporary.rename(archive)
    md5 = hashlib.md5(usedforsecurity=False)
    with archive.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            md5.update(chunk)
    if archive.stat().st_size != SOURCE_BYTES or md5.hexdigest() != SOURCE_MD5:
        raise ValueError("pinned archive size/MD5 mismatch")
    archive_sha = sha256_file(archive)
    # Pin the archive identity before opening its JSON member.
    zip_receipt = {**protocol, "url": SOURCE_URL, "zip_name": ZIP_NAME,
                   "zip_bytes": SOURCE_BYTES, "zip_md5": SOURCE_MD5, "zip_sha256": archive_sha}
    write_immutable(cache / "archive-receipt.json", zip_receipt)
    member = cache / MEMBER_NAME
    with zipfile.ZipFile(archive) as zipped:
        if zipped.namelist() != [MEMBER_NAME]:
            raise ValueError("unexpected archive member layout")
        if not member.exists():
            temporary = member.with_suffix(member.suffix + ".partial")
            with zipped.open(MEMBER_NAME) as incoming, temporary.open("xb") as out:
                for chunk in iter(lambda: incoming.read(1024 * 1024), b""):
                    out.write(chunk)
            temporary.rename(member)
        # A cached extracted member must agree with the pinned ZIP as well.
        member_hash = hashlib.sha256()
        with zipped.open(MEMBER_NAME) as incoming:
            for chunk in iter(lambda: incoming.read(1024 * 1024), b""):
                member_hash.update(chunk)
        if member_hash.hexdigest() != sha256_file(member):
            raise ValueError("cached member differs from verified archive")
    receipt = {"schema": "lupine.discovery.constrained.source.v1", **zip_receipt,
               "source_format": source_format,
               "member_name": MEMBER_NAME, "member_bytes": member.stat().st_size,
               "member_sha256": member_hash.hexdigest(),
               "article_doi": "10.6084/m9.figshare.6815699.v11", "author": "Kamal Choudhary",
               "license": "CC BY 4.0", "license_url": "https://creativecommons.org/licenses/by/4.0/",
               "reference": "https://doi.org/10.1038/s41524-020-00440-1",
               "source_kind": "archived_DFT_calculations_not_experiments",
               "transformations": "target-blind representatives, fixed splits, exact composition features"}
    write_immutable(cache / "source-receipt.json", receipt)
    return member, receipt


def composition(elements):
    if (not isinstance(elements, list) or not elements
            or any(not isinstance(e, str) or e not in ELEMENTS for e in elements)):
        raise ValueError("invalid_atoms_elements")
    counts = Counter(elements)
    common = math.gcd(*counts.values())
    reduced = {e: counts[e] // common for e in sorted(counts)}
    key = "|".join(f"{e}:{n}" for e, n in reduced.items())
    return key, reduced


def metadata_pass(records):
    """Access only jid/atoms.elements; guarded mappings test this boundary."""
    groups, invalid, seen = {}, [], set()
    rows = 0
    for row_index, row in enumerate(records):
        rows += 1
        jid = row.get("jid")
        if isinstance(jid, str):
            if jid in seen:
                raise ValueError("duplicate JARVIS ID")
            seen.add(jid)
        if not isinstance(jid, str) or re.fullmatch(r"JVASP-[0-9]+", jid) is None:
            invalid.append({"row_index": row_index, "reason": "invalid_jid"})
            continue
        atoms = row.get("atoms")
        try:
            key, counts = composition(atoms.get("elements") if isinstance(atoms, dict) else None)
        except ValueError as error:
            invalid.append({"row_index": row_index, "jid": jid, "reason": str(error)})
            continue
        item = {"jid": jid, "row_index": row_index}
        if key not in groups:
            groups[key] = {"composition_key": key, "counts": counts, "members": [], "representative": item}
        group = groups[key]
        group["members"].append(item)
        current = group["representative"]["jid"]
        if (H("representative", jid), jid) < (H("representative", current), current):
            group["representative"] = item
    for group in groups.values():
        group["members"].sort(key=lambda item: item["jid"])
    return {"archive_rows": rows, "groups": [groups[k] for k in sorted(groups)],
            "invalid_metadata": invalid}


def parse_target(value):
    if isinstance(value, InvalidNonfinite):
        return None, "invalid_nonfinite"
    if isinstance(value, bool):
        return None, "invalid_boolean"
    if isinstance(value, (int, Decimal)):
        if isinstance(value, Decimal) and not value.is_finite():
            return None, "invalid_nonfinite"
        return Fraction(value), None
    if isinstance(value, str) and NUMERIC_STRING.fullmatch(value):
        return Fraction(Decimal(value)), None
    if isinstance(value, float):
        raise TypeError("target floats are forbidden; parse decimals before binary conversion")
    return None, "missing_or_nonnumeric"


def extract_targets(records, metadata):
    """Custodian only: representatives are already fixed before this pass."""
    wanted = {g["representative"]["jid"] for g in metadata["groups"]}
    targets, unresolved, fields_present = {}, {}, set()
    for row in records:
        fields_present.update(set(TARGET_FIELDS.values()).intersection(row.keys()))
        jid = row.get("jid")
        if not isinstance(jid, str) or jid not in wanted:
            continue
        parsed, problems = {}, {}
        for name, field in TARGET_FIELDS.items():
            value, reason = parse_target(row.get(field))
            if reason:
                problems[name] = reason
            else:
                parsed[name] = str(value)
        if problems:
            unresolved[jid] = problems
        else:
            targets[jid] = parsed
    if fields_present != set(TARGET_FIELDS.values()):
        raise ValueError("required target schema field absent from archive")
    if set(targets) | set(unresolved) != wanted:
        raise ValueError("representative identity missing from second pass")
    return targets, unresolved


def assign_roles(metadata, targets, unresolved):
    metadata = {**metadata, "schema": "lupine.discovery.constrained.metadata.v1",
                **protocol_identity(), "unresolved_representatives": unresolved}
    by_role = defaultdict(list)
    for group in metadata["groups"]:
        jid = group["representative"]["jid"]
        if jid not in targets:
            group["assignment"] = "unresolved"
            continue
        key = group["composition_key"]
        if "O" in group["counts"]:
            role = "shift"
        else:
            bucket = int.from_bytes(H("split", key), "big") % 100
            role = "train" if bucket < 50 else "calibration" if bucket < 80 else "primary"
        group["role"] = role
        by_role[role].append(group)
    selected, panels = {}, []
    for role, cap in CAPS.items():
        ordered = sorted(by_role[role], key=lambda g: (H(TAGS[role], g["composition_key"]), g["composition_key"]))
        selected[role] = []
        count = min(len(ordered), cap)
        panel_count = count // 20 if role in ("primary", "shift") else None
        for index, group in enumerate(ordered):
            if index >= cap:
                group["assignment"] = "cap_excluded"
            elif panel_count is not None and index >= panel_count * 20:
                group["assignment"] = "short_panel_excluded"
            else:
                group["assignment"] = "selected"
                selected[role].append({"jid": group["representative"]["jid"],
                                       "composition_key": group["composition_key"], "counts": group["counts"]})
        if panel_count is not None:
            for index in range(panel_count):
                candidates = selected[role][20 * index:20 * (index + 1)]
                panel_id = f"{role}-{index:03d}"
                panels.append({"id": panel_id, "role": role,
                               "candidate_ids": [row["jid"] for row in candidates]})
    metadata["selected"] = selected
    metadata["panels"] = panels
    metadata["counts"] = {"archive_rows": metadata["archive_rows"],
                          "invalid_metadata": len(metadata["invalid_metadata"]),
                          "composition_groups": len(metadata["groups"]),
                          "complete_representatives": len(targets), "unresolved_representatives": len(unresolved),
                          "role_population": {r: len(by_role[r]) for r in CAPS},
                          "selected": {r: len(selected[r]) for r in CAPS},
                          "panels": dict(Counter(p["role"] for p in panels)),
                          "assignments": dict(Counter(g["assignment"] for g in metadata["groups"]))}
    return metadata


def custodian(member, cache, source_receipt):
    cache = Path(cache)
    protocol_identity()
    source_format = source_receipt.get("source_format")
    if source_format not in ("strict", "nonfinite-sentinels"):
        raise ValueError("custody requires an explicit source-format receipt")
    compatible = source_format == "nonfinite-sentinels"
    metadata = metadata_pass(iter_json_records(member, allow_invalid_nonfinite=compatible))
    # This receipt records the representatives before any target access.
    write_immutable(cache / "representatives.json", metadata)
    targets, unresolved = extract_targets(iter_json_records(member, allow_invalid_nonfinite=compatible), metadata)
    metadata = assign_roles(metadata, targets, unresolved)
    metadata_sha = write_immutable(cache / "metadata.json", metadata)
    target_files = {}
    for role in ("train", "calibration"):
        value = {"schema": "lupine.discovery.constrained.labels.v1", "protocol_id": PROTOCOL_ID,
                 "role": role, "targets": {r["jid"]: targets[r["jid"]] for r in metadata["selected"][role]}}
        target_files[role] = write_immutable(cache / f"{role}.json", value)
    evaluation = {"schema": "lupine.discovery.constrained.targets.v1", "protocol_id": PROTOCOL_ID,
                  "panels": {p["id"]: {jid: targets[jid] for jid in p["candidate_ids"]}
                             for p in metadata["panels"]}}
    evaluation_sha = write_immutable(cache / "evaluation-targets.json", evaluation)
    receipt = {"schema": "lupine.discovery.constrained.custody.v1", **protocol_identity(),
               "source_format": source_format,
               "source_receipt_sha256": digest(source_receipt), "metadata_sha256": metadata_sha,
               "representatives_sha256": sha256_file(cache / "representatives.json"),
               "train_sha256": target_files["train"], "calibration_sha256": target_files["calibration"],
               "target_seal": {"path": "evaluation-targets.json", "sha256": evaluation_sha},
               "summary": metadata["counts"],
               "boundary": "custodian has parsed public archive; predictor receives no evaluation labels"}
    write_immutable(cache / "custody-receipt.json", receipt)
    return receipt


def exact_distance(left, right):
    nl, nr = sum(left.values()), sum(right.values())
    numerator = sum(abs(left.get(e, 0) * nr - right.get(e, 0) * nl) for e in left.keys() | right.keys())
    return Fraction(numerator, nl * nr)


class ExactNeighbors:
    """Exact L1 rank with safe pruning of disjoint compositions.

    Atomic-fraction L1 distance equals 2-2*sum(min(a_e,b_e)). Any shared
    positive fraction gives distance<2; all disjoint rows tie at exactly2.
    Search every overlapping row and fill any remaining positions with the
    lexicographically first disjoint JIDs. This is exactly the full ranking.
    """
    def __init__(self, rows):
        self.rows = {row["jid"]: row["counts"] for row in rows}
        if len(self.rows) != len(rows) or len(rows) < 5:
            raise ValueError("training requires at least five unique JIDs")
        self.sorted_ids = sorted(self.rows)
        self.index = defaultdict(set)
        for jid, counts in self.rows.items():
            for element in counts:
                self.index[element].add(jid)

    def neighbors(self, query, k=5):
        overlap = set().union(*(self.index.get(e, set()) for e in query))
        closest = heapq.nsmallest(k, ((exact_distance(query, self.rows[jid]), jid) for jid in overlap))
        if len(closest) < k:
            for jid in self.sorted_ids:
                if jid not in overlap:
                    closest.append((Fraction(2), jid))
                    if len(closest) == k:
                        break
        return [jid for _, jid in closest]


class PredictionBudgetExceeded(TimeoutError):
    def __init__(self, completed, unexecuted_ids):
        super().__init__("frozen protocol computation budget exceeded")
        self.completed = completed
        self.unexecuted_ids = unexecuted_ids


def predict(rows, training, training_targets, progress=None, deadline=None):
    model = ExactNeighbors(training)
    labels = {jid: {key: Fraction(value) for key, value in pair.items()}
              for jid, pair in training_targets.items()}
    if set(labels) != set(model.rows):
        raise ValueError("training target identity mismatch")
    predictions = {}
    for index, row in enumerate(rows):
        if deadline is not None and time.monotonic() > deadline:
            raise PredictionBudgetExceeded(predictions, [r["jid"] for r in rows[index:]])
        neighbors = model.neighbors(row["counts"])
        predictions[row["jid"]] = {
            "neighbors": neighbors,
            "predicted_gap": str(sum((labels[i]["gap"] for i in neighbors), Fraction(0)) / 5),
            "predicted_formation": str(sum((labels[i]["formation"] for i in neighbors), Fraction(0)) / 5),
            "nearest_gap": str(labels[neighbors[0]]["gap"]),
            "nearest_formation": str(labels[neighbors[0]]["formation"]),
        }
        if progress and (index + 1) % 100 == 0:
            progress(index + 1, len(rows))
    return predictions


def nominal_order(candidates, nearest=False):
    gap_key = "nearest_gap" if nearest else "predicted_gap"
    formation_key = "nearest_formation" if nearest else "predicted_formation"
    def key(row):
        g, s = Fraction(row[formation_key]), -Fraction(row[gap_key])
        return g > 0, max(g, 0), s, row["jid"]
    return [r["jid"] for r in sorted(candidates, key=key)]


def _verify_file(cache, filename, expected):
    if sha256_file(Path(cache) / filename) != expected:
        raise ValueError(f"sealed dependency digest mismatch: {filename}")


def load_fit_inputs(cache):
    """Crucially, this function does not read even bytes of the evaluation seal."""
    cache = Path(cache)
    protocol_identity()
    receipt = read_json(cache / "custody-receipt.json")
    values = {}
    for name, field in [("source-receipt.json", "source_receipt_sha256"),
                        ("metadata.json", "metadata_sha256"), ("representatives.json", "representatives_sha256"),
                        ("train.json", "train_sha256"), ("calibration.json", "calibration_sha256")]:
        values[name] = read_verified_json(cache / name, receipt[field])
    for key, value in protocol_identity().items():
        if receipt.get(key) != value:
            raise ValueError("custody receipt protocol identity mismatch")
    return receipt, values["metadata.json"], values["train.json"], values["calibration.json"]


def implementation_identity():
    names = ["scripts/constrained_benchmark.py", "src/lupine_discovery/calibration.py",
             "src/lupine_discovery/core.py", "src/lupine_discovery/serialization.py"]
    return {name: sha256_file(ROOT / name) for name in names}


def freeze(cache, progress=None):
    cache = Path(cache)
    if (cache / "freeze.json").exists():
        return verify_freeze(cache / "freeze.json")
    started = time.monotonic()
    receipt, metadata, training, calibration_labels = load_fit_inputs(cache)
    selected = metadata["selected"]
    if len(selected["train"]) < 5:
        blocked = {"status": "blocked_insufficient_training", "training_count": len(selected["train"]),
                   **protocol_identity()}
        write_immutable(cache / "blocked.json", blocked)
        raise ValueError("model blocked: fewer than five training representatives")
    rows = selected["calibration"] + selected["primary"] + selected["shift"]
    try:
        predictions = predict(rows, selected["train"], training["targets"], progress, started + 3600)
    except PredictionBudgetExceeded as error:
        write_immutable(cache / "predictions-incomplete.json", {
            **protocol_identity(), "status": "incomplete_not_a_freeze", "predictions": error.completed,
            "unexecuted_prediction_ids": error.unexecuted_ids,
            "unexecuted_panel_ids": [p["id"] for p in metadata["panels"]],
            "reason": "computation_budget_exceeded_no_complete_calibration_and_freeze_receipt"})
        raise
    prediction_sha = write_immutable(cache / "predictions.json", predictions)
    model_sha = digest({"training": selected["train"], "labels": training["targets"],
                        "algorithm": "exact_L1_atomic_fraction_5NN_mean_1NN_baseline"})
    plan = plan_calibration(len(selected["calibration"]), 20, Fraction(1, 10), target_count=2)
    radii = {}
    cal_targets = calibration_labels["targets"]
    if set(cal_targets) != {r["jid"] for r in selected["calibration"]}:
        raise ValueError("calibration target identity mismatch")
    for target in ("gap", "formation"):
        residuals = [abs(Fraction(cal_targets[r["jid"]][target])
                         - Fraction(predictions[r["jid"]]["predicted_" + target]))
                     for r in selected["calibration"]]
        radii[target] = calibrate(residuals, plan).radius
    panels = []
    for panel in metadata["panels"]:
        finite = all(value is not None for value in radii.values())
        status = ("abstain_unsupported_scope" if panel["role"] == "shift" else
                  "conditional_finite" if finite else "abstain_unbounded")
        candidates = []
        for jid in panel["candidate_ids"]:
            pred = predictions[jid]
            score_interval = constraint_interval = None
            if finite:
                s, g = -Fraction(pred["predicted_gap"]), Fraction(pred["predicted_formation"])
                score_interval = [str(s - radii["gap"]), str(s + radii["gap"])]
                constraint_interval = [str(g - radii["formation"]), str(g + radii["formation"])]
            candidates.append({"jid": jid, **pred, "score_interval": score_interval,
                               "constraint_interval": constraint_interval})
        result = {"id": panel["id"], "role": panel["role"], "candidates": candidates,
                  "operational_status": status,
                  "premise_status": "unsupported" if panel["role"] == "shift" else "assumed_unverified",
                  "nominal_order": nominal_order(candidates), "nearest_order": nominal_order(candidates, True),
                  "random_orders": {str(seed): sorted(panel["candidate_ids"],
                     key=lambda jid: (H(f"random-{seed}", panel["id"] + "\n" + jid), jid))
                                    for seed in range(100)}}
        if finite:
            values = [Candidate(c["jid"], Interval(*map(Fraction, c["score_interval"])),
                      {"formation": Interval(*map(Fraction, c["constraint_interval"]))}) for c in candidates]
            result["conditional_selection" if status == "conditional_finite" else "unsupported_transfer_diagnostic"] = encode(select(values))
        result["operational_retained"] = (list(select(values).retained) if status == "conditional_finite"
                                          else sorted(panel["candidate_ids"]))
        panels.append(result)
    outcome = {"schema": "lupine.discovery.constrained.freeze.v1", **protocol_identity(),
               "source_format": receipt["source_format"],
               "custody_receipt_sha256": sha256_file(cache / "custody-receipt.json"),
               "source_receipt_sha256": receipt["source_receipt_sha256"],
               "metadata_sha256": receipt["metadata_sha256"], "train_sha256": receipt["train_sha256"],
               "calibration_sha256": receipt["calibration_sha256"], "target_seal": receipt["target_seal"],
               "prediction_sha256": prediction_sha, "model_digest": model_sha,
               "implementation": implementation_identity(), "summary": metadata["counts"],
               "runtime": {"python": platform.python_version(), "implementation": platform.python_implementation()},
               "calibration": {"count": plan.calibration_count, "rank": plan.rank,
                   "delta": str(plan.delta), "epsilon": str(plan.epsilon), "candidate_count": 20,
                   "target_count": 2, "gap_radius": None if radii["gap"] is None else str(radii["gap"]),
                   "formation_radius": None if radii["formation"] is None else str(radii["formation"]),
                   "outcome_kind": plan.outcome_kind, "premise_status": plan.premise_status,
                   "guarantee_status": plan.guarantee_status, "premises": list(plan.premises)},
               "panels": panels,
               "scope": "fixed archive panels; conditional arithmetic; no physical or independent-blinding claim"}
    outcome["receipt_sha256"] = digest(outcome)
    write_immutable(cache / "freeze.json", outcome)
    write_immutable(cache / "freeze-execution.json", {
        "elapsed_seconds": str(round(time.monotonic() - started, 6)),
        "peak_rss_kib_linux": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        "freeze_sha256": sha256_file(cache / "freeze.json"),
        "evaluation_target_file_opened_by_freeze": False})
    return outcome


def verify_freeze(path):
    """Verify all frozen inputs except unopened evaluation target bytes."""
    path = Path(path)
    payload = read_json(path)
    checksum = payload.get("receipt_sha256")
    if checksum != digest({k: v for k, v in payload.items() if k != "receipt_sha256"}):
        raise ValueError("freeze receipt digest mismatch")
    if payload.get("schema") != "lupine.discovery.constrained.freeze.v1":
        raise ValueError("unsupported freeze schema")
    for key, value in protocol_identity().items():
        if payload.get(key) != value:
            raise ValueError("freeze protocol identity mismatch")
    if payload.get("implementation") != implementation_identity():
        raise ValueError("freeze implementation changed; preserve old run and record mechanical corrections")
    cache = path.parent
    receipt, _, _, _ = load_fit_inputs(cache)
    for name, field in [("custody-receipt.json", "custody_receipt_sha256"),
                        ("source-receipt.json", "source_receipt_sha256"), ("metadata.json", "metadata_sha256"),
                        ("train.json", "train_sha256"), ("calibration.json", "calibration_sha256"),
                        ("predictions.json", "prediction_sha256")]:
        _verify_file(cache, name, payload[field])
    if payload.get("target_seal") != receipt["target_seal"]:
        raise ValueError("evaluation target seal changed after custody")
    if payload["target_seal"]["path"] != "evaluation-targets.json":
        raise ValueError("unexpected evaluation target path")
    return payload


def open_sealed_targets(freeze_path, verified_freeze):
    """Replay-only opening; reverify first, then check bytes before decoding."""
    current = verify_freeze(freeze_path)
    if current != verified_freeze:
        raise ValueError("provided freeze differs from verified receipt")
    path = Path(freeze_path).parent / current["target_seal"]["path"]
    value = read_verified_json(path, current["target_seal"]["sha256"])
    if value.get("schema") != "lupine.discovery.constrained.targets.v1" or value.get("protocol_id") != PROTOCOL_ID:
        raise ValueError("evaluation target schema/protocol mismatch")
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["acquire", "freeze", "verify"])
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--source-format", choices=["strict", "nonfinite-sentinels"],
                        help="Required explicit format selection for acquire; generated artifacts remain strict JSON")
    args = parser.parse_args()
    if args.command == "acquire":
        if args.source_format is None:
            parser.error("acquire requires an explicit --source-format")
        member, receipt = acquire_source(args.cache, args.source_format)
        result = custodian(member, args.cache, receipt)
        print(json.dumps({"stage": "custody_complete", "summary": result["summary"],
                          "source_sha256": receipt["zip_sha256"], "member_sha256": receipt["member_sha256"],
                          "custody_receipt_sha256": digest(result)}))
    elif args.command == "freeze":
        def progress(done, total):
            print(json.dumps({"stage": "predict", "completed": done, "total": total}), flush=True)
        result = freeze(args.cache, progress)
        print(json.dumps({"stage": "freeze_complete", "receipt_sha256": result["receipt_sha256"],
                          "panel_count": len(result["panels"]), "calibration": result["calibration"]}))
    else:
        result = verify_freeze(args.cache / "freeze.json")
        print(json.dumps({"stage": "verified_without_opening_evaluation_targets",
                          "receipt_sha256": result["receipt_sha256"]}))


if __name__ == "__main__":
    main()
