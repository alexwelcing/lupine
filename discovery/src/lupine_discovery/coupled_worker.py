"""Bounded Linux subprocess boundary for the local coupled workbench.

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
MAX_HEADER_BYTES = 512
EXPECTED_SCHEMAS = {
    "select": "lupine.discovery.coupled_certificate.v1",
    "domains": "lupine.discovery.coupled_domains.v1",
    "replay": "lupine.discovery.coupled_replay.v1",
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


def _document_bytes(raw, label):
    if not isinstance(raw, (str, bytes)):
        raise CoupledWorkerError("invalid_input", f"{label} must be a raw JSON document.", 400)
    # Check text length first, avoiding an arbitrarily large encoding allocation.
    if len(raw) > MAX_DOCUMENT_BYTES:
        raise CoupledWorkerError("input_limit", f"{label} exceeds 256 KiB.", 413)
    try:
        encoded = raw.encode("utf-8") if isinstance(raw, str) else raw
    except UnicodeError:
        raise CoupledWorkerError("invalid_input", f"{label} is not valid UTF-8.", 400) from None
    if len(encoded) > MAX_DOCUMENT_BYTES:
        raise CoupledWorkerError("input_limit", f"{label} exceeds 256 KiB.", 413)
    return encoded


def _frame(operation, raw_problem, raw_outcomes):
    if not isinstance(operation, str) or operation not in EXPECTED_SCHEMAS:
        raise CoupledWorkerError("invalid_operation", "Unsupported coupled operation.", 400)
    if (operation == "replay") != (raw_outcomes is not None):
        raise CoupledWorkerError("invalid_input", "Only replay requires a separate outcome document.", 400)
    problem = _document_bytes(raw_problem, "Problem")
    outcomes = None if raw_outcomes is None else _document_bytes(raw_outcomes, "Outcomes")
    header = {"schema": TRANSPORT_SCHEMA, "operation": operation,
              "problem_bytes": len(problem), "outcome_bytes": None if outcomes is None else len(outcomes)}
    # Length framing keeps raw documents intact, without JSON parse/reserialize
    # or escape expansion. The child reads outcomes only when replay asks for them.
    return json.dumps(header, separators=(",", ":")).encode("ascii") + b"\n" + problem + (outcomes or b"")


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


def run_coupled(operation, raw_problem, raw_outcomes=None):
    """Run one coupled operation under fixed hard guards, returning its receipt.

    There is one nonblocking slot per parent process. Request inputs cannot
    choose commands, process limits, environment variables, or package paths.
    """
    frame = _frame(operation, raw_problem, raw_outcomes)
    if not guard_available():
        raise CoupledWorkerError("guard_unavailable", "Coupled HTTP processing requires Linux CPU and memory guards.")
    if not _SLOT.acquire(blocking=False):
        raise CoupledWorkerError("worker_busy", "Another coupled operation is running; try again when it completes.", 429)
    try:
        result = _response(*_bounded_process(frame))
        _validate_receipt(operation, result)
        return result
    finally:
        _SLOT.release()


def _validate_receipt(operation, result):
    """Check completed transport seals; this is not mathematical verification."""
    if not isinstance(result, dict):
        raise CoupledWorkerError("worker_invalid_response", "The worker returned an invalid receipt object.", 502)
    def checksum(value):
        return isinstance(value, str) and len(value) == 64 and all(c in "0123456789abcdef" for c in value)
    def sealed(value, key):
        return (isinstance(value, dict) and checksum(value.get(key))
                and value[key] == digest({k: v for k, v in value.items() if k != key}))
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
    if (not isinstance(header, dict) or set(header) != {"schema", "operation", "problem_bytes", "outcome_bytes"}
            or header["schema"] != TRANSPORT_SCHEMA or not isinstance(header["operation"], str)
            or header["operation"] not in EXPECTED_SCHEMAS):
        raise ValueError("invalid worker header")
    for key in ("problem_bytes", "outcome_bytes"):
        value = header[key]
        if key == "outcome_bytes" and value is None:
            continue
        if type(value) is not int or not 0 <= value <= MAX_DOCUMENT_BYTES:
            raise ValueError("worker document size exceeds limit")
    operation = header["operation"]
    if (operation == "replay") != (header["outcome_bytes"] is not None):
        raise ValueError("outcome framing does not match operation")
    from .coupled_io import loads_coupled, coupled_certificate, coupled_domains, coupled_replay_report
    problem = loads_coupled(_read_exact(stream, header["problem_bytes"]))

    def no_trailing_data():
        if stream.read(1):
            raise ValueError("trailing worker input")

    if operation == "replay":
        def load_outcomes():
            raw = _read_exact(stream, header["outcome_bytes"])
            no_trailing_data()
            return loads_coupled(raw)
        return coupled_replay_report(problem, load_outcomes)
    no_trailing_data()
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
