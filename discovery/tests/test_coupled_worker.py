"""Exercise real bounded children and fail-closed worker transport behavior."""
import io
import json
import threading
import time
import types
import unittest
from unittest.mock import patch

from lupine_discovery import coupled_worker as worker


def envelope(result=None, *, ok=True, error=None):
    value = {"schema": worker.TRANSPORT_SCHEMA, "ok": ok}
    value["result" if ok else "error"] = result if ok else error
    return json.dumps(value).encode()


def sample_problem():
    return {"schema": "lupine.discovery.coupled_problem.v1", "scenario": {
        "id": "worker-shared-trend", "objective": {"direction": "minimize", "unit": "utility",
                                                        "reference": "synthetic fixture"}, "constraints": {}},
        "latent_variables": [{"id": "t", "bounds": ["0", "2"], "unit": "1",
                               "reference": "dimensionless synthetic coordinate"}],
        "candidates": [{"id": "A", "score": {"coefficients": ["1"], "constant": "1"}, "constraints": {}},
                       {"id": "B", "score": {"coefficients": ["1"], "constant": "0"}, "constraints": {}}],
        "rows": [], "common_world": {"claim": "one_common_latent_vector_represents_all_quantities",
                                      "premise_status": "assumed_unverified",
                                      "relation_basis": "declared_affine_assumption",
                                      "reference": "synthetic only"},
        "screening": {"consistency_point": ["0"], "proofs": [], "limits": {
            "max_operations": 100000, "max_certificate_terms": 512,
            "max_integer_bits": 2048, "max_witness_pairs": 4096}}}


