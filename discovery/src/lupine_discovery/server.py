"""Local research workbench backed by the same exact engine as the CLI.

The server binds to loopback, stores no uploaded data, and performs no network
retrieval. It is a research preview, not a public multi-user hosting service.
"""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from importlib.resources import files
import json
import re
from urllib.parse import urlsplit

from .benchmarks import archived_reports, case_catalog, get_case, get_case_outcomes, run_known_answers
from .cli import certificate, replay_report
from .coupled_io import preflight_json_text
from .coupled_worker import CoupledWorkerError, MAX_CERTIFICATE_BYTES, MAX_DOCUMENT_BYTES, run_coupled
from .evidence import fields
from .serialization import encode, loads
from .study_planning import plan_pool_threshold, plan_zero_failure_resolution
from .finite_planning import plan_finite_zero_failure_resolution

MAX_BODY_BYTES = 2 * 1024 * 1024
MAX_PLANNING_BODY_BYTES = 4096
PLANNING_PATHS = frozenset({"/api/plan-pool", "/api/plan-zero-loss", "/api/plan-finite-zero-loss"})
# Verification accepts exported receipts larger than an input problem. Six
# bytes per source byte accommodates JSON string escaping in the outer envelope;
# the child still enforces the separate 256 KiB problem and 2 MiB receipt caps.
MAX_VERIFY_BODY_BYTES = 6 * (MAX_CERTIFICATE_BYTES + MAX_DOCUMENT_BYTES) + 1024
MAX_CANDIDATES = 5000
COUPLED_SCHEMA = "lupine.discovery.coupled_problem.v1"
PROJECTION_SCHEMA = "lupine.discovery.projection_problem.v1"
DECISION_POOL_SCHEMA = "lupine.discovery.decision_pool_problem.v1"
ASSETS = {"/": ("index.html", "text/html; charset=utf-8"),
          "/index.html": ("index.html", "text/html; charset=utf-8"),
          "/styles.css": ("styles.css", "text/css; charset=utf-8"),
          "/mpea.js": ("mpea.js", "text/javascript; charset=utf-8"),
          "/planner.js": ("planner.js", "text/javascript; charset=utf-8"),
          "/app.js": ("app.js", "text/javascript; charset=utf-8")}


def bounded_problem(problem):
    if not isinstance(problem, dict):
        raise ValueError("problem must be a JSON object")
    candidates = problem.get("candidates")
    if isinstance(candidates, list) and len(candidates) > MAX_CANDIDATES:
        raise ValueError(f"local workbench limit is {MAX_CANDIDATES} candidates")
    return problem


def coupled_problem(problem):
    return isinstance(problem, dict) and problem.get("schema") == COUPLED_SCHEMA


def guarded_problem(problem):
    return isinstance(problem, dict) and problem.get("schema") in {COUPLED_SCHEMA, PROJECTION_SCHEMA, DECISION_POOL_SCHEMA}


def raw_document(value):
    """Encode a legacy object envelope without changing its exact scalar values."""
    return json.dumps(value, ensure_ascii=True, allow_nan=False, separators=(",", ":"))


def select_problem(problem):
    problem = bounded_problem(problem)
    if problem.get("schema") == DECISION_POOL_SCHEMA:
        raise CoupledWorkerError("raw_problem_required",
            "Statistical-pool selection requires problem_raw JSON text.", 400)
    if guarded_problem(problem):
        return run_coupled("select", raw_document(problem))
    return certificate(problem)


def benchmark_report():
    result = {"known_answers": run_known_answers(), "archived": archived_reports(),
              "release_status": "research_preview_not_release_certified"}
    additional = files("lupine_discovery").joinpath("resources/additional-archived-v1.json")
    if additional.is_file():
        result["additional_archived"] = json.loads(additional.read_text(encoding="utf-8"))
    constrained = files("lupine_discovery").joinpath("resources/constrained-v1.json")
    if constrained.is_file():
        result["constrained_archived"] = json.loads(constrained.read_text(encoding="utf-8"))
    training = files("lupine_discovery").joinpath("resources/training-tail-v1.json")
    if training.is_file():
        result["training_tail"] = json.loads(training.read_text(encoding="utf-8"))
    mpea = files("lupine_discovery").joinpath("resources/mpea-t25-v1.json")
    if mpea.is_file():
        result["mpea_archived"] = json.loads(mpea.read_text(encoding="utf-8"))
    return result


