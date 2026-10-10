"""Shared bounded Linux process boundary for coupled, projection and statistical work.

The public entry point accepts raw documents, never Python code or a command.
Only a completed successful child response becomes a receipt. The pure kernel's
proof budget is separate from these process, input, and output limits.
"""
from dataclasses import dataclass
import json
import math
import os
from pathlib import Path
import selectors
import signal
import subprocess
import sys
import threading
import time

from .evidence import digest


TRANSPORT_SCHEMA = "lupine.discovery.coupled.worker.v1"
MAX_DOCUMENT_BYTES = 256 * 1024
MAX_CERTIFICATE_BYTES = 2 * 1024 * 1024
MAX_HEADER_BYTES = 512
EXPECTED_SCHEMAS = {
    "select": "lupine.discovery.coupled_certificate.v1",
    "domains": "lupine.discovery.coupled_domains.v1",
    "replay": "lupine.discovery.coupled_replay.v1",
}
VERIFICATION_SCHEMA = "lupine.discovery.verification.v1"
OPERATIONS = frozenset((*EXPECTED_SCHEMAS, "verify"))
DECISION_POOL_SCHEMAS = {
    "select": "lupine.discovery.decision_pool_certificate.v1",
    "replay": "lupine.discovery.decision_pool_replay.v1",
}
PROJECTION_SCHEMAS = {
    "select": "lupine.discovery.projection_certificate.v1",
    "replay": "lupine.discovery.projection_replay.v1",
}
_SLOT = threading.Lock()


class CoupledWorkerError(RuntimeError):
    """Safe structured failure; it deliberately carries no partial receipt."""

    def __init__(self, code, message, http_status=503):
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status

    def payload(self):
        return {"error": {"code": self.code, "message": self.message,
                          "decision_receipt_available": False}}


@dataclass(frozen=True)
class _ProcessLimits:
    wall_seconds: float = 10
    cpu_seconds: int = 5
    address_space_bytes: int = 256 * 1024 * 1024
    output_bytes: int = 2 * 1024 * 1024
    stderr_bytes: int = 16 * 1024

    def __post_init__(self):
        if (isinstance(self.wall_seconds, bool) or not isinstance(self.wall_seconds, (int, float))
                or not math.isfinite(self.wall_seconds) or self.wall_seconds <= 0):
            raise ValueError("worker wall limit must be finite and positive")
        for name in ("cpu_seconds", "address_space_bytes", "output_bytes", "stderr_bytes"):
            value = getattr(self, name)
            if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
                raise ValueError(f"{name} must be a positive integer")


DEFAULT_LIMITS = _ProcessLimits()


def guard_available():
    """Capability check only; the child must still successfully set each limit."""
    if sys.platform != "linux":
        return False
    try:
        import resource
        return all(hasattr(resource, name) for name in ("RLIMIT_CPU", "RLIMIT_AS", "RLIMIT_CORE"))
    except ImportError:
        return False


def _document_bytes(raw, label, maximum=MAX_DOCUMENT_BYTES):
    if not isinstance(raw, (str, bytes)):
        raise CoupledWorkerError("invalid_input", f"{label} must be a raw JSON document.", 400)
    # Check text length first, avoiding an arbitrarily large encoding allocation.
    if len(raw) > maximum:
        raise CoupledWorkerError("input_limit", f"{label} exceeds {maximum} bytes.", 413)
    try:
        encoded = raw.encode("utf-8") if isinstance(raw, str) else raw
    except UnicodeError:
        raise CoupledWorkerError("invalid_input", f"{label} is not valid UTF-8.", 400) from None
    if len(encoded) > maximum:
        raise CoupledWorkerError("input_limit", f"{label} exceeds {maximum} bytes.", 413)
    return encoded


def _frame(operation, raw_problem, raw_outcomes, raw_certificate=None):
    if not isinstance(operation, str) or operation not in OPERATIONS:
        raise CoupledWorkerError("invalid_operation", "Unsupported coupled operation.", 400)
    if (operation == "replay") != (raw_outcomes is not None):
        raise CoupledWorkerError("invalid_input", "Only replay requires a separate outcome document.", 400)
    if (operation == "verify") != (raw_certificate is not None):
        raise CoupledWorkerError("invalid_input", "Only verify requires a separate certificate document.", 400)
    problem = _document_bytes(raw_problem, "Problem")
    outcomes = None if raw_outcomes is None else _document_bytes(raw_outcomes, "Outcomes")
    certificate = None if raw_certificate is None else _document_bytes(
        raw_certificate, "Certificate", MAX_CERTIFICATE_BYTES)
    header = {"schema": TRANSPORT_SCHEMA, "operation": operation,
              "problem_bytes": len(problem), "outcome_bytes": None if outcomes is None else len(outcomes)}
    if operation == "verify":
        header["certificate_bytes"] = len(certificate)
    # Length framing keeps raw documents intact, without JSON parse/reserialize
    # or escape expansion. The child reads outcomes only when replay asks for them.
    return (json.dumps(header, separators=(",", ":")).encode("ascii") + b"\n" + problem
            + (outcomes or b"") + (certificate or b""))


