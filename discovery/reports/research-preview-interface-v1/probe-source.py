#!/usr/bin/env python3
"""Supplemental actual-public-report UI check; never opens a private study path.

Preparation only until a reviewer supplies the packaged public resource and its
original byte SHA. No fixtures, report injection, scientific recomputation, or
private aggregation validation occur here. See README.md beside this script.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from hashlib import sha256
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import sys
import threading
import time

POLICIES = ("primary", "stopped", "processing", "objective_only", *(f"random_{i}" for i in range(20)))
CAPS = (0, 1, 2, 4, 8, 16, 32)
VIEWS = ("assigned_panels", "observed_feasible_panels")
POPULATIONS = ("primary", "secondary")
COMPLETE = "lupine.discovery.mpea.evaluation_public.v1"
UNAVAILABLE = "lupine.discovery.mpea.unavailable_public.v1"
NULL_FIELDS = ("calibration_summary", "population_metrics", "policy_metrics", "gate_denominators",
               "gate_margins", "gate_checks", "gate_reasons", "failed_gates", "component_verdicts",
               "component_reasons", "overall_verdict")


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True,
                      allow_nan=False).encode("ascii")


def decode(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, "Duplicate JSON key")
            result[key] = value
        return result

    def reject(_):
        raise ValueError("Non-exact JSON number")

    return json.loads(raw, object_pairs_hook=pairs, parse_constant=reject, parse_float=reject)


def write_once(path, raw):
    with path.open("xb") as stream:
        stream.write(raw)
        stream.flush()
        os.fsync(stream.fileno())
    path.chmod(0o444)


def json_once(path, value):
    write_once(path, json.dumps(value, sort_keys=True, indent=2, ensure_ascii=True,
                                allow_nan=False).encode("ascii") + b"\n")


def title(value):
    return str(value).replace("_", " ").lower()


def display(value):
    if value is None:
        return "Unavailable"
    if type(value) is bool:
        return "true" if value else "false"
    return str(value)


def binary(metric):
    if not metric or metric["rate"] is None:
        return "Unavailable"
    return (f"{display(metric['success_count'])} / {display(metric['known_count'])} known; "
            f"{display(metric['panel_denominator'])} assigned; {display(metric['unavailable_count'])} unavailable")


def numeric(metric):
    if not metric or metric["mean"] is None:
        return "Unavailable"
    return (f"{display(metric['mean'])} · {display(metric['known_count'])} / "
            f"{display(metric['panel_denominator'])} defined")


def no_symlinks(path, root):
    require(path.is_relative_to(root), "Path leaves declared checkout")
    for part in (path, *path.parents):
        require(not part.is_symlink(), "Symlink path refused")
        if part == root:
            break


def source_hashes(root, script):
    package = root / "src/lupine_discovery"
    paths = set(package.rglob("*.py"))
    paths.update(path for path in (package / "web").rglob("*") if path.is_file())
    paths.update(root / name for name in (
        "AGENTS.md", "pyproject.toml", "scripts/browser_smoke.py", "scripts/mpea_browser_checks.py",
        "scripts/mpea_study_report.py", "docs/mpea-public-projector-v1.md",
        "docs/mpea-registration-publication-v1.md"))
    paths.add(script)
    paths.add(script.with_name("README.md"))
    result = {}
    for path in sorted(paths):
        no_symlinks(path, root)
        result[str(path.relative_to(root))] = sha256(path.read_bytes()).hexdigest()
    return result


def validate_public_shape(report):
    require(type(report) is dict, "Public document must be an object")
    require(report.get("execution_kind") == "registered_original", "Only the reviewed original report is accepted")
    require(report.get("protocol_id") == "mpea-t25-archival-v1", "Unexpected protocol")
    require(report.get("schema") in (COMPLETE, UNAVAILABLE), "Unsupported public schema")
    registration = report.get("registration")
    require(registration is None or type(registration) is dict, "Unsupported registration identity")
    if registration is not None:
        require(re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", registration.get("commit", "")),
                "Registered source commit is malformed")
    for key in ("content_sha256", "scientific_sha256"):
        require(re.fullmatch(r"[0-9a-f]{64}", report.get(key, "")), f"Missing {key}")
    payload = report["payload"]
    require(type(payload) is dict and type(report["reasons"]) is list, "Missing payload/reasons")
    if report["schema"] == COMPLETE:
        require(registration is not None, "Complete report lacks its registration identity")
        require(report["status"] == "COMPLETE" and report["reasons"] == [], "Inconsistent complete state")
        require(payload["overall_verdict"] in ("GO_DESIGN_INDEPENDENT_STUDY", "NO_GO_ARCHIVAL_USEFULNESS"),
                "Unexpected archival verdict")
        require(payload["run_accounting"] == {"scheduled_runs": 960, "completed_runs": 960,
                "populations": 2, "assigned_panels_per_population": 20, "policies_per_panel": 24},
                "Incomplete policy accounting")
        for key in ("calibration_summary", "population_metrics", "policy_metrics"):
            require(set(payload[key]) == set(POPULATIONS), f"Unexpected {key} populations")
        require(set(payload["component_verdicts"]) == set(payload["component_reasons"]), "Component reasons mismatch")
        require(set(payload["gate_checks"]) == set(payload["gate_reasons"]), "Gate reasons mismatch")
        for population in POPULATIONS:
            require(set(payload["policy_metrics"][population]) == set(POLICIES), "Missing policy/control")
            for policy in POLICIES:
                summary = payload["policy_metrics"][population][policy]
                require(summary["scheduled_runs"] == summary["completed_runs"] == 20, "Incomplete policy runs")
                require([item["requested_cap"] for item in summary["budget_snapshots"]] == list(CAPS),
                        "Missing, reordered or duplicated caps")
                require(set(summary["same_actual_pool_cost"]) == set(VIEWS), "Missing same-cost denominator")
    else:
        require(report["status"] in ("BLOCKED", "INCOMPLETE", "NO_GO_INSUFFICIENT_DEVELOPMENT"),
                "Unsupported early-stop state")
        require(all(key in payload and payload[key] is None for key in NULL_FIELDS), "Early stop exposes a performance result")
        require(type(payload["completed_policy_runs"]) is int, "Missing stopped run count")


def check_ui(page, report, output, checks):
    from playwright.sync_api import expect

    payload = report["payload"]
    complete = report["schema"] == COMPLETE
    content = page.locator("#mpea-content")
    expect(content).to_be_visible()
    expect(page.locator("#mpea-status")).to_be_hidden()
    expect(content.locator(":scope > p.notice").first).to_have_text("REGISTERED ARCHIVAL REPLAY · experimental records")
    require("SYNTHETIC CONTROL" not in content.inner_text(), "Actual report mislabeled synthetic")
    verdict = payload["overall_verdict"] if complete else report["status"]
    expect(page.locator("#mpea-verdict")).to_have_attribute("data-status", verdict)
    expect(page.locator("#mpea-verdict")).to_have_text(title(verdict))
    explanation = ("The study did not complete a scientific usefulness evaluation. No overall performance verdict is available."
        if not complete else
        "The frozen gates support designing a further independent study. Physical performance and deployment remain unqualified."
        if verdict == "GO_DESIGN_INDEPENDENT_STUDY" else
        "The complete archival evaluation did not meet all frozen usefulness gates. Every failed gate remains visible below.")
    expect(page.locator("#mpea-verdict + p")).to_have_text(explanation)
    page.locator("#mpea-provenance").locator("..").locator("summary").click()
    expect(page.locator("#mpea-provenance")).to_contain_text(report["scientific_sha256"])
    if report["registration"] is None:
        expect(page.locator("#mpea-provenance")).not_to_contain_text("Registered source commit:")
    else:
        expect(page.locator("#mpea-provenance")).to_contain_text(f"Registered source commit: {report['registration']['commit']}")
    for value in payload["scope"].values():
        expect(page.locator("#mpea-provenance")).to_contain_text(value)
    checks.append("registered_original_label_exact_verdict_and_provenance")

    if complete:
        expect(page.locator("[data-mpea-population]")).to_have_count(2)
        expect(page.locator("[data-mpea-gate]")).to_have_count(len(payload["component_verdicts"]))
        for name, value in payload["component_verdicts"].items():
            require(value is None or type(value) is bool, "Unexpected component state")
            card = page.locator(f'[data-mpea-gate="{name}"]')
            expect(card.locator(".gate-status")).to_have_text("UNAVAILABLE" if value is None else "PASS" if value else "FAIL")
            expect(card.locator("p")).to_have_text(" · ".join(map(title, payload["component_reasons"][name])) or
                                                  "The declared component checks passed.")
        details = content.locator("details").filter(has=page.locator("summary", has_text="Every frozen check, denominator and margin"))
        details.locator("summary").click()
        paragraphs = details.locator(":scope > div > p")
        expect(paragraphs).to_have_count(len(payload["gate_checks"]))
        expected_gates = [f"{'PASS' if value else 'FAIL'} · {title(key)} · " +
                          " · ".join(map(title, payload["gate_reasons"][key]))
                          for key, value in payload["gate_checks"].items()]
        # Exact order comes from the actual API object: sorted server JSON keys.
        expected_gates.sort()
        require(sorted(paragraphs.all_text_contents()) == expected_gates, "Displayed frozen gate/reason mismatch")
        for group in ("gate_denominators", "gate_margins"):
            for key, value in payload[group].items():
                row = details.locator("dl > div").filter(has=page.locator("dt", has_text=re.compile("^" + re.escape(title(key)) + "$")))
                expect(row).to_have_count(1)
                expect(row.locator("dd")).to_have_text(display(value))
        checks.append("all_component_states_reasons_frozen_checks_denominators_margins_exact")

        for population in POPULATIONS:
            section = page.locator(f'[data-mpea-population="{population}"]')
            expect(section).to_contain_text("all 20 evaluation panels together")
            calibration = payload["calibration_summary"][population]
            for label, value in (("Calibration status", calibration["status"]),
                                 ("Sampling premise", calibration["premise_status"]),
                                 ("Prefix threshold", calibration["threshold"])):
                row = section.locator("dl > div").filter(has=page.locator("dt", has_text=re.compile("^" + re.escape(label) + "$")))
                expect(row.locator("dd")).to_have_text(display(value))
            reason_text = " · ".join(map(title, calibration["reasons"] + calibration["study_reasons"])) or "No additional calibration reasons."
            require(reason_text in section.locator(":scope > p").all_text_contents(), "Calibration reasons changed")
            for view in VIEWS:
                section.locator("select").select_option(view)
                expect(section.locator("tbody tr")).to_have_count(48)
                section.locator("details").evaluate_all("items => items.forEach(item => { item.open = true; })")
                for policy in POLICIES:
                    rows = section.locator(f'tr[data-mpea-policy="{policy}"]')
                    expect(rows).to_have_count(2)
                    summary = payload["policy_metrics"][population][policy]
                    for snapshot in summary["budget_snapshots"]:
                        cell = rows.first.locator(f'[data-mpea-budget="{snapshot["requested_cap"]}"]')
                        metric = snapshot["metrics"][view]
                        expect(cell.locator(".budget-measure")).to_have_text(binary(metric["any_optimum_hit"]))
                        expect(cell.locator(".budget-undefined")).to_have_text(f"Bundle requests: {display(metric['actual_bundle_cost']['sum'])}")
                    metric = summary["same_actual_pool_cost"][view]
                    expect(rows.nth(1).locator("td")).to_have_text([binary(metric["any_optimum_hit"]),
                        display(metric["actual_bundle_cost"]["sum"]), numeric(metric["regret"])])
            section.locator("select").select_option("assigned_panels")
            checks.append(f"{population}_all_24_policies_7_caps_same_cost_both_denominators_exact")
    else:
        expect(content).to_contain_text("No overall performance verdict is available.")
        expect(page.locator("[data-mpea-population]")).to_have_count(0)
        expect(page.locator("#mpea-gates")).to_have_count(0)
        for label, value in (("Last sealed stage", display(payload["last_sealed_stage"])),
                             ("Completed policy runs", display(payload["completed_policy_runs"])),
                             ("Stop reasons", " · ".join(map(title, report["reasons"])))):
            row = content.locator(":scope > dl > div").filter(has=page.locator("dt", has_text=re.compile("^" + re.escape(label) + "$")))
            expect(row.locator("dd")).to_have_text(value)
        checks.append("early_stop_exact_reasons_stage_counts_all_performance_fields_null_no_gates_or_tables")

    content.locator("details").evaluate_all("items => items.forEach(item => { item.open = true; })")
    access = page.locator("#mpea-access")
    counts = report["access"]["counts"]
    for field in ("mixed_source_captures", "mixed_source_bytes", "model_visible_bundles", "calibrator_visible_bundles",
                  "policy_bundle_requests", "auditor_unique_bundles"):
        row = access.locator(":scope > dl").first.locator("div").filter(has=page.locator("dt", has_text=re.compile("^" + re.escape(title(field)) + "$")))
        expect(row.locator("dd")).to_have_text(display(counts[field]))
    for index, role in enumerate(("DEVELOPMENT", "CALIBRATION", "EVALUATION"), start=1):
        for field in ("accumulated_bundles", "decoded_bundles", "interpreted_bundles"):
            row = access.locator(":scope > dl").nth(index).locator("div").filter(has=page.locator("dt", has_text=re.compile("^" + re.escape(title(field)) + "$")))
            expect(row.locator("dd")).to_have_text(display(counts[field][role]))
    checks.append("all_capture_and_role_access_counts_preserve_nulls")

    with page.expect_download() as event:
        page.locator("#download-mpea").click()
    destination = output / "displayed-original-public-report.json"
    require(not destination.exists(), "Export output already exists")
    event.value.save_as(destination)
    require(canonical(decode(destination.read_bytes())) == canonical(report), "Export object differs from original public report")
    destination.chmod(0o444)
    checks.append("download_entire_object_equals_original_public_report_with_exact_json_types")

    # Keep large tables collapsed for readable overview screenshots; the exact
    # assertions above inspect every row, including the disclosure tables.
    content.locator("details").evaluate_all("items => items.forEach(item => { item.open = false; })")
    for width, height, label in ((1440, 1050, "desktop"), (390, 844, "mobile-390"), (320, 844, "mobile-320")):
        page.set_viewport_size({"width": width, "height": height})
        content.locator("details").evaluate_all("items => items.forEach(item => { item.open = true; })")
        require(page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), "Expanded page overflow")
        content.locator("details").evaluate_all("items => items.forEach(item => { item.open = false; })")
        page.locator("#mpea-section").scroll_into_view_if_needed()
        require(page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), "Horizontal page overflow")
        path = output / (label + ".png")
        require(not path.exists(), "Screenshot output already exists")
        page.locator("#mpea-section").screenshot(path=str(path))
        path.chmod(0o444)
    checks.append("desktop_and_390_320_mobile_screenshots_no_page_overflow")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", type=Path, required=True, help="Discovery checkout containing the reviewed resource")
    parser.add_argument("--resource-path", type=Path, required=True, help="Exact src/lupine_discovery/resources/mpea-t25-v1.json path")
    parser.add_argument("--expected-public-sha256", required=True, help="Exact original public bytes SHA supplied by root after review")
    parser.add_argument("--review-reference", help="Optional opaque review provenance; this script does not attest the review")
    parser.add_argument("--output-dir", type=Path, required=True, help="Fresh directory beneath this script's scratch preparation directory")
    args = parser.parse_args()
    require(re.fullmatch(r"[0-9a-f]{64}", args.expected_public_sha256), "Exact lowercase SHA-256 required")
    root = args.project_root.resolve(strict=True)
    script = Path(__file__).resolve(strict=True)
    require(script.parent == root / ".cache/actual-public-browser-preparation", "Verifier must run from the designated scratch directory")
    expected_resource = root / "src/lupine_discovery/resources/mpea-t25-v1.json"
    resource = args.resource_path.absolute()
    require(resource == expected_resource, "Only the declared packaged public resource path may be read")
    no_symlinks(resource, root)
    require(resource.is_file() and resource.stat().st_size <= 8 * 1024 * 1024, "Reviewed public resource absent or oversized")
    raw = resource.read_bytes()
    require(sha256(raw).hexdigest() == args.expected_public_sha256, "Original public byte hash mismatch")
    report = decode(raw)
    validate_public_shape(report)
    output = args.output_dir.absolute()
    require(output.is_relative_to(script.parent) and output != script.parent, "Output must be beneath the preparation directory")
    require(".." not in output.parts, "Parent traversal refused")
    no_symlinks(output, root)
    require(not output.exists(), "Output exists; choose a fresh attempt path")
    output.mkdir(parents=True, exist_ok=False)
    sys.dont_write_bytecode = True
    sys.path.insert(0, str(root / "src"))
    before = source_hashes(root, script)
    started = datetime.now(timezone.utc).isoformat()
    start = time.monotonic()
    identity = {"original_public_sha256": sha256(raw).hexdigest(), "original_public_bytes": len(raw),
                "resource_path": str(resource.relative_to(root)), "scientific_sha256": report["scientific_sha256"],
                "content_sha256": report["content_sha256"], "execution_kind": report["execution_kind"]}
    initial = {"schema": "lupine.discovery.supplemental_actual_public_browser_start.v1", "started_utc": started,
               "command": [sys.executable, *sys.argv], "review_reference": args.review_reference,
               "review_attestation": "not_performed_by_this_probe",
               "public_identity": identity, "source_sha256": before,
               "git_head": subprocess.run(["git", "-C", str(root), "rev-parse", "HEAD"], check=True,
                                          capture_output=True, text=True).stdout.strip()}
    json_once(output / "execution-start.json", initial)
    checks, javascript_errors, console_errors, request_failures = [], [], [], []
    server = thread = browser = None
    result = {"schema": "lupine.discovery.supplemental_actual_public_browser_execution.v1", "status": "FAIL",
              "mode": "registered_original_public_resource_ui_only",
              "scope": "Actual original public aggregate transport/render/export checks only; not private aggregation, physical validity or scientific superiority verification",
              "review_reference": args.review_reference, "review_attestation": "not_performed_by_this_probe",
              "screenshot_visual_review": "not_performed_by_this_probe",
              "started_utc": started, "public_identity": identity, "checks": checks,
              "source_sha256_before": before, "javascript_errors": javascript_errors,
              "console_errors": console_errors, "request_failures": request_failures}
    try:
        from playwright.sync_api import sync_playwright
        import lupine_discovery.server as server_module
        require(Path(server_module.__file__).resolve() == root / "src/lupine_discovery/server.py", "Wrong server import origin")
        installed = Path(str(server_module.files("lupine_discovery").joinpath("resources/mpea-t25-v1.json")))
        require(installed.resolve() == resource, "Server package resource differs from reviewed path")
        server = server_module.make_server(0)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        url = f"http://127.0.0.1:{server.server_address[1]}"
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            result["environment"] = {"python": platform.python_version(), "platform": platform.platform(),
                                     "playwright": importlib.metadata.version("playwright"), "chromium": browser.version}
            page = browser.new_page(viewport={"width": 1440, "height": 1050}, accept_downloads=True)
            page.on("pageerror", lambda error: javascript_errors.append(str(error)))
            page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
            page.on("requestfailed", lambda request: request_failures.append({"url": request.url, "failure": request.failure}))
            page.goto(url, wait_until="networkidle")
            with page.expect_response(lambda response: response.url == url + "/api/benchmarks") as response_event:
                page.locator("#nav-benchmarks").click()
            response = response_event.value
            require(response.status == 200, "Actual benchmark HTTP response failed")
            api_bytes = response.body()
            # Other pre-existing dashboard reports may contain measured float
            # timings; only the selected original MPEA object is exact-valued.
            actual = json.loads(api_bytes).get("mpea_archived")
            require(canonical(actual) == canonical(report), "Actual API report differs from reviewed original")
            result["api"] = {"path": "/api/benchmarks", "status": response.status,
                             "response_sha256": sha256(api_bytes).hexdigest(), "response_bytes": len(api_bytes),
                             "mpea_object_exactly_matches_original": True}
            checks.append("real_local_server_api_delivers_exact_reviewed_original_object")
            check_ui(page, report, output, checks)
            require(not javascript_errors, "Browser JavaScript errors occurred")
            require(not console_errors, "Browser console errors occurred")
            require(not request_failures, "Browser request failures occurred")
            checks.append("no_javascript_console_or_request_errors")
            browser.close()
            browser = None
        after = source_hashes(root, script)
        result["source_sha256_after"] = after
        require(after == before, "Source changed during browser verification")
        require(resource.read_bytes() == raw, "Original public resource changed during verification")
        checks.append("source_and_original_public_bytes_stable_for_entire_execution")
        result["status"] = "PASS"
    except Exception as error:
        result["failure"] = {"type": type(error).__name__, "message": str(error)}
    finally:
        cleanup_errors = []

        def cleanup(label, operation):
            try:
                operation()
            except Exception as error:
                cleanup_errors.append({"component": label, "type": type(error).__name__, "message": str(error)})

        if browser is not None:
            cleanup("browser.close", browser.close)
        if server is not None:
            # shutdown() blocks forever if serve_forever() never started.
            if thread is not None and thread.is_alive():
                cleanup("server.shutdown", server.shutdown)
            cleanup("server.server_close", server.server_close)
        if thread is not None:
            cleanup("server_thread.join", lambda: thread.join(timeout=5))
            if thread.is_alive():
                cleanup_errors.append({"component": "server_thread.join", "type": "ThreadStillAlive",
                                       "message": "Server thread remained alive after cleanup timeout"})
        result["cleanup_errors"] = cleanup_errors
        if cleanup_errors:
            result["status"] = "FAIL"
        try:
            result["source_sha256_after"] = source_hashes(root, script)
            result["source_stable"] = result["source_sha256_after"] == before
            result["original_public_bytes_stable"] = resource.read_bytes() == raw
            if not result["source_stable"] or not result["original_public_bytes_stable"]:
                result["status"] = "FAIL"
                result.setdefault("failure", {"type": "IdentityChanged", "message": "Source or public bytes changed"})
        except Exception as error:
            result["status"] = "FAIL"
            result["identity_recheck_failure"] = {"type": type(error).__name__, "message": str(error)}
        result["finished_utc"] = datetime.now(timezone.utc).isoformat()
        result["elapsed_seconds"] = round(time.monotonic() - start, 6)
        result["artifacts"] = {path.name: {"sha256": sha256(path.read_bytes()).hexdigest(), "bytes": path.stat().st_size}
                               for path in sorted(output.iterdir()) if path.is_file()}
        json_once(output / "execution-result.json", result)
    print(json.dumps({"status": result["status"], "checks_passed": len(checks),
                      "record": str(output / "execution-result.json")}, sort_keys=True))
    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
