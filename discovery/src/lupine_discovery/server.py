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
from .evidence import fields
from .serialization import loads

MAX_BODY_BYTES = 2 * 1024 * 1024
MAX_CANDIDATES = 5000
ASSETS = {"/": ("index.html", "text/html; charset=utf-8"),
          "/index.html": ("index.html", "text/html; charset=utf-8"),
          "/styles.css": ("styles.css", "text/css; charset=utf-8"),
          "/app.js": ("app.js", "text/javascript; charset=utf-8")}


def bounded_problem(problem):
    if not isinstance(problem, dict):
        raise ValueError("problem must be a JSON object")
    candidates = problem.get("candidates")
    if isinstance(candidates, list) and len(candidates) > MAX_CANDIDATES:
        raise ValueError(f"local workbench limit is {MAX_CANDIDATES} candidates")
    return problem


def benchmark_report():
    result = {"known_answers": run_known_answers(), "archived": archived_reports(),
              "release_status": "research_preview_not_release_certified"}
    additional = files("lupine_discovery").joinpath("resources/additional-archived-v1.json")
    if additional.is_file():
        result["additional_archived"] = json.loads(additional.read_text(encoding="utf-8"))
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
            if not 0 <= length <= MAX_BODY_BYTES:
                self.error(413, "Send a JSON document of at most 2 MiB.")
                return
            value = loads(self.rfile.read(length).decode("utf-8"))
            if path == "/api/select":
                fields(value, ("problem",))
                result = certificate(bounded_problem(value["problem"]))
            elif path == "/api/replay":
                fields(value, ("problem", "outcomes"))
                result = replay_report(bounded_problem(value["problem"]), value["outcomes"])
            elif re.fullmatch(r"/api/cases/[a-z0-9_-]+/replay", path):
                fields(value, ("problem",))
                problem = bounded_problem(value["problem"])
                # Fix the selection before opening the built-in answer resource.
                # Replay recomputes from the same input; no answers enter select.
                certificate(problem)
                outcomes = get_case_outcomes(path.split("/")[3], problem)
                result = replay_report(problem, outcomes)
            else:
                self.error(404, "Not found.")
                return
            self.respond(200, result)
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