class WorkbenchHandler(BaseHTTPRequestHandler):
    server_version = "LupineDiscoveryWorkbench"

    def log_message(self, _format, *_args):
        # Uploaded scientific inputs and request paths are not logged.
        pass

    def respond(self, status, payload, content_type="application/json; charset=utf-8"):
        body = payload if isinstance(payload, bytes) else json.dumps(
            payload, ensure_ascii=True, allow_nan=False, sort_keys=True).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; "
                         "style-src 'self'; img-src 'self' data:; connect-src 'self'; "
                         "object-src 'none'; frame-ancestors 'none'; base-uri 'none'")
        self.end_headers()
        self.wfile.write(body)

    def error(self, status, message):
        self.respond(status, {"error": {"message": message}})

    def valid_local_request(self):
        port = self.server.server_address[1]
        hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}
        host = self.headers.get("Host", "")
        if host not in hosts:
            self.error(403, "Use the loopback URL printed by the workbench.")
            return False
        origin = self.headers.get("Origin")
        if origin is not None and origin not in {"http://" + h for h in hosts}:
            self.error(403, "Cross-origin workbench requests are not accepted.")
            return False
        return True

    def do_GET(self):
        if not self.valid_local_request():
            return
        path = urlsplit(self.path).path
        try:
            if path in ASSETS:
                name, media = ASSETS[path]
                self.respond(200, files("lupine_discovery").joinpath("web", name).read_bytes(), media)
            elif path == "/api/health":
                self.respond(200, {"status": "ok", "mode": "local_research_preview"})
            elif path == "/api/catalog":
                cases = case_catalog()
                self.respond(200, {"cases": cases,
                                   "benchmark_summary": {"case_count": len(cases),
                                                         "physical_validation": "not_established"}})
            elif path == "/api/benchmarks":
                self.respond(200, benchmark_report())
            elif re.fullmatch(r"/api/cases/[a-z0-9_-]+", path):
                case_id = path.rsplit("/", 1)[-1]
                if case_id not in {case["id"] for case in case_catalog()}:
                    self.error(404, "Unknown benchmark case.")
                    return
                self.respond(200, get_case(case_id))
            else:
                self.error(404, "Not found.")
        except KeyError:
            self.error(404, "Unknown benchmark case.")
        except (OSError, ValueError, TypeError, ZeroDivisionError) as exc:
            self.error(400, str(exc))

    def do_POST(self):
        if not self.valid_local_request():
            return
        path = urlsplit(self.path).path
        if self.headers.get_content_type() != "application/json":
            self.error(415, "Send application/json.")
            return
        try:
            if self.headers.get("Transfer-Encoding"):
                raise ValueError("Chunked request bodies are not supported.")
            length = int(self.headers.get("Content-Length", "-1"))
            body_cap = (MAX_PLANNING_BODY_BYTES if path in PLANNING_PATHS else
                        MAX_VERIFY_BODY_BYTES if path == "/api/verify" else MAX_BODY_BYTES)
            if not 0 <= length <= body_cap:
                self.error(413, f"Send a JSON document of at most {body_cap} bytes.")
                return
            value = loads(preflight_json_text(self.rfile.read(length),
                                             max_bytes=body_cap, max_depth=32))
            if path == "/api/plan-pool":
                fields(value, ("calibration_count", "alpha", "cutoff"), ("iid_score_probability",))
                plan = plan_pool_threshold(value["calibration_count"], value["alpha"], value["cutoff"],
                                           value.get("iid_score_probability"))
                result = {"schema": "lupine.discovery.pool_threshold_plan.v1", "plan": encode(plan)}
            elif path == "/api/plan-zero-loss":
                fields(value, ("loss_ceiling", "significance", "maximum_evaluation_panels"))
                plan = plan_zero_failure_resolution(value["loss_ceiling"], value["significance"],
                                                     value["maximum_evaluation_panels"])
                result = {"schema": "lupine.discovery.zero_failure_resolution_plan.v1", "plan": encode(plan)}
            elif path == "/api/plan-finite-zero-loss":
                fields(value, ("population_panels", "loss_ceiling", "significance", "maximum_evaluation_panels"))
                plan = plan_finite_zero_failure_resolution(value["population_panels"],
                    value["loss_ceiling"], value["significance"], value["maximum_evaluation_panels"])
                result = {"schema": "lupine.discovery.finite_zero_failure_resolution_plan.v1", "plan": encode(plan)}
            elif path == "/api/select":
                if isinstance(value, dict) and "problem_raw" in value:
                    fields(value, ("problem_raw",))
                    result = run_coupled("select", value["problem_raw"])
                else:
                    fields(value, ("problem",))
                    result = select_problem(value["problem"])
            elif path == "/api/coupled-domains":
                fields(value, ("problem_raw",))
                result = run_coupled("domains", value["problem_raw"])
            elif path == "/api/verify":
                fields(value, ("problem_raw", "certificate_raw"))
                result = run_coupled("verify", value["problem_raw"],
                                     raw_certificate=value["certificate_raw"])
            elif path == "/api/replay":
                if isinstance(value, dict) and "problem_raw" in value:
                    fields(value, ("problem_raw", "outcomes_raw"))
                    result = run_coupled("replay", value["problem_raw"], value["outcomes_raw"])
                else:
                    fields(value, ("problem", "outcomes"))
                    problem = bounded_problem(value["problem"])
                    if problem.get("schema") == DECISION_POOL_SCHEMA:
                        raise CoupledWorkerError("raw_outcomes_required",
                            "Statistical-pool replay requires problem_raw and outcomes_raw JSON text so the decision is sealed before outcome decoding.", 400)
                    if guarded_problem(problem):
                        raise CoupledWorkerError("raw_outcomes_required",
                            "Coupled and projection replay require problem_raw and outcomes_raw JSON text so the decision is sealed before outcome decoding.", 400)
                    result = replay_report(problem, value["outcomes"])
            elif re.fullmatch(r"/api/cases/[a-z0-9_-]+/replay", path):
                # Fix the selection before opening the built-in answer resource.
                # Replay recomputes from the same input; no answers enter select.
                if isinstance(value, dict) and "problem_raw" in value:
                    fields(value, ("problem_raw",))
                    problem_raw = value["problem_raw"]
                    run_coupled("select", problem_raw)
                    # The child has already bounded and validated this document.
                    # Decode it here only for the packaged-problem seal check.
                    problem = loads(problem_raw)
                else:
                    fields(value, ("problem",))
                    problem = bounded_problem(value["problem"])
                    select_problem(problem)
                    problem_raw = raw_document(problem) if guarded_problem(problem) else None
                outcomes = get_case_outcomes(path.split("/")[3], problem)
                result = (run_coupled("replay", problem_raw, raw_document(outcomes))
                          if guarded_problem(problem) else replay_report(problem, outcomes))
            else:
                self.error(404, "Not found.")
                return
            self.respond(200, result)
        except CoupledWorkerError as exc:
            self.respond(exc.http_status, exc.payload())
        except KeyError:
            self.error(400, "Unknown case or missing input field.")
        except (ValueError, TypeError, UnicodeError, ZeroDivisionError) as exc:
            self.error(400, str(exc))


def make_server(port=8765):
    if not 0 <= port <= 65535:
        raise ValueError("port must be between 0 and 65535")
    server = ThreadingHTTPServer(("127.0.0.1", port), WorkbenchHandler)
    server.daemon_threads = True
    return server


def serve(port=8765):
    with make_server(port) as server:
        print(f"Lupine Discovery research workbench: http://127.0.0.1:{server.server_address[1]}", flush=True)
        print("Local session; uploads are processed in memory. Press Ctrl+C to stop.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
    return 0