def _child_command(limits, body=None):
    """Trusted internal bootstrap; body exists only for isolated guard tests."""
    entry = body if body is not None else (
        "from lupine_discovery.coupled_worker import _child_main\n_child_main()\n")
    unavailable = json.dumps({"schema": TRANSPORT_SCHEMA, "ok": False, "error": {
        "code": "guard_unavailable", "message": "Required process limits could not be enforced."}})
    bootstrap = (
        "import sys\n"
        "try:\n"
        " import resource\n"
        f" resource.setrlimit(resource.RLIMIT_CPU, ({limits.cpu_seconds}, {limits.cpu_seconds}))\n"
        f" resource.setrlimit(resource.RLIMIT_AS, ({limits.address_space_bytes}, {limits.address_space_bytes}))\n"
        " resource.setrlimit(resource.RLIMIT_CORE, (0, 0))\n"
        "except Exception:\n"
        f" sys.stdout.write({unavailable!r})\n"
        " sys.stdout.flush()\n"
        " raise SystemExit(78)\n"
        f"sys.path.insert(0, {str(Path(__file__).resolve().parent.parent)!r})\n"
        + entry
    )
    # -I ignores Python environment variables and user paths; -S avoids startup
    # site hooks before the limits. Add only this installed package's source root.
    return [sys.executable, "-I", "-S", "-c", bootstrap]


def _terminate(process):
    # The session leader may already have exited while a descendant still owns
    # a pipe. Kill the group regardless of the leader's return code, then reap.
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    process.wait(timeout=1)


def _bounded_process(frame, limits=DEFAULT_LIMITS, *, body=None):
    """Read/write bounded chunks under one deadline; never use communicate()."""
    if not guard_available():
        raise CoupledWorkerError("guard_unavailable", "Coupled HTTP processing requires Linux CPU and memory guards.")
    deadline = time.monotonic() + limits.wall_seconds
    try:
        process = subprocess.Popen(
            _child_command(limits, body), stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, start_new_session=True, close_fds=True, cwd="/",
            env={"LANG": "C.UTF-8", "LC_ALL": "C.UTF-8", "TZ": "UTC"}, bufsize=0)
    except OSError:
        raise CoupledWorkerError("worker_start_failed", "The guarded worker could not start.") from None
    selector = selectors.DefaultSelector()
    stdout, stderr = bytearray(), bytearray()
    offset = 0
    try:
        for stream, event, role in ((process.stdin, selectors.EVENT_WRITE, "stdin"),
                                    (process.stdout, selectors.EVENT_READ, "stdout"),
                                    (process.stderr, selectors.EVENT_READ, "stderr")):
            os.set_blocking(stream.fileno(), False)
            selector.register(stream, event, role)
        while selector.get_map():
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise CoupledWorkerError("worker_timeout", "Coupled processing exceeded its wall-time limit.")
            for key, _ in selector.select(min(remaining, 0.05)):
                stream, role = key.fileobj, key.data
                if role == "stdin":
                    if offset < len(frame):
                        try:
                            offset += os.write(stream.fileno(), memoryview(frame)[offset:offset + 65536])
                        except BlockingIOError:
                            continue
                        except BrokenPipeError:
                            offset = len(frame)
                    if offset == len(frame):
                        selector.unregister(stream)
                        stream.close()
                    continue
                buffer = stdout if role == "stdout" else stderr
                cap = limits.output_bytes if role == "stdout" else limits.stderr_bytes
                try:
                    chunk = os.read(stream.fileno(), min(65536, cap - len(buffer) + 1))
                except BlockingIOError:
                    continue
                if not chunk:
                    selector.unregister(stream)
                    stream.close()
                else:
                    buffer.extend(chunk)
                    if len(buffer) > cap:
                        raise CoupledWorkerError("worker_output_limit", "Coupled processing exceeded its bounded output limit.")
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise CoupledWorkerError("worker_timeout", "Coupled processing exceeded its wall-time limit.")
        try:
            process.wait(timeout=remaining)
        except subprocess.TimeoutExpired:
            raise CoupledWorkerError("worker_timeout", "Coupled processing exceeded its wall-time limit.") from None
        return process.returncode, bytes(stdout)
    finally:
        selector.close()
        _terminate(process)
        for stream in (process.stdin, process.stdout, process.stderr):
            if not stream.closed:
                stream.close()


