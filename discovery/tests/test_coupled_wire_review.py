"""Independent synthetic boundary probes; no scientific data or model fitting.

These finite checks complement the kernel proof obligations. They do not prove
formal Python refinement, physical common-world validity, or solver completeness.
"""
from copy import deepcopy
from fractions import Fraction
import io
import itertools
import json
import os
from pathlib import Path
import signal
import tempfile
import time
import unittest
from unittest.mock import patch

from lupine_discovery import coupled_io as wire
from lupine_discovery import coupled_worker as worker
from lupine_discovery.evidence import digest


def problem():
    return {
        "schema": wire.PROBLEM_SCHEMA,
        "scenario": {"id": "independent-wire-review", "objective": {
            "direction": "minimize", "unit": "synthetic", "reference": "finite test"},
            "constraints": {}},
        "latent_variables": [{"id": "z", "bounds": ["0", "2"], "unit": "1",
                              "reference": "synthetic dimensionless coordinate"}],
        "candidates": [
            {"id": "A", "score": {"coefficients": ["1"], "constant": "1"}, "constraints": {}},
            {"id": "B", "score": {"coefficients": ["1"], "constant": "0"}, "constraints": {}}],
        "rows": [],
        "common_world": {"claim": "one_common_latent_vector_represents_all_quantities",
                         "premise_status": "assumed_unverified",
                         "relation_basis": "declared_affine_assumption", "reference": "synthetic only"},
        "screening": {"consistency_point": ["0"], "proofs": [], "limits": dict(wire.WORK_CEILINGS)},
    }


def proof_for(value):
    domains = wire.coupled_domains(value)
    return {"id": "dominance", "kind": "dominance", "instance_digest": domains["instance_digest"],
            "candidate_id": "A", "witness_id": "B", "feasibility": {},
            "improvement": {"domain_id": domains["candidate_domains"]["A"]["domain_id"],
                            "expression": {"coefficients": ["0"], "constant": "-1"},
                            "upper": "-1", "multipliers": {}}}


def truth_for(value, rows, point=None):
    receipt = wire.coupled_certificate(value)
    result = {"schema": wire.OUTCOMES_SCHEMA, "scenario_id": value["scenario"]["id"],
              "problem_digest": receipt["problem_digest"],
              "certificate_digest": receipt["certificate_digest"], "outcomes": rows}
    if point is not None:
        result["latent_world"] = {"kind": "hypothetical_model_world", "point": point}
    return result


