"""Independent synthetic custody checks; never acquire or read archive targets.

Fixtures are constructed here, without importing the author's test helpers.
Only whole-artifact seals are exempt from the value noninterference comparison.
"""
from contextlib import redirect_stderr, redirect_stdout
from copy import deepcopy
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import projection_custody as custody


MATERIALS = ("Ag", "Al", "Au", "Ca", "Cu", "Ni", "Pd", "Pt", "Sr")
MODELS = ("chgnet", "mace-mp-small", "mace-mp-medium", "mace-mpa-0-medium")
QUANTITIES = (
    ("gamma_100", "surface_energy_100", "J/m^2"),
    ("gamma_111", "surface_energy_111", "J/m^2"),
    ("vacancy_formation_energy", "vacancy_formation_energy", "eV"),
    ("gamma_110", "surface_energy_110", "J/m^2"),
)
REFERENCES = (
    "data/y_matrix_targets/surface_energies.json",
    "data/y_matrix_targets/vacancy_formation.json",
)
SENTINEL_A = "PRIVATE_POINT_AND_NOTE_A_9876543210987654321"
SENTINEL_B = "PRIVATE_POINT_AND_NOTE_B_1234567890123456789"


def encode(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode()


def seal(path, raw):
    # Independent Git-blob calculation, not the production helper.
    identity = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
    return custody.ArtifactSpec(path, identity, len(raw))


def paths(material, model):
    stem = f"{material}_fcc_{model}"
    return (
        f"data/y_matrix_runs/{stem}.json",
        f"data/y_matrix_runs/{stem}.evidence.json",
        f"data/y_matrix_runs/bound/{stem}.evidence.json",
    )


def fixture(secret=SENTINEL_A):
    documents = {}
    opaque_metadata_hash = hashlib.sha256(secret.encode()).hexdigest()
    for material in MATERIALS:
        for model in MODELS:
            run, unbound, bound = paths(material, model)
            documents[run] = {
                "schema": "lupine.statics_run.v1", "material": material,
                "structure_type": "fcc", "model_id": model, "device": "cpu",
                "calculator_version": secret, "checkpoint_sha256": opaque_metadata_hash,
                "results": {
                    "lattice": {"values": {"a": secret}}, "vacancy": {"value": secret},
                    "surfaces": [{"values": {"miller": facet, "gamma": secret}}
                                 for facet in ("100", "111", "110")],
                },
                "notes": secret, "fitted_knots": [secret], "scientific_pass": secret,
            }
            evidence = {
                "schema": "lupine.mlip.calc_evidence.v1", "material": material,
                "source": {"model_id": model, "backend": "ase", "device": "cpu",
                           "calculator_version": secret, "checkpoint_sha256": opaque_metadata_hash},
                "provenance": {"inputs_sha256": opaque_metadata_hash, "notes": secret},
                "properties": [
                    {"name": name, "unit": unit, "value": secret, "reference": secret,
                     "tolerance": secret, "uncertainty": secret, "pass": secret,
                     "residual": secret, "metadata": {"secret": secret}}
                    for name, _, unit in QUANTITIES
                ],
            }
            documents[unbound], documents[bound] = deepcopy(evidence), deepcopy(evidence)
    entries = []
    for material in MATERIALS:
        for _, property_name, unit in QUANTITIES:
            entries.append({"material": material, "structure": "fcc", "property": property_name,
                            "unit": unit, "method": "DFT-PBE", "value": secret,
                            "source": {"citation": secret, "doi_or_url": secret, "notes": secret},
                            "uncertainty": secret, "temperature": secret})
    # Same metadata match, different method: neither record may be chosen or erased.
    duplicate = deepcopy(entries[0]); duplicate["method"] = "experiment"; entries.append(duplicate)
    for path, family in zip(REFERENCES, ("surface_energies", "vacancy_formation")):
        family_entries = [row for row in entries
                          if (row["property"] == "vacancy_formation_energy") == (family == "vacancy_formation")]
        documents[path] = {"schema": "lupine.y_matrix_targets.v1", "family": family,
                           "entries": deepcopy(family_entries), "notes": secret}
    return documents


def captured(documents):
    raw = {path: encode(value) for path, value in documents.items()}
    return tuple(seal(path, data) for path, data in raw.items()), raw


def extract(documents):
    specs, raw = captured(documents)
    return custody.extract_files(specs, raw)


def without_custody_seals(report):
    value = deepcopy(report)
    value.pop("content_sha256", None)
    for artifact in value["artifacts"]:
        # Do not remove any metadata key, per-property digest, or identity gate.
        for name in ("expected_git_blob_sha1", "expected_bytes", "received_sha256", "received_bytes"):
            artifact.pop(name)
    return value


class ProjectionCustodyIndependentTests(unittest.TestCase):
    def assert_universe(self, report):
        expected = {(material, model) for material in MATERIALS for model in MODELS}
        actual = [(unit["material"], unit["model_id"]) for unit in report["units"]]
        self.assertEqual(set(actual), expected)
        self.assertEqual(len(actual), 36)
        self.assertEqual(report["counts"]["units_reported"], 36)
        for unit in report["units"]:
            self.assertEqual(unit["eligibility_decision"], "NOT_MADE")
            self.assertFalse(unit["split_assigned"])
            self.assertFalse(unit["numerical_target_completeness_checked"])
            self.assertEqual(unit["gates"]["checkpoint_identity"], "UNKNOWN")
            self.assertFalse(unit["checkpoint"]["checkpoint_bytes_verified"])
            self.assertEqual(unit["gates"]["physical_discrepancy_bounds"], "UNSUPPORTED")

    def test_target_notes_and_opaque_metadata_digest_noninterference(self):
        first, second = extract(fixture(SENTINEL_A)), extract(fixture(SENTINEL_B))
        self.assertEqual(without_custody_seals(first), without_custody_seals(second))
        self.assertNotEqual(first["content_sha256"], second["content_sha256"])
        for report, secret in ((first, SENTINEL_A), (second, SENTINEL_B)):
            public = json.dumps(report, sort_keys=True)
            for forbidden in (secret, hashlib.sha256(secret.encode()).hexdigest(),
                              hashlib.sha1(secret.encode()).hexdigest(),
                              hashlib.sha256(encode(secret)).hexdigest()):
                self.assertNotIn(forbidden, public)
            self.assert_universe(report)

    def test_target_type_plausibility_and_value_presence_do_not_make_scientific_gates(self):
        base = fixture()
        baseline = without_custody_seals(extract(base))
        for target in (None, False, 0, -987654321, "1e999999", [SENTINEL_A], {"secret": SENTINEL_A}):
            documents = deepcopy(base)
            for path, document in documents.items():
                if path.endswith(".evidence.json"):
                    for row in document["properties"]:
                        row["value"] = target; row["reference"] = target; row["pass"] = target
                if path in REFERENCES:
                    for row in document["entries"]:
                        row["value"] = target
            self.assertEqual(without_custody_seals(extract(documents)), baseline)
        # A property record's presence is not the presence or validity of its value.
        for document in base.values():
            for row in document.get("properties", []) + document.get("entries", []):
                row.pop("value", None)
        self.assertEqual(without_custody_seals(extract(base)), baseline)

    def test_all_units_survive_missing_invalid_or_unverified_artifacts(self):
        specs, raw = captured(fixture())
        self.assert_universe(custody.extract_files(specs, {}))
        focus = paths("Ag", "chgnet")[0]
        changes = (
            (None, "MISSING"), (False, "READ_FAILED"),
            (b"!" * len(raw[focus]), "BLOB_MISMATCH"), (raw[focus] + b" ", "SIZE_MISMATCH"),
        )
        for value, expected_status in changes:
            damaged = dict(raw)
            if value is None:
                damaged.pop(focus)
            else:
                damaged[focus] = value
            report = custody.extract_files(specs, damaged)
            self.assert_universe(report)
            artifact = next(a for a in report["artifacts"] if a["path"] == focus)
            self.assertEqual(artifact["status"], expected_status)
            self.assertIsNone(artifact["metadata"])

    def test_verified_malformed_payload_has_only_constant_error_and_no_value_echo(self):
        specs, raw = captured(fixture())
        focus = paths("Ag", "chgnet")[1]
        malformed = (
            b'{"' + SENTINEL_A.encode() + b'":1,"' + SENTINEL_A.encode() + b'":2}',
            b'{"value":"' + SENTINEL_A.encode() + b'",}',
            b'{"value":NaN,"notes":"' + SENTINEL_A.encode() + b'"}',
            b'\xff' + SENTINEL_A.encode(),
        )
        for bad in malformed:
            case = dict(raw); case[focus] = bad
            pinned = [seal(s.path, bad) if s.path == focus else s for s in specs]
            stdout, stderr = io.StringIO(), io.StringIO()
            with redirect_stdout(stdout), redirect_stderr(stderr):
                report = custody.extract_files(pinned, case)
            self.assertEqual(stdout.getvalue() + stderr.getvalue(), "")
            self.assertNotIn(SENTINEL_A, json.dumps(report))
            self.assertEqual(next(a["status"] for a in report["artifacts"] if a["path"] == focus), "JSON_INVALID")
            self.assert_universe(report)

    def test_missing_identity_is_unknown_but_declared_different_identity_conflicts(self):
        focus = paths("Ag", "chgnet")[0]
        for key in ("material", "model_id", "structure_type"):
            documents = fixture(); documents[focus].pop(key)
            report = extract(documents)
            unit = next(u for u in report["units"] if u["material"] == "Ag" and u["model_id"] == "chgnet")
            self.assertEqual(unit["gates"]["symbolic_triple_identity"], "UNKNOWN")
            self.assert_universe(report)
        documents = fixture(); documents[focus]["material"] = "Al"
        unit = extract(documents)["units"][0]
        self.assertEqual(unit["gates"]["symbolic_triple_identity"], "CONFLICT")

    def test_all_reference_matches_remain_unselected_and_do_not_verify_checkpoint(self):
        report = extract(fixture())
        self.assert_universe(report)
        unit = next(u for u in report["units"] if u["material"] == "Ag" and u["model_id"] == "chgnet")
        row = next(p for p in unit["properties"] if p["name"] == "gamma_100")
        self.assertEqual(len(row["reference_candidates"]), 2)
        self.assertEqual({r["method"] for r in row["reference_candidates"]}, {"DFT-PBE", "experiment"})
        self.assertEqual(row["reference_match_status"], "REVIEW_REQUIRED")
        self.assertFalse(row["reference_choice_made"])
        self.assertEqual({r["path"] for r in row["reference_candidates"]}, {REFERENCES[0]})

    def test_missing_units_stay_unknown_and_known_incompatible_units_conflict(self):
        focus = paths("Ag", "chgnet")[1]
        for declared, expected in ((None, "UNKNOWN"), (SENTINEL_A, "UNKNOWN"), ("eV", "CONFLICT")):
            documents = fixture()
            evidence = documents[focus]["properties"][0]
            reference = documents[REFERENCES[0]]["entries"][0]
            if declared is None:
                evidence.pop("unit"); reference.pop("unit")
            else:
                evidence["unit"] = declared; reference["unit"] = declared
            report = extract(documents)
            records = {a["path"]: a for a in report["artifacts"]}
            self.assertEqual(records[focus]["metadata"]["properties"]["gamma_100"]["unit_status"], expected)
            self.assertEqual(records[REFERENCES[0]]["metadata"]["entries"][0]["unit_status"], expected)
            self.assert_universe(report)

    def test_public_validator_accepts_its_own_receipt_but_rejects_known_key_value_channels(self):
        report = extract(fixture())
        custody.validate_public_report(report)
        mutations = (
            lambda r: r["artifacts"][0]["metadata"].update(material=SENTINEL_A),
            lambda r: r["artifacts"][0]["metadata"].update(geometry_source=SENTINEL_A),
            lambda r: r["counts"].update(units_reported=SENTINEL_A),
            lambda r: r["limits"].update(interpretation=SENTINEL_A),
            lambda r: r["units"][0].update(eligibility_decision=SENTINEL_A),
            lambda r: r["scope"].update(fitting_or_simulation_performed=True),
            lambda r: r["units"][0]["checkpoint"].update(checkpoint_bytes_verified=True),
            lambda r: r["units"][0]["gates"].update(physical_discrepancy_bounds="PASS"),
            lambda r: r["units"][0]["properties"][0].update(reference_choice_made=True),
        )
        for mutate in mutations:
            invalid = deepcopy(report); mutate(invalid)
            invalid.pop("content_sha256", None)  # Exercise the allowlist, not digest mismatch.
            with self.assertRaises(custody.CustodyError):
                custody.validate_public_report(invalid)

    def test_public_validator_rejects_a_smaller_or_duplicated_universe(self):
        report = extract(fixture())
        smaller = deepcopy(report); smaller.pop("content_sha256")
        smaller["units"].pop(); smaller["counts"]["units_reported"] = 35
        with self.assertRaises(custody.CustodyError):
            custody.validate_public_report(smaller)
        duplicate = deepcopy(report); duplicate.pop("content_sha256")
        duplicate["units"][-1] = deepcopy(duplicate["units"][0])
        with self.assertRaises(custody.CustodyError):
            custody.validate_public_report(duplicate)

    def test_scalar_slots_cannot_smuggle_nested_per_value_hashes_or_empty_containers(self):
        report = extract(fixture())
        payload_hash = hashlib.sha256(SENTINEL_A.encode()).hexdigest()
        for substitute in ({"received_sha256": payload_hash}, {"material": "Ag"}, [], {}):
            invalid = deepcopy(report); invalid.pop("content_sha256")
            invalid["artifacts"][0]["metadata"]["material"] = substitute
            with self.assertRaises(custody.CustodyError):
                custody.validate_public_report(invalid)

    def test_pure_extractor_never_opens_files_or_network(self):
        specs, raw = captured(fixture())
        with patch("builtins.open", side_effect=AssertionError("filesystem access")), \
             patch.object(Path, "read_bytes", side_effect=AssertionError("filesystem access")), \
             patch.object(custody, "_fetch", side_effect=AssertionError("network access")):
            report = custody.extract_files(specs, raw)
        self.assert_universe(report)

    def test_inventory_and_unexpected_path_failures_never_echo_payload(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "inventory.json"
            path.write_text(SENTINEL_A)
            with self.assertRaises(custody.CustodyError) as caught:
                custody.load_inventory(path)
            self.assertEqual(str(caught.exception), "INVENTORY_SEAL_CONFLICT")
        specs, raw = captured(fixture()); raw[SENTINEL_A] = SENTINEL_A.encode()
        with self.assertRaises(custody.CustodyError) as caught:
            custody.extract_files(specs, raw)
        self.assertEqual(str(caught.exception), "UNEXPECTED_INPUT_PATH")

    def test_public_inventory_is_exactly_the_pinned_metadata_only_route(self):
        # This reads only the already-public path/hash inventory, never its targets.
        specs = custody.load_inventory()
        expected = {path for material in MATERIALS for model in MODELS
                    for path in paths(material, model)} | set(REFERENCES)
        self.assertEqual(len(specs), 110)
        self.assertEqual({spec.path for spec in specs}, expected)
        self.assertEqual(custody.COMMIT, "81079a8e1bac7ed332712cc92002bd3435e40776")
        self.assertEqual(custody.REPOSITORY, "alexwelcing/lupine-rhizo")
        self.assertEqual(custody.INVENTORY_SHA256,
                         "4874aebfa7e6f8003b6b733750ddac6675770a7b815b9ac8e1de81f55d118f42")
        forbidden = ("binding_report.json", "env_field_binding_report.json", "envfield_experiment")
        self.assertFalse(any(token in spec.path for spec in specs for token in forbidden))

    def test_cli_unexpected_failure_has_constant_message_and_no_partial_output(self):
        specs, _ = captured(fixture())
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "public.json"
            stdout, stderr = io.StringIO(), io.StringIO()
            with patch.object(custody, "load_inventory", return_value=specs), \
                 patch.object(custody, "extract_cache", side_effect=RuntimeError(SENTINEL_A)), \
                 redirect_stdout(stdout), redirect_stderr(stderr):
                result = custody.main(["extract", "--output", str(output)])
            self.assertEqual(result, 2)
            self.assertEqual(json.loads(stdout.getvalue()),
                             {"reason": "CUSTODY_INTERNAL_FAILURE", "status": "BLOCKED"})
            self.assertEqual(stderr.getvalue(), "")
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