def _response(returncode, output):
    try:
        def reject_number(_):
            raise ValueError("worker response must preserve exact numbers")
        def unique(pairs):
            value = {}
            for key, item in pairs:
                if key in value:
                    raise ValueError("duplicate worker response key")
                value[key] = item
            return value
        value = json.loads(output, object_pairs_hook=unique,
                           parse_float=reject_number, parse_constant=reject_number)
        if not isinstance(value, dict) or value.get("schema") != TRANSPORT_SCHEMA or type(value.get("ok")) is not bool:
            raise ValueError("wrong worker envelope")
    except (ValueError, UnicodeError, RecursionError):
        if returncode:
            raise CoupledWorkerError("worker_crashed", "The coupled worker terminated without a complete receipt.") from None
        raise CoupledWorkerError("worker_invalid_response", "The coupled worker returned no valid complete response.", 502) from None
    if value["ok"] is False:
        error = value.get("error")
        if not isinstance(error, dict) or not isinstance(error.get("code"), str) or not isinstance(error.get("message"), str):
            raise CoupledWorkerError("worker_invalid_response", "The coupled worker returned an invalid failure response.", 502)
        statuses = {"invalid_input": 400, "input_limit": 413}
        raise CoupledWorkerError(error["code"], error["message"][:512], statuses.get(error["code"], 503))
    # Even a well-formed success envelope is discarded if the process crashed
    # after writing it. Partial output never becomes a stale/last-good receipt.
    if returncode:
        raise CoupledWorkerError("worker_crashed", "The coupled worker terminated before completing its receipt.")
    if not isinstance(value.get("result"), dict):
        raise CoupledWorkerError("worker_invalid_response", "The coupled worker returned an invalid result.", 502)
    return value["result"]


def run_coupled(operation, raw_problem, raw_outcomes=None, *, raw_certificate=None):
    """Run one coupled/projection/statistical operation under the same hard guards.

    There is one nonblocking slot per parent process. Request inputs cannot
    choose commands, process limits, environment variables, or package paths.
    """
    frame = _frame(operation, raw_problem, raw_outcomes, raw_certificate)
    if not guard_available():
        raise CoupledWorkerError("guard_unavailable", "Coupled HTTP processing requires Linux CPU and memory guards.")
    if not _SLOT.acquire(blocking=False):
        raise CoupledWorkerError("worker_busy", "Another coupled operation is running; try again when it completes.", 429)
    try:
        result = _response(*_bounded_process(frame))
        try:
            _validate_receipt(operation, result)
            _bind_decision_pool_request(operation, result, raw_problem, raw_outcomes, raw_certificate)
        except (AttributeError, KeyError, TypeError, ValueError, RecursionError):
            raise CoupledWorkerError("worker_invalid_response", "The worker returned a malformed result.", 502) from None
        return result
    finally:
        _SLOT.release()


def _bind_decision_pool_request(operation, result, raw_problem, raw_outcomes, raw_certificate):
    """Reject recycled statistical receipts after the guarded decision is sealed.

    Only bounded JSON and canonical identities are reconstructed here. Protocol,
    calibration, selection and outcome assessment stay inside the child.
    """
    from .coupled_io import loads_coupled, preflight_json_text
    from .serialization import loads
    # Determine both sides from bounded JSON: a recycled old-mode receipt must
    # not bypass this new-mode check merely by carrying an old schema label.
    statistical_result = result.get("schema") in DECISION_POOL_SCHEMAS.values()
    problem = loads_coupled(raw_problem)
    statistical_input = isinstance(problem, dict) and problem.get("schema") == "lupine.discovery.decision_pool_problem.v1"
    if not statistical_input:
        if statistical_result:
            raise ValueError("statistical worker response does not match the input mode")
        return
    problem_digest = digest(problem)
    if operation == "verify":
        supplied = loads(preflight_json_text(raw_certificate, max_bytes=MAX_CERTIFICATE_BYTES, max_depth=32))
        _validate_receipt("select", supplied)
        if (supplied.get("schema") != DECISION_POOL_SCHEMAS["select"]
                or supplied.get("problem_digest") != problem_digest
                or result.get("certificate_digest") != supplied.get("certificate_digest")):
            raise ValueError("statistical verification does not match the original problem and receipt")
    else:
        if result.get("schema") != DECISION_POOL_SCHEMAS.get(operation) or result.get("problem_digest") != problem_digest:
            raise ValueError("statistical worker response does not match the original problem")
        if operation == "replay":
            # _validate_receipt has already checked the complete original decision.
            outcomes = loads_coupled(raw_outcomes)
            if result.get("outcomes_digest") != digest(outcomes):
                raise ValueError("statistical replay does not match the submitted future outcomes")