class CoupledWorkerBoundaryTests(unittest.TestCase):
    def test_raw_input_caps_and_operations_reject_before_spawning(self):
        cases = [("select", "x" * (worker.MAX_DOCUMENT_BYTES + 1), None),
                 ("select", "\u20ac" * worker.MAX_DOCUMENT_BYTES, None),
                 ("select", "\ud800", None), ("select", {}, None),
                 ("shell", "{}", None), ([], "{}", None),
                 ("select", "{}", "{}"), ("replay", "{}", None)]
        with patch.object(worker, "_bounded_process") as process:
            for operation, raw, outcomes in cases:
                with self.subTest(operation=operation, raw_type=type(raw).__name__):
                    with self.assertRaises(worker.CoupledWorkerError) as result:
                        worker.run_coupled(operation, raw, outcomes)
                    self.assertFalse(result.exception.payload()["error"]["decision_receipt_available"])
            process.assert_not_called()

    def test_unsupported_guard_never_falls_back_to_parent_execution(self):
        with patch.object(worker, "guard_available", return_value=False), \
             patch.object(worker, "_bounded_process") as process:
            with self.assertRaises(worker.CoupledWorkerError) as result:
                worker.run_coupled("select", "{}")
            self.assertEqual(result.exception.code, "guard_unavailable")
            process.assert_not_called()

    def test_single_slot_rejects_overlap_and_releases_after_failure(self):
        started, finish = threading.Event(), threading.Event()
        errors = []
        def blocked(_frame):
            started.set()
            self.assertTrue(finish.wait(2))
            raise worker.CoupledWorkerError("synthetic_failure", "synthetic failure")
        def first():
            try:
                worker.run_coupled("select", "{}")
            except worker.CoupledWorkerError as error:
                errors.append(error.code)
        with patch.object(worker, "guard_available", return_value=True), \
             patch.object(worker, "_bounded_process", side_effect=blocked):
            thread = threading.Thread(target=first)
            thread.start()
            try:
                self.assertTrue(started.wait(2))
                with self.assertRaises(worker.CoupledWorkerError) as result:
                    worker.run_coupled("select", "{}")
                self.assertEqual((result.exception.code, result.exception.http_status), ("worker_busy", 429))
            finally:
                finish.set()
                thread.join(2)
            self.assertFalse(thread.is_alive())
        self.assertEqual(errors, ["synthetic_failure"])
        self.assertTrue(worker._SLOT.acquire(blocking=False))
        worker._SLOT.release()

    def test_worker_response_is_type_sensitive_and_never_uses_stale_success(self):
        success = envelope({"schema": worker.EXPECTED_SCHEMAS["select"], "receipt": "synthetic"})
        self.assertEqual(worker._response(0, success)["receipt"], "synthetic")
        for code, output in ((9, success), (0, b'{"partial":'), (0, success + b"garbage"),
                             (0, success.replace(b'"ok": true', b'"ok": 1')),
                             (0, envelope({"value": 0.1})), (0, envelope({"value": float("nan")})),
                             (0, b'{"schema":"wrong","ok":true,"result":{}}')):
            with self.subTest(returncode=code, output=output[:60]):
                with self.assertRaises(worker.CoupledWorkerError) as result:
                    worker._response(code, output)
                payload = result.exception.payload()
                self.assertEqual(set(payload), {"error"})
                self.assertFalse(payload["error"]["decision_receipt_available"])

    def test_framed_replay_defers_outcome_read_until_adapter_requests_it(self):
        problem, outcomes = b'{"problem_marker":1}', b'{"outcome_marker":2}'
        frame = worker._frame("replay", problem, outcomes)
        outcome_offset = frame.index(b"\n") + 1 + len(problem)
        events = []
        class GuardedStream(io.BytesIO):
            def read(self, size=-1):
                if self.tell() >= outcome_offset and "sealed" not in events:
                    raise AssertionError("outcome read before selection seal")
                return super().read(size)
        module = types.ModuleType("lupine_discovery.coupled_io")
        def parse(raw):
            value = json.loads(raw)
            events.append("outcomes_parsed" if "outcome_marker" in value else "problem_parsed")
            return value
        def replay(value, loader):
            self.assertEqual(value, {"problem_marker": 1})
            self.assertEqual(events, ["problem_parsed"])
            events.append("sealed")
            self.assertEqual(loader(), {"outcome_marker": 2})
            return {"finished": True}
        module.loads_coupled = parse
        module.coupled_certificate = module.coupled_domains = lambda _: self.fail("wrong dispatch")
        module.coupled_replay_report = replay
        with patch.dict("sys.modules", {module.__name__: module}):
            self.assertEqual(worker._dispatch(GuardedStream(frame)), {"finished": True})
        self.assertEqual(events, ["problem_parsed", "sealed", "outcomes_parsed"])

    def test_public_worker_rejects_wrong_operation_receipt(self):
        result = envelope({"schema": worker.EXPECTED_SCHEMAS["domains"]})
        with patch.object(worker, "guard_available", return_value=True), \
             patch.object(worker, "_bounded_process", return_value=(0, result)):
            with self.assertRaises(worker.CoupledWorkerError) as error:
                worker.run_coupled("select", "{}")
            self.assertEqual(error.exception.code, "worker_invalid_response")

    def test_public_worker_rejects_schema_only_and_unsealed_success(self):
        for operation, schema in worker.EXPECTED_SCHEMAS.items():
            for payload in ({"schema": schema}, {"schema": schema, "problem_digest": "0" * 64,
                            "certificate_digest": "1" * 64, "domains_digest": "2" * 64}):
                with self.subTest(operation=operation, payload=payload), \
                     patch.object(worker, "guard_available", return_value=True), \
                     patch.object(worker, "_bounded_process", return_value=(0, envelope(payload))):
                    with self.assertRaises(worker.CoupledWorkerError) as error:
                        worker.run_coupled(operation, "{}", "{}" if operation == "replay" else None)
                    self.assertEqual(error.exception.code, "worker_invalid_response")

    def test_internal_header_rejects_duplicate_operation(self):
        header = b'{"schema":"lupine.discovery.coupled.worker.v1","operation":"select","operation":"domains","problem_bytes":2,"outcome_bytes":null}\n{}'
        with self.assertRaisesRegex(ValueError, "duplicate worker header"):
            worker._dispatch(io.BytesIO(header))