class CoupledWireIndependentReview(unittest.TestCase):
    def test_duplicate_global_proof_occurrences_survive_phase_reordering(self):
        base = problem()
        base["rows"] = [
            {"id": "left", "coefficients": ["1"], "upper": "0", "unit": "1", "reference": "test"},
            {"id": "right", "coefficients": ["-1"], "upper": "-1", "unit": "1", "reference": "test"}]
        domains = wire.coupled_domains(base)
        global_proof = {"id": "global-one", "kind": "infeasibility",
                        "instance_digest": domains["instance_digest"], "candidate_id": None,
                        "domain_id": domains["common_domain"]["domain_id"],
                        "multipliers": {"left": "1", "right": "1"}}
        second = dict(deepcopy(global_proof), id="global-two")
        for proofs in itertools.permutations([proof_for(base), global_proof, second]):
            current = deepcopy(base)
            current["screening"]["proofs"] = list(proofs)
            receipt = wire.coupled_certificate(current)
            rows = receipt["proof_assessments"]
            first_global = next(i for i, p in enumerate(proofs) if p["kind"] == "infeasibility")
            self.assertEqual(len(rows), 3)
            self.assertEqual(receipt["selection"]["retained"], ["A", "B"])
            for i, row in enumerate(rows):
                self.assertEqual((row["input_index"], row["supplied_id"]), (i, proofs[i]["id"]))
                self.assertEqual(row["check"]["status"], "verified" if i == first_global else "not_checked")

    def test_stale_duplicate_cannot_borrow_valid_occurrence_status(self):
        value = problem()
        valid = proof_for(value)
        stale = dict(deepcopy(valid), id="stale", instance_digest="0" * 64)
        other = dict(deepcopy(valid), id="valid-second")
        value["screening"]["proofs"] = [stale, valid, other]
        value["screening"]["limits"]["max_witness_pairs"] = 0
        receipt = wire.coupled_certificate(value)
        rows = [row for row in receipt["proof_assessments"] if row["source"] == "supplied"]
        self.assertEqual([r["input_index"] for r in rows], [0, 1, 2])
        self.assertEqual([r["check"]["status"] for r in rows], ["rejected", "verified", "verified"])
        self.assertIsNone(rows[0]["certificate_digest"])
        self.assertEqual(rows[1]["certificate_digest"], rows[2]["certificate_digest"])
        self.assertNotEqual(rows[1]["wire_proof_digest"], rows[2]["wire_proof_digest"])

    def test_nonempty_zero_dimensional_world_differs_from_missing_point(self):
        value = problem()
        value["latent_variables"] = []
        for row in value["candidates"]:
            row["score"]["coefficients"] = []
        value["screening"]["consistency_point"] = []
        active = wire.coupled_certificate(value)
        self.assertEqual(active["selection"]["retained"], ["B"])
        value["screening"]["consistency_point"] = None
        inactive = wire.coupled_certificate(value)
        self.assertEqual(inactive["selection"]["retained"], ["A", "B"])
        self.assertEqual(inactive["diagnostics"]["box_selection_diagnostic"]["retained"], ["B"])

    def test_partial_truth_exact_oracle_on_144_synthetic_patterns(self):
        value = problem()
        value["scenario"]["constraints"] = {"g": {"unit": "margin", "reference": "test"}}
        for candidate in value["candidates"]:
            candidate["constraints"] = {"g": {"coefficients": ["0"], "constant": "-1"}}
        sealed = truth_for(value, [])
        possibilities = list(itertools.product((None, "-1", "0", "1"), (None, "-1", "1")))
        for left, right in itertools.product(possibilities, repeat=2):
            rows = [{"id": cid, "score": score, "constraints": {"g": margin}}
                    for cid, (score, margin) in zip(("A", "B"), (left, right))]
            report = wire.coupled_replay_report(value, dict(sealed, outcomes=rows))
            audit = report["outcome_audit"]
            complete = all(score is not None and margin is not None for score, margin in (left, right))
            feasible = {row["id"]: Fraction(row["score"]) for row in rows
                        if row["score"] is not None and row["constraints"]["g"] is not None
                        and Fraction(row["constraints"]["g"]) <= 0}
            expected = sorted(cid for cid, score in feasible.items() if score == min(feasible.values())) if complete and feasible else None
            self.assertEqual(audit["true_minimizer_ids"], expected)
            self.assertEqual(audit["all_true_minimizers_retained"],
                             all(cid in report["decision"]["selection"]["retained"] for cid in expected)
                             if expected is not None else None)
            if complete and not feasible:
                self.assertEqual(audit["retention_status"], "undefined_no_feasible_candidate")
            for row in rows:
                expected_feasible = None if row["constraints"]["g"] is None else Fraction(row["constraints"]["g"]) <= 0
                self.assertIs(audit["per_candidate"][row["id"]]["true_feasible"], expected_feasible)

    def test_stale_proof_does_not_bypass_numeric_lexical_preflight(self):
        value = problem()
        proof = proof_for(value)
        proof["instance_digest"] = "0" * 64
        proof["improvement"]["upper"] = "1" * 513
        value["screening"]["proofs"] = [proof]
        with patch.object(wire, "Fraction", side_effect=AssertionError("preflight must run first")):
            with self.assertRaises(ValueError):
                wire.coupled_certificate(value)

    def test_invalid_problem_never_reads_application_outcome_bytes(self):
        raw_problem = b'{}'
        frame = worker._frame("replay", raw_problem, b'not even valid JSON')
        boundary = frame.index(b"\n") + 1 + len(raw_problem)
        class Stream(io.BytesIO):
            def read(self, size=-1):
                if self.tell() >= boundary:
                    raise AssertionError("invalid problem must fail before outcome loader")
                return super().read(size)
        with self.assertRaises(ValueError):
            worker._dispatch(Stream(frame))

    def test_replay_seal_changes_with_limits_and_rejects_old_outcomes(self):
        value = problem()
        outcomes = truth_for(value, [{"id": "A", "score": "1", "constraints": {}},
                                    {"id": "B", "score": "0", "constraints": {}}])
        old = wire.coupled_domains(value)
        value["screening"]["limits"]["max_witness_pairs"] = 0
        new = wire.coupled_domains(value)
        self.assertEqual(old["instance_digest"], new["instance_digest"])
        self.assertNotEqual(old["problem_digest"], new["problem_digest"])
        with self.assertRaisesRegex(ValueError, "sealed coupled decision"):
            wire.coupled_replay_report(value, outcomes)

    def test_duplicate_transport_lengths_reject_before_document_read(self):
        header = ('{"schema":"' + worker.TRANSPORT_SCHEMA + '","operation":"select",'
                  '"problem_bytes":1,"problem_bytes":2,"outcome_bytes":null}\n').encode()
        class Stream(io.BytesIO):
            def read(self, size=-1):
                raise AssertionError("duplicate framing must reject before document reads")
        with self.assertRaisesRegex(ValueError, "duplicate worker header"):
            worker._dispatch(Stream(header))

    def test_public_worker_rejects_missing_or_corrupt_seals_without_stale_success(self):
        value = problem()
        selected = wire.coupled_certificate(value)
        domains = wire.coupled_domains(value)
        outcomes = truth_for(value, [{"id": "A", "score": "1", "constraints": {}},
                                    {"id": "B", "score": "0", "constraints": {}}])
        replay = wire.coupled_replay_report(value, outcomes)
        bad_selection = deepcopy(selected)
        bad_selection["selection"]["retained"] = ["A", "B"]
        bad_replay = deepcopy(replay)
        bad_replay["decision"]["selection"] = {"retained": ["A", "B"]}
        bad_domains = deepcopy(domains)
        del bad_domains["domains_digest"]
        cases = [("select", {"schema": worker.EXPECTED_SCHEMAS["select"]}),
                 ("select", bad_selection), ("domains", bad_domains), ("replay", bad_replay)]
        for operation, result in cases:
            envelope = json.dumps({"schema": worker.TRANSPORT_SCHEMA, "ok": True, "result": result}).encode()
            with patch.object(worker, "guard_available", return_value=True), \
                 patch.object(worker, "_bounded_process", return_value=(0, envelope)):
                with self.assertRaises(worker.CoupledWorkerError) as error:
                    worker.run_coupled(operation, "{}", "{}" if operation == "replay" else None)
            self.assertEqual(error.exception.code, "worker_invalid_response")
            self.assertFalse(error.exception.payload()["error"]["decision_receipt_available"])
        self.assertTrue(worker._SLOT.acquire(blocking=False))
        worker._SLOT.release()