def _validate_receipt(operation, result):
    """Check completed transport seals; this is not mathematical verification."""
    if not isinstance(result, dict):
        raise CoupledWorkerError("worker_invalid_response", "The worker returned an invalid receipt object.", 502)
    def checksum(value):
        return isinstance(value, str) and len(value) == 64 and all(c in "0123456789abcdef" for c in value)
    def sealed(value, key):
        return (isinstance(value, dict) and checksum(value.get(key))
                and value[key] == digest({k: v for k, v in value.items() if k != key}))
    def same(left, right):
        return left == right and digest(left) == digest(right)
    if operation == "verify":
        valid = (set(result) == {"schema", "verified", "scope", "physical_attestation", "certificate_digest"}
                 and result.get("schema") == VERIFICATION_SCHEMA
                 and result.get("verified") is True
                 and result.get("scope") == "identity_and_exact_runtime_recomputation_only"
                 and result.get("physical_attestation") == "not_established_by_this_program"
                 and checksum(result.get("certificate_digest")))
        if not valid:
            raise CoupledWorkerError("worker_invalid_response", "The worker returned no complete verification result.", 502)
        return
    if result.get("schema") == DECISION_POOL_SCHEMAS.get(operation):
        from .decision_pool_transport import validate_decision_pool_receipt
        validate_decision_pool_receipt(operation, result)
        return
    if result.get("schema") == PROJECTION_SCHEMAS.get(operation):
        _validate_projection_receipt(operation, result, checksum, sealed, same)
        return
    valid = result.get("schema") == EXPECTED_SCHEMAS[operation] and checksum(result.get("problem_digest"))
    if operation == "select":
        valid = (valid and sealed(result, "certificate_digest")
                 and isinstance(result.get("selection"), dict) and isinstance(result.get("coupling"), dict)
                 and isinstance(result.get("model_identity"), dict))
    elif operation == "domains":
        valid = (valid and sealed(result, "domains_digest")
                 and checksum(result.get("instance_digest")) and checksum(result.get("kernel_model_digest"))
                 and isinstance(result.get("common_domain"), dict) and isinstance(result.get("candidate_domains"), dict))
    else:
        decision = result.get("decision", {})
        certificate = decision.get("certificate", {}) if isinstance(decision, dict) else {}
        try:
            _validate_receipt("select", certificate)
        except CoupledWorkerError:
            valid = False
        valid = (valid and checksum(result.get("outcomes_digest"))
                 and result.get("problem_digest") == certificate.get("problem_digest")
                 and result.get("certificate_digest") == certificate.get("certificate_digest")
                 and decision.get("selection") == certificate.get("selection")
                 and isinstance(result.get("outcome_audit"), dict)
                 and isinstance(result.get("provided_world_audit"), dict))
    if not valid:
        raise CoupledWorkerError("worker_invalid_response", "The worker returned no complete, sealed result for this operation.", 502)