@unittest.skipUnless(worker.guard_available(), "Linux resource guards required")
class CoupledWorkerProcessTests(unittest.TestCase):
    def execute(self, body, limits=None, frame=b""):
        return worker._response(*worker._bounded_process(
            frame, limits or worker._ProcessLimits(wall_seconds=3, cpu_seconds=2,
                                                 address_space_bytes=64 * 1024 * 1024), body=body))

    def test_real_limits_applied_before_helper_and_environment_isolated(self):
        body = ("import json, os, resource\n"
                "result={'cpu':resource.getrlimit(resource.RLIMIT_CPU),"
                "'memory':resource.getrlimit(resource.RLIMIT_AS),"
                "'core':resource.getrlimit(resource.RLIMIT_CORE),"
                "'inherited_secret':'LUPINE_WORKER_TEST_SECRET' in os.environ}\n"
                f"print(json.dumps({{'schema':{worker.TRANSPORT_SCHEMA!r},'ok':True,'result':result}}))\n")
        with patch.dict("os.environ", {"LUPINE_WORKER_TEST_SECRET": "must_not_enter_child"}):
            result = self.execute(body)
        self.assertEqual(result["cpu"], [2, 2])
        self.assertEqual(result["memory"], [64 * 1024 * 1024] * 2)
        self.assertEqual(result["core"], [0, 0])
        self.assertFalse(result["inherited_secret"])

    def test_real_wall_timeout_kills_child(self):
        started = time.monotonic()
        with self.assertRaises(worker.CoupledWorkerError) as result:
            self.execute("import time\ntime.sleep(3)\n", worker._ProcessLimits(wall_seconds=0.15))
        self.assertEqual(result.exception.code, "worker_timeout")
        self.assertLess(time.monotonic() - started, 2)

    def test_real_cpu_limit_terminates_busy_helper(self):
        with self.assertRaises(worker.CoupledWorkerError) as result:
            self.execute("while True: pass\n", worker._ProcessLimits(wall_seconds=4, cpu_seconds=1))
        self.assertEqual(result.exception.code, "worker_crashed")
        self.assertFalse(result.exception.payload()["error"]["decision_receipt_available"])

    def test_real_address_space_limit_denies_virtual_reservation_without_allocating_it(self):
        body = ("import json, mmap\n"
                "denied=False\n"
                "try:\n"
                " reservation=mmap.mmap(-1,128*1024*1024)\n"
                " reservation.close()\n"
                "except (OSError, MemoryError):\n"
                " denied=True\n"
                f"print(json.dumps({{'schema':{worker.TRANSPORT_SCHEMA!r},'ok':True,'result':{{'denied':denied}}}}))\n")
        self.assertTrue(self.execute(body)["denied"])

    def test_memory_exception_becomes_structured_failure(self):
        body = ("from lupine_discovery import coupled_worker as worker\n"
                "def exhausted(_):\n raise MemoryError()\n"
                "worker._dispatch=exhausted\nworker._child_main()\n")
        with self.assertRaises(worker.CoupledWorkerError) as result:
            self.execute(body)
        self.assertEqual(result.exception.code, "worker_memory_limit")
        self.assertEqual(set(result.exception.payload()), {"error"})

    def test_stdout_and_stderr_floods_are_stopped_while_reading(self):
        for descriptor in (1, 2):
            with self.subTest(descriptor=descriptor), self.assertRaises(worker.CoupledWorkerError) as result:
                self.execute(f"import os\nwhile True: os.write({descriptor},b'x'*4096)\n",
                             worker._ProcessLimits(wall_seconds=2, output_bytes=8192, stderr_bytes=8192))
            self.assertEqual(result.exception.code, "worker_output_limit")

    def test_child_crash_after_valid_json_does_not_return_receipt(self):
        success = envelope({"schema": worker.EXPECTED_SCHEMAS["select"], "receipt": "stale"})
        body = f"import os\nos.write(1,{success!r})\nos._exit(7)\n"
        with self.assertRaises(worker.CoupledWorkerError) as result:
            self.execute(body)
        self.assertEqual(result.exception.code, "worker_crashed")
        self.assertNotIn("stale", json.dumps(result.exception.payload()))

    def test_closed_pipes_do_not_escape_wall_deadline(self):
        body = "import os,time\nos.close(0)\nos.close(1)\nos.close(2)\ntime.sleep(3)\n"
        with self.assertRaises(worker.CoupledWorkerError) as result:
            self.execute(body, worker._ProcessLimits(wall_seconds=0.15))
        self.assertEqual(result.exception.code, "worker_timeout")

    def test_real_adapter_selection_and_domains_run_in_child(self):
        problem = sample_problem()
        receipt = worker.run_coupled("select", json.dumps(problem))
        self.assertEqual(receipt["selection"]["retained"], ["B"])
        self.assertEqual(receipt["coupling"]["status"], "conditional_screened")
        domains = worker.run_coupled("domains", json.dumps(problem))
        self.assertEqual(domains["schema"], worker.EXPECTED_SCHEMAS["domains"])
        self.assertEqual(domains["instance_digest"], receipt["model_identity"]["instance_digest"])


if __name__ == "__main__":
    unittest.main()
