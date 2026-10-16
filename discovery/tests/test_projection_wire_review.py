"""Independent projection-wrapper tests with synthetic inputs only.

These probe the original wrapper, unsupported truth audit, exact identities,
and expansion boundary rather than treating a prepared model as user input.
"""
from copy import deepcopy
from fractions import Fraction
from pathlib import Path
import itertools
import json
import tempfile
import threading
import unittest
from unittest.mock import patch

from lupine_discovery import projection_io as wire
from lupine_discovery import coupled_io as coupled_wire
from lupine_discovery import coupled_worker as worker
from lupine_discovery.evidence import digest


PROBLEM = "lupine.discovery.projection_problem.v1"
OUTCOMES = "lupine.discovery.projection_outcomes.v1"
LIMITS = {"max_operations": 100000, "max_certificate_terms": 512,
          "max_integer_bits": 2048, "max_witness_pairs": 4096}


def scope(quantity="score", unit="synthetic unit"):
    return {"scenario_id": "projection-wire-independent", "quantity": quantity,
            "unit": unit, "reference": "synthetic reference"}


def fixture():
    physical = {"scenario_id": "projection-wire-independent", "material_id": "material",
                "composition_id": "composition", "structure_id": "structure",
                "operating_conditions_id": "fixed conditions"}
    field_scope = {"context": physical, "model_id": "model", "model_version": "v1",
                   "observation_family": "energy", "reference_method": "reference",
                   "descriptor_id": "descriptor"}
    field = {"block_id": "field", "scope": deepcopy(field_scope), "parameter_ids": ["theta"],
             "parameter_units": ["synthetic unit"], "offset": ["0"], "matrix": [["1"]],
             "latent_ids": ["z"], "latent_bounds": [["0", "2"]],
             "parameterization_reference": "Declared synthetic common image",
             "field_bound_reference": "Declared synthetic enclosure", "source_ids": [],
             "premise_status": "assumed_unverified", "field_bound_basis": "declared_bound"}
    observations, candidates = [], []
    for cid, nominal in (("A", "5"), ("B", "4")):
        oid = "obs-"+cid
        observations.append({"observation_id": oid, "block_id": "field", "field_scope": deepcopy(field_scope),
            "source_scope": scope("raw"), "nominal": nominal, "weights": ["1"],
            "discrepancy_radius": "1/4", "bound_reference": "Declared synthetic error bound",
            "source_ids": [], "bound_basis": "declared_bound", "premise_status": "assumed_unverified"})
        candidates.append({"candidate_id": cid, "context": deepcopy(physical), "score": {
            "observation_id": oid, "scale": "1", "offset": "0", "output_scope": scope(),
            "conversion_reference": "Explicit identity map", "source_ids": []}, "constraints": {}})
    return {"schema": PROBLEM, "projection": {"scenario_id": "projection-wire-independent",
        "objective_scope": scope(), "constraint_scopes": {}, "blocks": [field], "observations": observations,
        "candidates": candidates, "relation_reference": "Synthetic assumptions, not physical validation",
        "anchors": [], "sources": [], "premise_status": "assumed_unverified"},
        "screening": {"consistency_point": ["0", "0", "0"], "proofs": [], "limits": dict(LIMITS)}}


def outcomes(value, rows=None, point=None):
    certificate = wire.projection_certificate(value)
    result = {"schema": OUTCOMES, "scenario_id": value["projection"]["scenario_id"],
              "problem_digest": certificate["problem_digest"], "certificate_digest": certificate["certificate_digest"],
              "outcomes": rows if rows is not None else [
                  {"id": "A", "score": "5", "constraints": {}},
                  {"id": "B", "score": "4", "constraints": {}}]}
    if point is not None:
        result["latent_world"] = {"kind": "hypothetical_model_world", "point": point}
    return result


def make_unsupported(value):
    value["projection"]["observations"][0]["discrepancy_radius"] = None
    return value


