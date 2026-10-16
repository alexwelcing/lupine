"""Synthetic custody tests only. No original mixed-target JSON is opened."""
from copy import deepcopy
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("projection_custody_tests", ROOT/"scripts/projection_custody.py")
c = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = c
SPEC.loader.exec_module(c)
SENTINEL = "MEASUREMENT_SENTINEL_987654321.123456789"


def fixtures(value=SENTINEL):
    objects = {}
    for material in c.MATERIALS:
        for model in c.MODELS:
            run, unbound, bound = c.triple_paths(material, model)
            objects[run] = {"schema": c.SCHEMAS["run"], "material": material, "structure_type": "fcc", "model_id": model,
                "device": "cpu", "calculator_version": value,
                "results": {"lattice": {"values": {"a0_angstrom": value}}, "vacancy": {"value": value},
                            "surfaces": [{"values": {"miller": miller, "area_a2": value, "energy": value},
                                          "canonical_inputs": {"a0_angstrom": value}, "n_relax_steps": value} for miller in ("100", "111", "110")]}}
            evidence = {"schema": c.SCHEMAS["evidence"], "material": material,
                        "source": {"model_id": model, "device": "cpu", "backend": "ase", "calculator_version": value},
                        "provenance": {"inputs_sha256": "a"*64, "run_label": value},
                        "properties": [{"name": name, "unit": c.PROPERTY_UNITS[name], "value": value,
                                        "reference_value": value, "reference_source": value, "tolerance": value} for name in c.PROPERTIES]}
            objects[unbound], objects[bound] = deepcopy(evidence), deepcopy(evidence)
    for path in c.REFERENCES:
        names = c.PROPERTIES if "surface_energies" in path else ("vacancy_formation_energy",)
        names = [name for name in names if (name != "vacancy_formation_energy") == ("surface_energies" in path)]
        objects[path] = {"schema": c.SCHEMAS["reference"], "family": Path(path).stem,
                         "entries": [{"material": material, "structure": "fcc", "property": c.TARGET_NAMES[name],
                                     "unit": c.PROPERTY_UNITS[name], "method": "DFT-PBE", "value": value,
                                     "source": {"citation": value, "doi_or_url": value, "notes": value}, "uncertainty": value}
                                    for material in c.MATERIALS for name in names]}
    return objects


def seal(objects):
    raw = {path: c.canonical_bytes(value) for path, value in objects.items()}
    specs = [c.ArtifactSpec(path, c.git_blob_sha1(raw[path]), len(raw[path])) for path in c.expected_paths()]
    return specs, raw


def without_whole_blob_identity(report):
    report = deepcopy(report)
    report.pop("content_sha256", None)
    for row in report["artifacts"]:
        for key in ("expected_git_blob_sha1", "expected_bytes", "received_sha256", "received_bytes"):
            row.pop(key)
    return report