@unittest.skipUnless(worker.guard_available(), "Linux resource guards required")
class CoupledWorkerIndependentReview(unittest.TestCase):
    def test_real_worker_replay_keeps_false_common_world_failure_visible(self):
        value = problem()
        outcomes = truth_for(value, [{"id": "A", "score": "1", "constraints": {}},
                                    {"id": "B", "score": "2", "constraints": {}}], ["0"])
        result = worker.run_coupled("replay", json.dumps(value), json.dumps(outcomes))
        self.assertEqual(result["decision"]["selection"]["retained"], ["B"])
        self.assertEqual(result["outcome_audit"]["lost_optimum_ids"], ["A"])
        self.assertIs(result["outcome_audit"]["all_true_minimizers_retained"], False)
        self.assertEqual(result["diagnostics"]["marginal_coverage"]["score_coverage"]["rate"], "1")
        self.assertEqual(result["provided_world_audit"]["status"], "provided_point_mismatch")
        certificate = result["decision"]["certificate"]
        self.assertEqual(certificate["certificate_digest"],
                         digest({k: v for k, v in certificate.items() if k != "certificate_digest"}))

    def test_exited_leader_does_not_leave_pipe_holding_descendant_running(self):
        with tempfile.TemporaryDirectory() as directory:
            pid_path = Path(directory) / "synthetic-child.pid"
            body = ("import os,time\nfrom pathlib import Path\n"
                    "pid=os.fork()\nif pid:\n os._exit(0)\n"
                    f"Path({str(pid_path)!r}).write_text(str(os.getpid()))\n"
                    "time.sleep(8)\n")
            child_pid = None
            try:
                with self.assertRaises(worker.CoupledWorkerError) as result:
                    worker._bounded_process(b"", worker._ProcessLimits(wall_seconds=0.6), body=body)
                self.assertEqual(result.exception.code, "worker_timeout")
                child_pid = int(pid_path.read_text())
                status = Path("/proc") / str(child_pid) / "stat"
                # A dead zombie may briefly remain under container init; it is
                # not a running leaked child. Allow signal delivery to settle.
                deadline = time.monotonic() + 1
                while status.exists() and status.read_text().split()[2] != "Z" and time.monotonic() < deadline:
                    time.sleep(0.01)
                self.assertTrue(not status.exists() or status.read_text().split()[2] == "Z",
                                "worker-owned descendant remained running after timeout")
            finally:
                if child_pid is None and pid_path.exists():
                    child_pid = int(pid_path.read_text())
                if child_pid is not None:
                    try:
                        os.kill(child_pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass


if __name__ == "__main__":
    unittest.main()