class ProjectionWireIndependentReview(unittest.TestCase):
    def test_outer_and_derived_identities_preserve_non_numeric_metadata(self):
        value = fixture()
        original = deepcopy(value)
        before = wire.projection_certificate(value)
        self.assertEqual(value, original)
        self.assertEqual(before["selection"]["retained"], ["B"])
        self.assertEqual(before["selection"], before["coupled_certificate"]["selection"])
        value["projection"]["blocks"][0]["parameterization_reference"] = "Changed declared image premise"
        after = wire.projection_certificate(value)
        for key in ("problem_digest", "certificate_digest"):
            self.assertNotEqual(before[key], after[key])
        for key in ("input_digest", "relation_digest"):
            self.assertNotEqual(before["projection"][key], after["projection"][key])
        self.assertNotEqual(before["coupled_certificate"]["problem_digest"], after["coupled_certificate"]["problem_digest"])
        self.assertEqual(before["coupled_certificate"]["model_identity"]["kernel_model_digest"],
                         after["coupled_certificate"]["model_identity"]["kernel_model_digest"])
        self.assertEqual(after["certificate_digest"], digest({k: v for k, v in after.items() if k != "certificate_digest"}))

    def test_equivalent_number_spellings_keep_distinct_wire_identity(self):
        value = fixture()
        before = wire.projection_certificate(value)
        value["projection"]["observations"][0]["nominal"] = 5
        after = wire.projection_certificate(value)
        self.assertNotEqual(before["problem_digest"], after["problem_digest"])
        self.assertEqual(before["projection"]["input_digest"], after["projection"]["input_digest"])
        self.assertEqual(before["prepared_problem"], after["prepared_problem"])

    def test_no_model_keeps_original_universe_without_finite_stand_in(self):
        value = make_unsupported(fixture())
        receipt = wire.projection_certificate(value)
        self.assertIsNone(receipt["prepared_problem"])
        self.assertIsNone(receipt["coupled_certificate"])
        self.assertEqual(receipt["selection"]["retained"], ["A", "B"])
        for key in ("certified_feasible", "interval_infeasible", "interval_dominated", "coupled_infeasible", "coupled_dominated"):
            self.assertEqual(receipt["selection"][key], [])
        self.assertEqual(receipt["selection"]["dominance_witnesses"], {})
        self.assertEqual(receipt["execution"]["kernel_operations_used"], 0)
        self.assertTrue(receipt["projection"]["reasons"])
        truth = outcomes(value, point=["999", "999", "999"])
        report = wire.projection_replay_report(value, truth)
        self.assertEqual(report["decision"]["certificate"], receipt)
        self.assertIs(report["outcome_audit"]["all_true_minimizers_retained"], True)
        self.assertEqual(report["provided_world_audit"]["status"], "unavailable_no_prepared_model")
        self.assertIs(report["provided_world_audit"]["point_supplied"], True)
        self.assertEqual(report["provided_world_audit"]["checked_quantity_count"], 0)
        self.assertIsNone(report["diagnostics"]["marginal_coverage"]["score_coverage"])
        self.assertIsNone(report["diagnostics"]["box_selection_diagnostic"])

    def test_false_common_world_failure_uses_actual_coupled_pool(self):
        value = fixture()
        truth = outcomes(value, [{"id": "A", "score": "3", "constraints": {}},
                                 {"id": "B", "score": "4", "constraints": {}}], ["0", "0", "0"])
        report = wire.projection_replay_report(value, truth)
        self.assertEqual(report["decision"]["selection"]["retained"], ["B"])
        self.assertEqual(report["outcome_audit"]["lost_optimum_ids"], ["A"])
        self.assertIs(report["outcome_audit"]["all_true_minimizers_retained"], False)
        self.assertEqual(report["diagnostics"]["marginal_coverage"]["score_coverage"]["rate"], "1")
        self.assertEqual(report["provided_world_audit"]["status"], "provided_point_mismatch")
        self.assertEqual(report["replay_digest"], digest({k: v for k, v in report.items() if k != "replay_digest"}))

    def test_nested_outcome_digests_cannot_replace_outer_projection_binding(self):
        value = fixture()
        certificate = wire.projection_certificate(value)
        truth = outcomes(value)
        truth["problem_digest"] = certificate["coupled_certificate"]["problem_digest"]
        truth["certificate_digest"] = certificate["coupled_certificate"]["certificate_digest"]
        with patch.object(wire, "coupled_replay_report", side_effect=AssertionError("outer seals must reject before rebinding")):
            with self.assertRaises(ValueError):
                wire.projection_replay_report(value, truth)

    def test_finite_and_unsupported_decisions_are_sealed_before_outcome_loader(self):
        for unsupported in (False, True):
            value = make_unsupported(fixture()) if unsupported else fixture()
            truth = outcomes(value)
            events = []
            select = wire._selection_receipt
            def seal(parsed):
                certificate = select(parsed)
                self.assertEqual(certificate["certificate_digest"], digest({k: v for k, v in certificate.items() if k != "certificate_digest"}))
                events.append("sealed")
                return certificate
            def load():
                self.assertEqual(events, ["sealed"])
                events.append("outcomes_loaded")
                return truth
            with patch.object(wire, "_selection_receipt", side_effect=seal):
                wire.projection_replay_report(value, load)
            self.assertEqual(events, ["sealed", "outcomes_loaded"])

    def test_expanded_dimensions_reject_before_fraction_or_adapter_build(self):
        for unsupported in (False, True):
            value = make_unsupported(fixture()) if unsupported else fixture()
            block = value["projection"]["blocks"][0]
            block["latent_ids"] = ["z"+str(i) for i in range(15)]
            block["latent_bounds"] = [["0", "1"] for _ in range(15)]
            block["matrix"] = [["1"]*15]
            value["screening"]["consistency_point"] = ["0"]*17
            with patch.object(coupled_wire, "Fraction", side_effect=AssertionError("dimension check must precede Fraction")), \
                 patch.object(wire, "build_projection", side_effect=AssertionError("no adapter expansion allowed")):
                with self.assertRaisesRegex(ValueError, "expanded.*dimension"):
                    wire.projection_certificate(value)

    def test_lexical_shapes_and_proofs_reject_before_exact_conversion(self):
        mutations = [lambda p: p["projection"]["observations"][0].update(nominal="1"*513),
                     lambda p: p["projection"]["observations"][0].update(weights=["1", "2"]),
                     lambda p: p["screening"].update(proofs=[{}]),
                     lambda p: p["projection"]["candidates"][0].update(candidate_id="x"*41)]
        for mutate in mutations:
            value = fixture()
            mutate(value)
            with patch.object(coupled_wire, "Fraction", side_effect=AssertionError("all shape/lexical checks must run first")), \
                 patch.object(wire, "build_projection", side_effect=AssertionError("no adapter expansion allowed")):
                with self.assertRaises(ValueError):
                    wire.projection_certificate(value)

    def test_oversized_derived_arithmetic_rejects_without_rounding_or_abstention(self):
        value = fixture()
        # Each input is 301 bits, but their product needs 601 bits and cannot
        # enter the coupled wire's 512-bit input profile after translation.
        value["projection"]["blocks"][0]["matrix"] = [[str(2**300)]]
        value["projection"]["observations"][0]["weights"] = [str(2**300)]
        with self.assertRaisesRegex(ValueError, "magnitude|512|bits"):
            wire.projection_certificate(value)

    def test_finite_ties_survive_and_outcome_point_cannot_repair_selection(self):
        value = fixture()
        for observation in value["projection"]["observations"]:
            observation["discrepancy_radius"] = "1/2"
        truth = outcomes(value, [{"id": "A", "score": "9/2", "constraints": {}},
                                 {"id": "B", "score": "9/2", "constraints": {}}], ["0", "-1", "1"])
        report = wire.projection_replay_report(value, truth)
        self.assertEqual(report["outcome_audit"]["true_minimizer_ids"], ["A", "B"])
        self.assertEqual(report["decision"]["selection"]["retained"], ["A", "B"])
        self.assertIs(report["outcome_audit"]["all_true_minimizers_retained"], True)
        value = fixture()
        value["projection"]["observations"][0]["nominal"] = "8"
        value["screening"]["consistency_point"] = None
        truth = outcomes(value, [{"id": "A", "score": "8", "constraints": {}},
                                 {"id": "B", "score": "4", "constraints": {}}], ["0", "0", "0"])
        report = wire.projection_replay_report(value, truth)
        self.assertEqual(report["provided_world_audit"]["status"], "provided_point_matches_reported_values")
        self.assertEqual(report["decision"]["selection"]["retained"], ["A", "B"])
        self.assertEqual(report["diagnostics"]["box_selection_diagnostic"]["retained"], ["B"])

    def test_empty_unsupported_universe_has_no_vacuous_retention_success(self):
        value = make_unsupported(fixture())
        value["projection"]["candidates"] = []
        report = wire.projection_replay_report(value, outcomes(value, rows=[]))
        self.assertIsNone(report["outcome_audit"]["all_true_minimizers_retained"])
        self.assertEqual(report["outcome_audit"]["retention_status"], "not_evaluated_empty_universe")

    def test_large_valid_cli_certificate_export_can_be_verified_again(self):
        from lupine_discovery.cli import main
        value = fixture()
        candidate = value["projection"]["candidates"][0]
        value["projection"]["candidates"] = [dict(deepcopy(candidate), candidate_id=f"{i:02d}"+("x"*38))
                                                for i in range(64)]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            problem_path, receipt_path, verified_path = (root / name for name in ("problem.json", "receipt.json", "verified.json"))
            problem_path.write_text(json.dumps(value))
            self.assertEqual(main(["select", str(problem_path), "--output", str(receipt_path)]), 0)
            raw = receipt_path.read_bytes()
            self.assertLessEqual(len(raw), worker.MAX_CERTIFICATE_BYTES)
            # This stresses actual proof-assessment expansion; pretty-printing
            # this otherwise valid receipt crosses the verification input cap.
            self.assertGreater(len(json.dumps(json.loads(raw), indent=2).encode()), worker.MAX_CERTIFICATE_BYTES)
            self.assertEqual(main(["verify", str(problem_path), str(receipt_path), "--output", str(verified_path)]), 0)
            self.assertIs(json.loads(verified_path.read_text())["verified"], True)

    def test_nonempty_proofs_and_prepared_models_are_rejected(self):
        for unsupported in (False, True):
            base = make_unsupported(fixture()) if unsupported else fixture()
            for proof_value in ([{}], ["ignored"], None):
                value = deepcopy(base)
                value["screening"]["proofs"] = proof_value
                with self.assertRaises((ValueError, TypeError)):
                    wire.projection_certificate(value)
            value = deepcopy(base)
            value["prepared_problem"] = {}
            with self.assertRaises(ValueError):
                wire.projection_certificate(value)

    def test_unsupported_outcome_point_still_requires_exact_correct_shape(self):
        value = make_unsupported(fixture())
        for point in ([], ["0", "0"], ["0", "0", "1e5"], ["0", "0", True], ["0", "0", 0.5]):
            truth = outcomes(value, point=point)
            with self.assertRaises((ValueError, TypeError)):
                wire.projection_replay_report(value, truth)

    def test_no_model_partial_truth_oracle_on_144_patterns(self):
        value = make_unsupported(fixture())
        value["projection"]["constraint_scopes"] = {"g": scope("g")}
        for candidate in value["projection"]["candidates"]:
            constraint = deepcopy(candidate["score"])
            constraint.update(scale="0", offset="0", output_scope=scope("g"))
            candidate["constraints"] = {"g": constraint}
        sealed = outcomes(value, rows=[])
        possibilities = list(itertools.product((None, "-1", "0", "1"), (None, "-1", "1")))
        for left, right in itertools.product(possibilities, repeat=2):
            rows = [{"id": cid, "score": score, "constraints": {"g": margin}}
                    for cid, (score, margin) in zip(("A", "B"), (left, right))]
            report = wire.projection_replay_report(value, dict(sealed, outcomes=rows))
            audit = report["outcome_audit"]
            complete = all(score is not None and margin is not None for score, margin in (left, right))
            feasible = {row["id"]: Fraction(row["score"]) for row in rows
                        if row["score"] is not None and row["constraints"]["g"] is not None
                        and Fraction(row["constraints"]["g"]) <= 0}
            winners = sorted(cid for cid, score in feasible.items() if score == min(feasible.values())) if complete and feasible else None
            self.assertEqual(audit["true_minimizer_ids"], winners)
            self.assertIs(audit["all_true_minimizers_retained"], True if winners is not None else None)
            if complete and not feasible:
                self.assertEqual(audit["retention_status"], "undefined_no_feasible_candidate")