class ProjectionCustodyTests(unittest.TestCase):
    def test_complete_redaction_is_deterministic_without_target_values(self):
        specs, raw = seal(fixtures())
        report = c.extract_files(specs, raw)
        self.assertEqual(report, c.extract_files(reversed(specs), dict(reversed(list(raw.items())))))
        self.assertEqual(report["status"], "METADATA_COMPLETE")
        self.assertEqual(len(report["units"]), 36)
        self.assertEqual(len(report["artifacts"]), 110)
        self.assertNotIn(SENTINEL, c.canonical_bytes(report).decode())
        self.assertTrue(report["scope"]["target_bearing_source_bytes_acquired"])
        self.assertTrue(report["scope"]["mixed_source_json_decoded"])
        self.assertFalse(report["scope"]["fully_blinded_research_claim"])
        self.assertTrue(all(row["gates"]["physical_discrepancy_bounds"] == "UNSUPPORTED" for row in report["units"]))
        self.assertTrue(all(row["eligibility_decision"] == "NOT_MADE" and not row["split_assigned"] for row in report["units"]))

    def test_all_target_values_null_missing_or_changed_do_not_change_metadata(self):
        baseline = without_whole_blob_identity(c.extract_files(*seal(fixtures(1))))
        for value in (None, False, "999/13", [SENTINEL], {"nested": SENTINEL}, -999999999):
            with self.subTest(value_type=type(value).__name__):
                self.assertEqual(without_whole_blob_identity(c.extract_files(*seal(fixtures(value)))), baseline)
        objects = fixtures(1)
        for obj in objects.values():
            for row in obj.get("properties", [])+obj.get("entries", []):
                for key in ("value", "reference_value", "reference_source", "tolerance", "uncertainty"):
                    row.pop(key, None)
        self.assertEqual(without_whole_blob_identity(c.extract_files(*seal(objects))), baseline)

    def test_no_free_text_geometry_or_derived_hashes_escape(self):
        objects = fixtures()
        for obj in objects.values():
            obj["unknown"] = {"data": SENTINEL}
            obj["checkpoint_sha256"] = "b"*64
        report = c.extract_files(*seal(objects))
        output = c.canonical_bytes(report).decode()
        self.assertNotIn(SENTINEL, output)
        self.assertNotIn("b"*64, output)
        for forbidden in ("a0_angstrom", "area_a2", "reference_value", "tolerance", "n_relax_steps", "run_label", "checkpoint_sha256"):
            self.assertNotIn('"'+forbidden+'"', output)
        self.assertTrue(all(unit["gates"]["checkpoint_identity"] == "UNKNOWN" for unit in report["units"]))

    def test_unknown_symbolic_strings_are_never_echoed(self):
        objects = fixtures()
        first = c.triple_paths("Ag", "chgnet")
        for path in first:
            objects[path]["material"] = SENTINEL
            objects[path]["source"] = {"model_id": SENTINEL, "device": SENTINEL, "backend": SENTINEL}
        objects[c.REFERENCES[0]]["entries"][0].update(method=SENTINEL, unit=SENTINEL)
        report = c.extract_files(*seal(objects))
        self.assertNotIn(SENTINEL, c.canonical_bytes(report).decode())
        self.assertEqual(report["units"][0]["gates"]["symbolic_triple_identity"], "UNKNOWN")

    def test_every_expected_unit_survives_all_missing_and_partial_files(self):
        specs, raw = seal(fixtures())
        for content in ({}, {c.expected_paths()[0]: raw[c.expected_paths()[0]]}):
            report = c.extract_files(specs, content)
            self.assertEqual(len(report["units"]), 36)
            self.assertEqual(report["counts"]["expected_artifacts"], 110)
            self.assertEqual(report["status"], "METADATA_INCOMPLETE")
            self.assertTrue(all(unit["eligibility_decision"] == "NOT_MADE" for unit in report["units"]))

    def test_hash_mismatch_precedes_json_parse(self):
        specs, raw = seal(fixtures())
        name = c.expected_paths()[0]
        raw[name] = b"x"*len(raw[name])
        original = c.strict_decode
        seen = []
        def guarded(value):
            seen.append(value)
            return original(value)
        with patch.object(c, "strict_decode", guarded):
            report = c.extract_files(specs, raw)
        self.assertEqual(report["artifacts"][0]["status"], "BLOB_MISMATCH")
        self.assertNotIn(raw[name], seen)
        self.assertEqual(len(report["units"]), 36)

    def test_duplicate_keys_nonfinite_and_parse_errors_are_sanitized(self):
        specs, raw = seal(fixtures())
        path = c.expected_paths()[0]
        for invalid in (b'{"secret":"'+SENTINEL.encode()+b'","secret":0}', b'{"value":NaN}', b'{"value":Infinity}', b'{"value":-Infinity}', b'{"value":"'+SENTINEL.encode()+b'"'):
            changed = dict(raw); changed[path] = invalid
            altered = [c.ArtifactSpec(s.path, c.git_blob_sha1(invalid), len(invalid)) if s.path == path else s for s in specs]
            out, err = io.StringIO(), io.StringIO()
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
                report = c.extract_files(altered, changed)
            self.assertEqual(report["artifacts"][0]["status"], "JSON_INVALID")
            self.assertEqual(len(report["units"]), 36)
            self.assertEqual(out.getvalue()+err.getvalue(), "")
            self.assertNotIn(SENTINEL, c.canonical_bytes(report).decode())

    def test_reference_ambiguity_never_selects_pbe_or_experiment(self):
        objects = fixtures()
        row = deepcopy(objects[c.REFERENCES[0]]["entries"][0]); row["method"] = "experiment"
        objects[c.REFERENCES[0]]["entries"].append(row)
        report = c.extract_files(*seal(objects))
        property_row = report["units"][0]["properties"][0]
        self.assertEqual(len(property_row["reference_candidates"]), 2)
        self.assertEqual(property_row["reference_match_status"], "REVIEW_REQUIRED")
        self.assertFalse(property_row["reference_choice_made"])
        self.assertEqual({x["method"] for x in property_row["reference_candidates"]}, {"experiment", "DFT-PBE"})

    def test_known_reconstruction_flags_do_not_remove_units(self):
        report = c.extract_files(*seal(fixtures()))
        flagged = {(u["material"], p["name"]) for u in report["units"] for p in u["properties"] if p["facet_jurisdiction"] == "REVIEW_REQUIRED"}
        self.assertEqual(flagged, {("Ag", "gamma_110"), ("Au", "gamma_110"), ("Pt", "gamma_110"), ("Sr", "gamma_111")})
        self.assertEqual(len(report["units"]), 36)

    def test_input_hash_conflicts_do_not_become_data_or_material_exclusions(self):
        objects = fixtures(); objects[c.triple_paths("Ag", "chgnet")[2]]["provenance"]["inputs_sha256"] = "c"*64
        report = c.extract_files(*seal(objects))
        self.assertEqual(report["units"][0]["gates"]["declared_input_hash_agreement"], "CONFLICT")
        self.assertEqual(report["units"][0]["eligibility_decision"], "NOT_MADE")

    def test_public_allowlist_rejects_fields_at_each_nested_level(self):
        report = c.extract_files(*seal(fixtures())); report.pop("content_sha256")
        for route in ((), ("scope",), ("units", 0), ("units", 0, "properties", 0), ("artifacts", 0, "metadata"), ("artifacts", 1, "metadata", "properties", "gamma_100")):
            altered = deepcopy(report); parent = altered
            for key in route: parent = parent[key]
            parent["secret"] = SENTINEL
            with self.subTest(route=route), self.assertRaises(c.CustodyError): c.validate_public_report(altered)

    def test_public_inventory_pin_and_exact_110_paths(self):
        specs = c.load_inventory()
        self.assertEqual(len(specs), 110)
        self.assertEqual({s.path for s in specs}, set(c.expected_paths()))
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary)/"inventory.json"; path.write_text(SENTINEL)
            with self.assertRaisesRegex(c.CustodyError, "INVENTORY_SEAL_CONFLICT"): c.load_inventory(path)
        for bad in (specs[:-1], (*specs[:-1], specs[0])):
            with self.assertRaises(c.CustodyError): c.validate_specs(bad)

    def test_cache_acquisition_is_bounded_and_output_reports_access_honestly(self):
        specs, raw = seal(fixtures())
        with tempfile.TemporaryDirectory() as temporary, patch.object(c, "ROOT", Path(temporary)):
            calls = []
            def fetch(spec): calls.append(spec.path); return raw[spec.path]
            receipt = c.acquire_to_cache(specs, fetch=fetch)
            # Identical bound/unbound bytes legitimately share one pinned object.
            seen = set(); expected_calls = []
            for spec in specs:
                if spec.git_blob_sha1 not in seen:
                    seen.add(spec.git_blob_sha1); expected_calls.append(spec.path)
            self.assertEqual(calls, expected_calls)
            self.assertTrue(receipt["target_bearing_source_bytes_received"])
            self.assertFalse(receipt["mixed_source_json_decoded"])
            self.assertTrue(all(v == "VERIFIED" for v in receipt["file_statuses"].values()))
            with patch.object(c, "_fetch", side_effect=AssertionError("network forbidden")):
                report = c.extract_cache(specs)
                self.assertEqual(report, c.extract_files(specs, raw))
                self.assertEqual(c.acquire_to_cache(specs)["file_statuses"], receipt["file_statuses"])

    def test_raw_cache_rejects_outside_paths_and_symlink_escape(self):
        with tempfile.TemporaryDirectory() as temporary, patch.object(c, "ROOT", Path(temporary)):
            with self.assertRaises(c.CustodyError): c.cache_root(Path(temporary)/"published")
            base = Path(temporary)/".cache"; base.mkdir()
            outside = Path(temporary)/"outside"; outside.mkdir()
            (base/"projection-custody").symlink_to(outside, target_is_directory=True)
            with self.assertRaises(c.CustodyError): c.cache_root()

    def test_acquisition_and_cli_failures_never_log_payloads(self):
        specs, raw = seal(fixtures())
        with tempfile.TemporaryDirectory() as temporary, patch.object(c, "ROOT", Path(temporary)):
            def failure(_): raise RuntimeError(SENTINEL)
            out, err = io.StringIO(), io.StringIO()
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
                receipt = c.acquire_to_cache(specs, fetch=failure)
                with patch.object(c, "load_inventory", side_effect=RuntimeError(SENTINEL)):
                    code = c.main(["extract", "--output", str(Path(temporary)/"public.json")])
            self.assertEqual(code, 2)
            self.assertNotIn(SENTINEL, out.getvalue()+err.getvalue()+c.canonical_bytes(receipt).decode())
            self.assertFalse(receipt["target_bearing_source_bytes_received"])

    def test_public_sink_revalidates_and_custom_exception_text_cannot_escape(self):
        report = c.extract_files(*seal(fixtures()))
        report.pop("content_sha256")
        report["artifacts"][0]["metadata"]["material"] = SENTINEL
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary)/"public.json"
            with self.assertRaises(c.CustodyError): c.write_public(report, output)
            self.assertFalse(output.exists())
            out, err = io.StringIO(), io.StringIO()
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err), patch.object(c, "load_inventory", side_effect=c.CustodyError(SENTINEL)):
                self.assertEqual(c.main(["extract", "--output", str(output)]), 2)
                self.assertEqual(c.main([SENTINEL]), 2)
            self.assertNotIn(SENTINEL, out.getvalue()+err.getvalue())

    def test_scalar_slots_cannot_hold_nested_whole_artifact_hash_channels(self):
        report = c.extract_files(*seal(fixtures())); report.pop("content_sha256")
        for payload in ({"received_sha256": "e"*64}, {}, [], ["Ag"]):
            invalid = deepcopy(report); invalid["artifacts"][0]["metadata"]["material"] = payload
            with self.subTest(container=type(payload).__name__), self.assertRaises(c.CustodyError): c.validate_public_report(invalid)


if __name__ == "__main__":
    unittest.main()