def _validate_projection_receipt(operation, result, checksum, sealed, same):
    """Bind the full projection relation, derived decision and outer replay.

    This validates transport identity only. Preparation and arithmetic happen
    exclusively in the isolated child; no model is reconstructed in the parent.
    """
    valid = checksum(result.get("problem_digest"))
    if operation == "select":
        projection = result.get("projection")
        selection = result.get("selection")
        valid = valid and sealed(result, "certificate_digest") and isinstance(projection, dict)
        valid = valid and isinstance(selection, dict) and isinstance(result.get("execution"), dict)
        if valid:
            relation = projection.get("relation_record")
            valid = (isinstance(relation, dict) and checksum(projection.get("input_digest"))
                     and checksum(projection.get("relation_digest"))
                     and projection["relation_digest"] == digest(relation)
                     and relation.get("input_digest") == projection["input_digest"]
                     and relation.get("status") == projection.get("build_status")
                     and isinstance(projection.get("reasons"), list)
                     and result.get("physical_attestation") == "not_established_by_this_program")
        if valid:
            declarations = relation.get("declarations", {})
            candidates = declarations.get("candidates") if isinstance(declarations, dict) else None
            valid = (isinstance(declarations, dict) and projection["input_digest"] == digest(declarations)
                     and isinstance(candidates, list) and all(isinstance(row, dict)
                     and isinstance(row.get("candidate_id"), str) for row in candidates))
        if valid:
            candidate_ids = sorted(row["candidate_id"] for row in candidates)
            prepared, nested = result.get("prepared_problem"), result.get("coupled_certificate")
            if projection["build_status"] == "unsupported_all_retained":
                empty = {key: [] for key in ("certified_feasible", "interval_infeasible", "interval_dominated",
                                            "coupled_infeasible", "coupled_dominated")}
                expected = {"retained": candidate_ids, **empty, "dominance_witnesses": {}}
                valid = (result.get("status") == "unsupported_all_retained" and prepared is None and nested is None
                         and bool(projection["reasons"]) and same(selection, expected)
                         and result["execution"].get("kernel_operations_used") == 0
                         and type(result["execution"].get("kernel_operations_used")) is int)
            elif projection["build_status"] == "finite_conditional":
                valid = (isinstance(prepared, dict) and isinstance(nested, dict)
                         and prepared.get("schema") == "lupine.discovery.coupled_problem.v1"
                         and nested.get("schema") == EXPECTED_SCHEMAS["select"])
                if valid:
                    _validate_receipt("select", nested)
                    prepared_ids = prepared.get("candidates", [])
                    common = prepared.get("common_world")
                    valid = (isinstance(prepared_ids, list) and isinstance(common, dict)
                             and all(isinstance(row, dict) and isinstance(row.get("id"), str) for row in prepared_ids)
                             and sorted(row["id"] for row in prepared_ids) == candidate_ids
                             and same(selection, nested["selection"])
                             and nested["problem_digest"] == digest(prepared)
                             and result.get("status") == nested["coupling"].get("status")
                             and relation.get("kernel_model_digest") == nested["model_identity"].get("kernel_model_digest")
                             and common.get("reference") ==
                                 "projection_relation:" + projection["relation_digest"])
            else:
                valid = False
    elif operation == "replay":
        decision = result.get("decision")
        nested = decision.get("certificate") if isinstance(decision, dict) else None
        valid = (valid and sealed(result, "replay_digest") and isinstance(nested, dict)
                 and nested.get("schema") == PROJECTION_SCHEMAS["select"])
        if valid:
            _validate_receipt("select", nested)
            valid = (checksum(result.get("outcomes_digest"))
                     and result["problem_digest"] == nested["problem_digest"]
                     and result.get("certificate_digest") == nested["certificate_digest"]
                     and same(decision.get("selection"), nested["selection"])
                     and isinstance(result.get("outcome_audit"), dict)
                     and isinstance(result.get("provided_world_audit"), dict)
                     and isinstance(result.get("diagnostics"), dict))
            if valid and nested["prepared_problem"] is None:
                valid = (result["provided_world_audit"].get("status") == "unavailable_no_prepared_model"
                         and result["diagnostics"].get("box_selection_diagnostic") is None
                         and isinstance(result["diagnostics"].get("marginal_coverage"), dict)
                         and result["diagnostics"]["marginal_coverage"].get("status") == "unavailable_no_prepared_model")
    else:
        valid = False
    if not valid:
        raise CoupledWorkerError("worker_invalid_response", "The worker returned no complete, bound projection result.", 502)


def _read_exact(stream, length):
    data = bytearray()
    while len(data) < length:
        part = stream.read(min(65536, length - len(data)))
        if not part:
            raise ValueError("truncated worker input")
        data.extend(part)
    return bytes(data)