class ProjectionTransportIndependentReview(unittest.TestCase):
    def test_coupled_and_projection_requests_share_one_slot(self):
        value = fixture()
        coupled = wire.projection_certificate(value)["prepared_problem"]
        started, finish = threading.Event(), threading.Event()
        errors = []
        def blocked(_frame):
            started.set()
            if not finish.wait(2):
                raise AssertionError("synthetic worker did not receive cleanup signal")
            raise worker.CoupledWorkerError("synthetic_failure", "synthetic failure")
        def first():
            try:
                worker.run_coupled("select", json.dumps(coupled))
            except worker.CoupledWorkerError as error:
                errors.append(error.code)
        with patch.object(worker, "guard_available", return_value=True), \
             patch.object(worker, "_bounded_process", side_effect=blocked):
            thread = threading.Thread(target=first)
            thread.start()
            try:
                self.assertTrue(started.wait(2))
                with self.assertRaises(worker.CoupledWorkerError) as error:
                    worker.run_coupled("select", json.dumps(value))
                self.assertEqual((error.exception.code, error.exception.http_status), ("worker_busy", 429))
            finally:
                finish.set()
                thread.join(2)
        self.assertFalse(thread.is_alive())
        self.assertEqual(errors, ["synthetic_failure"])
        self.assertTrue(worker._SLOT.acquire(blocking=False))
        worker._SLOT.release()

    def test_resealed_declaration_mutation_cannot_keep_old_adapter_identity(self):
        receipt = wire.projection_certificate(make_unsupported(fixture()))
        relation = receipt["projection"]["relation_record"]
        relation["declarations"]["candidates"][0]["context"]["structure_id"] = "changed structure"
        receipt["projection"]["relation_digest"] = digest(relation)
        receipt["certificate_digest"] = digest({k: v for k, v in receipt.items() if k != "certificate_digest"})
        with self.assertRaises(worker.CoupledWorkerError) as result:
            worker._validate_receipt("select", receipt)
        self.assertEqual(result.exception.code, "worker_invalid_response")

    def test_malformed_prepared_shapes_return_structured_failure(self):
        for key in ("candidates", "common_world"):
            receipt = wire.projection_certificate(fixture())
            receipt["prepared_problem"][key] = None
            receipt["certificate_digest"] = digest({k: v for k, v in receipt.items() if k != "certificate_digest"})
            with self.assertRaises(worker.CoupledWorkerError) as result:
                worker._validate_receipt("select", receipt)
            self.assertEqual(result.exception.code, "worker_invalid_response")

    @unittest.skipUnless(worker.guard_available(), "Linux resource guards required")
    def test_real_guarded_projection_select_replay_verify_and_unsupported_domains(self):
        from lupine_discovery.cli import verify_certificate
        for unsupported in (False, True):
            value = make_unsupported(fixture()) if unsupported else fixture()
            certificate = worker.run_coupled("select", json.dumps(value))
            self.assertIs(verify_certificate(value, certificate)["verified"], True)
            verified = worker.run_coupled("verify", json.dumps(value), raw_certificate=json.dumps(certificate))
            self.assertIs(verified["verified"], True)
            truth = outcomes(value)
            replay = worker.run_coupled("replay", json.dumps(value), json.dumps(truth))
            self.assertEqual(replay["decision"]["certificate"], certificate)
            with self.assertRaises(worker.CoupledWorkerError):
                worker.run_coupled("domains", json.dumps(value))
        self.assertTrue(worker._SLOT.acquire(blocking=False))
        worker._SLOT.release()


if __name__ == "__main__":
    unittest.main()