def _dispatch(stream):
    header_raw = stream.readline(MAX_HEADER_BYTES + 1)
    if len(header_raw) > MAX_HEADER_BYTES or not header_raw.endswith(b"\n"):
        raise ValueError("invalid worker framing")
    def unique(pairs):
        value = {}
        for key, item in pairs:
            if key in value:
                raise ValueError("duplicate worker header key")
            value[key] = item
        return value
    header = json.loads(header_raw, object_pairs_hook=unique)
    if (not isinstance(header, dict) or header.get("schema") != TRANSPORT_SCHEMA
            or not isinstance(header.get("operation"), str) or header["operation"] not in OPERATIONS):
        raise ValueError("invalid worker header")
    expected_fields = {"schema", "operation", "problem_bytes", "outcome_bytes"}
    if header["operation"] == "verify":
        expected_fields.add("certificate_bytes")
    if set(header) != expected_fields:
        raise ValueError("invalid worker header fields")
    for key in ("problem_bytes", "outcome_bytes"):
        value = header[key]
        if key == "outcome_bytes" and value is None:
            continue
        if type(value) is not int or not 0 <= value <= MAX_DOCUMENT_BYTES:
            raise ValueError("worker document size exceeds limit")
    if "certificate_bytes" in header and (type(header["certificate_bytes"]) is not int
            or not 0 <= header["certificate_bytes"] <= MAX_CERTIFICATE_BYTES):
        raise ValueError("worker certificate size exceeds limit")
    operation = header["operation"]
    if (operation == "replay") != (header["outcome_bytes"] is not None):
        raise ValueError("outcome framing does not match operation")
    from .coupled_io import loads_coupled, coupled_certificate, coupled_domains, coupled_replay_report
    problem = loads_coupled(_read_exact(stream, header["problem_bytes"]))
    projection = isinstance(problem, dict) and problem.get("schema") == "lupine.discovery.projection_problem.v1"
    statistical = isinstance(problem, dict) and problem.get("schema") == "lupine.discovery.decision_pool_problem.v1"
    if statistical:
        from .decision_pool_io import loads_decision_pool, decision_pool_certificate, decision_pool_replay_report
        if operation == "domains":
            raise ValueError("statistical pools do not expose coupled proof domains")
    if projection:
        from .projection_io import loads_projection, projection_certificate, projection_replay_report
        if operation == "domains":
            raise ValueError("projection v1 does not accept supplied proofs or expose projection domains")

    def no_trailing_data():
        if stream.read(1):
            raise ValueError("trailing worker input")

    if operation == "replay":
        def load_outcomes():
            raw = _read_exact(stream, header["outcome_bytes"])
            no_trailing_data()
            return (loads_decision_pool(raw) if statistical else
                    loads_projection(raw) if projection else loads_coupled(raw))
        if statistical:
            return decision_pool_replay_report(problem, load_outcomes)
        return (projection_replay_report(problem, load_outcomes) if projection
                else coupled_replay_report(problem, load_outcomes))
    if operation == "verify":
        if not projection and not statistical and (not isinstance(problem, dict)
                               or problem.get("schema") != "lupine.discovery.coupled_problem.v1"):
            raise ValueError("guarded verification accepts only coupled, projection or statistical-pool problems")
        from .cli import verify_certificate
        from .coupled_io import preflight_json_text
        from .serialization import loads
        raw = _read_exact(stream, header["certificate_bytes"])
        no_trailing_data()
        supplied = loads(preflight_json_text(raw, max_bytes=MAX_CERTIFICATE_BYTES, max_depth=32))
        return verify_certificate(problem, supplied)
    no_trailing_data()
    if statistical:
        return decision_pool_certificate(problem)
    if projection:
        return projection_certificate(problem)
    return coupled_certificate(problem) if operation == "select" else coupled_domains(problem)


def _child_main():
    try:
        result = _dispatch(sys.stdin.buffer)
        envelope = {"schema": TRANSPORT_SCHEMA, "ok": True, "result": result}
    except MemoryError:
        envelope = {"schema": TRANSPORT_SCHEMA, "ok": False, "error": {
            "code": "worker_memory_limit", "message": "Coupled processing exceeded its memory limit."}}
    except (ValueError, TypeError, UnicodeError, ZeroDivisionError, RecursionError) as exc:
        envelope = {"schema": TRANSPORT_SCHEMA, "ok": False, "error": {
            "code": "invalid_input", "message": str(exc)[:512]}}
    except Exception:
        envelope = {"schema": TRANSPORT_SCHEMA, "ok": False, "error": {
            "code": "worker_internal_error", "message": "Coupled processing failed; no decision receipt is available."}}
    # Stream encoding: parent caps bytes as they arrive and discards incomplete
    # output. It never needs an unbounded communicate() buffer to enforce a cap.
    encoder = json.JSONEncoder(ensure_ascii=True, allow_nan=False, separators=(",", ":"))
    for chunk in encoder.iterencode(envelope):
        sys.stdout.write(chunk)
    sys.stdout.flush()
