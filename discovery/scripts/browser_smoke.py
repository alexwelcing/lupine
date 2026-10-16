#!/usr/bin/env python3
"""Real Chromium checks against an isolated local workbench server.

Install: pip install -e '.[test-ui]' && python -m playwright install chromium
Run: python scripts/browser_smoke.py
"""
from hashlib import sha256
import json
from pathlib import Path
import subprocess
import sys
import threading
from unittest.mock import patch

from playwright.sync_api import expect, sync_playwright
from mpea_browser_checks import check_mpea_workbench
from planning_browser_checks import check_planning_workbench
from finite_planning_browser_checks import check_finite_planning_workbench
from recorded_census_browser_checks import check_recorded_census_workbench

from lupine_discovery.benchmarks import case_catalog, get_case, get_case_outcomes
from lupine_discovery.cli import verify_certificate
from lupine_discovery.coupled_worker import CoupledWorkerError
from lupine_discovery.evidence import digest
from lupine_discovery.server import make_server


def run():
    artifacts = Path(".cache/browser/decision-pool")
    artifacts.mkdir(parents=True, exist_ok=True)
    project_root = Path(__file__).resolve().parents[1]
    def source_digests():
        package = project_root / "src/lupine_discovery"
        paths = [Path(__file__).resolve(), Path(__file__).with_name("mpea_browser_checks.py").resolve(),
                 Path(__file__).with_name("planning_browser_checks.py").resolve(),
                 Path(__file__).with_name("finite_planning_browser_checks.py").resolve(),
                 Path(__file__).with_name("recorded_census_browser_checks.py").resolve(), *package.rglob("*.py"),
                 *(package / "web" / name for name in ("app.js", "mpea.js", "planner.js", "recorded-census.js", "index.html", "styles.css"))]
        paths.extend((package / "resources").rglob("decision-pool*.json"))
        paths.append(package / "resources/recorded-census-v1.json")
        paths.extend((project_root / "tests/fixtures/mpea_ui").glob("*.json"))
        return {str(path.relative_to(project_root)): sha256(path.read_bytes()).hexdigest()
                for path in sorted(paths)}
    sources_before = source_digests()
    server = make_server(0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_address[1]}"
    checks = []
    errors = []
    paired_schemas = set()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1440, "height": 1050})
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(url, wait_until="networkidle")
            expect(page.locator("#case-select option")).to_have_count(len(case_catalog()) + 1)
            expect(page.locator("#case-title")).to_be_visible()
            checks.extend(check_planning_workbench(page, artifacts / "planning"))
            checks.extend(check_finite_planning_workbench(page, artifacts / "finite-planning"))
            checks.extend(check_recorded_census_workbench(page, artifacts / "recorded-census"))

            def select_case(case_id):
                page.locator("#case-select").select_option(case_id)
                expect(page.locator("#case-title")).to_have_text(get_case(case_id)["title"])
                with page.expect_response(lambda r: r.url.endswith("/api/select")) as response:
                    page.locator("#analyze").click()
                expect(page.locator("#analysis-results")).to_be_visible()
                return response.value.json()

            def export_pair(label, expected_raw=None):
                raw = page.locator("#problem-json").input_value() if expected_raw is None else expected_raw
                with page.expect_download() as downloaded:
                    page.locator("#download-problem").click()
                problem_path = artifacts / f"{label}-problem.json"
                downloaded.value.save_as(problem_path)
                assert problem_path.read_bytes() == raw.encode("utf-8")
                with page.expect_download() as downloaded:
                    page.locator("#download-certificate").click()
                certificate_path = artifacts / f"{label}-paired-certificate.json"
                downloaded.value.save_as(certificate_path)
                verified = subprocess.run([sys.executable, "-m", "lupine_discovery", "verify",
                    str(problem_path.resolve()), str(certificate_path.resolve())],
                    capture_output=True, text=True, check=True)
                result = json.loads(verified.stdout)
                assert result["verified"] is True
                assert result["scope"] == "identity_and_exact_runtime_recomputation_only"
                paired_schemas.add(json.loads(problem_path.read_text())["schema"])

            def assert_no_export():
                expect(page.locator("#download-problem")).to_be_disabled()
                expect(page.locator("#download-certificate")).to_be_disabled()
                expect(page.locator("#download-replay")).to_be_disabled()
                # Dispatch directly as well: disabled-button styling alone must
                # not leave a stale receipt in either download handler.
                created = page.evaluate("""() => {
                  const create = URL.createObjectURL; let calls = 0;
                  URL.createObjectURL = (...args) => { calls += 1; return create(...args); };
                  try {
                    for (const id of ['download-problem', 'download-certificate', 'download-replay'])
                      document.getElementById(id).dispatchEvent(new MouseEvent('click'));
                  } finally { URL.createObjectURL = create; }
                  return calls;
                }""")
                assert created == 0

            certificate = select_case("integer-design-grid")
            assert certificate["selection"]["retained"] == ["x3-y5"]
            page.locator('[data-filter="retained"]').click()
            expect(page.locator("#pool-table tbody tr")).to_have_count(1)
            expect(page.locator("#pool-table")).to_contain_text("x3-y5")
            with page.expect_download() as downloaded:
                page.locator("#download-certificate").click()
            target = artifacts / "certificate.json"
            downloaded.value.save_as(target)
            verify_certificate(get_case("integer-design-grid")["problem"], json.loads(target.read_text()))
            checks.append("selection_and_download_reverification")
            export_pair("scalar")
            with patch("lupine_discovery.server.certificate", side_effect=ValueError("Synthetic failed scalar rebuild")):
                with page.expect_response(lambda r: r.url.endswith("/api/select")) as response:
                    page.locator("#analyze").click()
                assert response.value.status == 400
                expect(page.locator("#analysis-results")).to_be_hidden()
                assert_no_export()
            page.locator("#analyze").click()
            expect(page.locator("#analysis-results")).to_be_visible()
            checks.append("failed_scalar_rebuild_clears_both_exports")

            with page.expect_response(lambda r: r.url.endswith("/replay")) as response:
                page.locator("#replay-builtin").click()
            assert response.value.json()["evaluation"]["all_true_minimizers_retained"] is True
            expect(page.locator("#replay-results")).to_be_visible()
            checks.append("answer_reveal_after_selection")
            page.evaluate("window.scrollTo(0, 0)")
            page.screenshot(path=str(artifacts / "desktop-pool.png"), full_page=True)
            page.screenshot(path=str(artifacts / "desktop-preview.png"))

            certificate = select_case("no-incumbent")
            assert certificate["selection"]["incumbent"] is None
            expect(page.locator("#result-title")).to_have_text("Uncertainty keeps the pool open")
            expect(page.locator("#selection-metrics")).to_contain_text("Not established")
            checks.append("unresolved_feasibility")

            certificate = select_case("finite-infeasible")
            assert certificate["selection"]["retained"] == []
            expect(page.locator("#result-title")).to_have_text("No possible feasible candidates")
            checks.append("finite_infeasible_state")

            select_case("unsound-score-control")
            with page.expect_response(lambda r: r.url.endswith("/replay")) as response:
                page.locator("#replay-builtin").click()
            evaluation = response.value.json()["evaluation"]
            assert evaluation["empirical_soundness"] == "refuted_on_observed_outcomes"
            assert evaluation["all_true_minimizers_retained"] is False
            expect(page.locator("#replay-results")).to_contain_text("failed interval premise")
            checks.append("negative_control_visible")

            page.locator("#json-editor").evaluate("element => element.open = true")
            raw = json.dumps(get_case("tied-optima")["problem"])
            duplicate = '{"schema":"duplicate",' + raw[1:]
            page.locator("#problem-json").fill(duplicate)
            expect(page.locator("#analysis-results")).to_be_hidden()
            assert_no_export()
            page.locator("#analyze").click()
            expect(page.locator("#notice")).to_contain_text("duplicate JSON key")
            checks.append("edits_invalidate_and_raw_duplicate_keys_rejected")

            root = Path(__file__).resolve().parents[1]
            page.locator("#problem-upload").set_input_files(root / "examples/abstract.json")
            expect(page.locator("#case-kind")).to_have_text("CUSTOM INPUT")
            page.locator("#analyze").click()
            expect(page.locator("#analysis-results")).to_be_visible()
            expect(page.locator("#replay-builtin")).to_be_hidden()
            page.locator("#outcomes-upload").set_input_files(root / "examples/abstract.outcomes.json")
            expect(page.locator("#replay-results")).to_be_visible()
            checks.append("custom_problem_and_separate_outcome_upload")

            finite = select_case("calibrated-finite")
            assert finite["calibration"]["status"] == "finite_conditional"
            assert finite["selection"]["retained"] == ["A"]
            expect(page.locator("#calibration-panel")).to_be_visible()
            expect(page.locator("#pool-table")).not_to_contain_text("undefined")
            with page.expect_download() as downloaded:
                page.locator("#download-certificate").click()
            calibrated_target = artifacts / "calibrated-certificate.json"
            downloaded.value.save_as(calibrated_target)
            verify_certificate(get_case("calibrated-finite")["problem"],
                               json.loads(calibrated_target.read_text()))
            export_pair("calibrated")
            checks.append("calibrated_finite_intervals_and_sealed_export")

            for case_id in ("calibrated-insufficient", "calibrated-unsupported"):
                withheld = select_case(case_id)
                assert withheld["calibration"]["status"] == "abstained"
                assert withheld["selection"]["retained"] == ["A", "B", "C"]
                expect(page.locator("#result-title")).to_have_text("Screening withheld")
                expect(page.locator("#pool-table .score-line")).to_have_count(0)
                expect(page.locator("#pool-table")).not_to_contain_text("undefined")
                with page.expect_response(lambda r: r.url.endswith("/replay")) as response:
                    page.locator("#replay-builtin").click()
                evaluation = response.value.json()["evaluation"]
                assert evaluation["score_coverage"] is None
                assert evaluation["all_true_minimizers_retained"] is True
                expect(page.locator("#replay-results")).to_be_visible()
            checks.append("insufficient_and_unsupported_calibration_withhold_screening")
            page.evaluate("window.scrollTo(0, 0)")
            page.screenshot(path=str(artifacts / "desktop-abstention.png"))

            tiny = get_case("calibrated-finite")["problem"]
            tiny["candidates"] = tiny["candidates"][:1]
            tiny["calibration"]["delta"] = "1/100000000000000000"
            tiny["calibration"]["residuals"] = {"score": [], "limit": []}
            page.locator("#problem-upload").set_input_files({
                "name": "tiny-risk-budget.json", "mimeType": "application/json",
                "buffer": json.dumps(tiny).encode(),
            })
            expect(page.locator("#case-kind")).to_have_text("CUSTOM INPUT")
            page.locator("#analyze").click()
            expect(page.locator("#result-title")).to_have_text("Screening withheld")
            expect(page.locator("#calibration-facts")).to_contain_text("199999999999999999")
            with page.expect_download() as downloaded:
                page.locator("#download-certificate").click()
            tiny_target = artifacts / "tiny-risk-certificate.json"
            downloaded.value.save_as(tiny_target)
            verify_certificate(tiny, json.loads(tiny_target.read_text()))
            checks.append("large_exact_calibration_diagnostic_roundtrip")

            pareto = select_case("pareto-tradeoffs")
            assert pareto["selection"]["retained"] == ["a", "a-twin", "b"]
            assert pareto["selection"]["dominance_witnesses"] == {"bad": "a"}
            expect(page.locator("#result-title")).to_have_text("3 candidates in the Pareto pool")
            expect(page.locator("#selection-metrics")).not_to_contain_text("REGRET")
            expect(page.locator("#pool-table")).to_contain_text("cost")
            expect(page.locator("#pool-table")).to_contain_text("risk")
            expect(page.locator("#pool-table")).not_to_contain_text("undefined")
            with page.expect_download() as downloaded:
                page.locator("#download-certificate").click()
            pareto_target = artifacts / "pareto-certificate.json"
            downloaded.value.save_as(pareto_target)
            verify_certificate(get_case("pareto-tradeoffs")["problem"], json.loads(pareto_target.read_text()))
            export_pair("pareto")
            with page.expect_response(lambda r: r.url.endswith("/replay")) as response:
                page.locator("#replay-builtin").click()
            assert response.value.json()["evaluation"]["true_pareto_front"] == ["a", "a-twin", "b"]
            expect(page.locator("#pareto-front")).to_contain_text("a-twin")
            checks.append("pareto_tradeoffs_ties_sealed_export_and_true_front")
            page.evaluate("window.scrollTo(0, 0)")
            page.screenshot(path=str(artifacts / "desktop-pareto.png"), full_page=True)

            select_case("pareto-partial")
            with page.expect_response(lambda r: r.url.endswith("/replay")) as response:
                page.locator("#replay-builtin").click()
            assert response.value.json()["evaluation"]["true_pareto_front"] is None
            expect(page.locator("#pareto-front")).to_contain_text("unresolved")
            checks.append("partial_pareto_truth_keeps_global_front_unknown")

            select_case("pareto-unsound-control")
            with page.expect_response(lambda r: r.url.endswith("/replay")) as response:
                page.locator("#replay-builtin").click()
            evaluation = response.value.json()["evaluation"]
            assert evaluation["true_pareto_front"] == ["bad"]
            assert evaluation["all_true_pareto_candidates_retained"] is False
            expect(page.locator("#replay-results")).to_contain_text("Failed bounds")
            checks.append("pareto_unsound_control_exposes_excluded_true_front")

            coupled = select_case("coupled-shared-trend")
            assert coupled["selection"]["retained"] == ["B"]
            assert coupled["diagnostics"]["box_selection_diagnostic"]["retained"] == ["A", "B"]
            expect(page.locator("#result-title")).to_have_text("Conditional coupled pool")
            expect(page.locator("#coupled-panel")).to_be_visible()
            expect(page.locator("#coupled-proofs")).to_contain_text("shared-trend-cancellation")
            expect(page.locator('[data-excluded-candidate="A"]')).to_contain_text("≤ -1 < 0")
            expect(page.locator("#selection-metrics")).not_to_contain_text("REGRET")
            expect(page.locator("#pool-table")).not_to_contain_text("undefined")
            with page.expect_download() as downloaded:
                page.locator("#download-certificate").click()
            coupled_target = artifacts / "coupled-certificate.json"
            downloaded.value.save_as(coupled_target)
            assert verify_certificate(get_case("coupled-shared-trend")["problem"],
                                      json.loads(coupled_target.read_text()))["verified"]
            export_pair("coupled")
            assert paired_schemas == {f"lupine.discovery.{prefix}problem.v1"
                                      for prefix in ("", "calibrated_", "pareto_", "coupled_")}
            checks.append("four_schema_downloaded_problem_certificate_pairs_verify_with_real_cli")
            with page.expect_response(lambda r: r.url.endswith("/replay")) as response:
                page.locator("#replay-builtin").click()
            assert response.value.json()["decision"]["certificate"] == coupled
            expect(page.locator("#replay-results")).to_contain_text("All true feasible optima")
            expect(page.locator("#provided-world-audit")).to_contain_text("fits the complete finite reported values")
            checks.append("coupled_exact_witness_actual_pool_and_sealed_export")

            for case_id, expected_status in (("coupled-missing-point", "consistency_unresolved_all_retained"),
                                             ("coupled-learned-relation", "unsupported_all_retained")):
                withheld = select_case(case_id)
                assert withheld["coupling"]["status"] == expected_status
                assert withheld["selection"]["retained"] == ["A", "B"]
                expect(page.locator("#result-title")).to_contain_text("Screening withheld")
                expect(page.locator("#coupled-diagnostic")).not_to_have_attribute("open", "")
                page.locator("#coupled-diagnostic").evaluate("element => element.open = true")
                expect(page.locator("#coupled-diagnostic")).to_contain_text("DIAGNOSTIC ONLY")
                expect(page.locator("#coupled-diagnostic")).to_contain_text("Separate box pool: B. Actual operational pool: A, B.")
                with page.expect_response(lambda r: r.url.endswith("/replay")) as response:
                    page.locator("#replay-builtin").click()
                replay = response.value.json()
                assert replay["decision"]["selection"]["retained"] == ["A", "B"]
                assert replay["outcome_audit"]["all_true_minimizers_retained"] is True
                if case_id == "coupled-missing-point":
                    expect(page.locator("#provided-world-audit")).to_contain_text("cannot repair screening")
            checks.append("coupled_closed_gates_keep_whole_universe_despite_box_diagnostic")

            select_case("coupled-shared-trend")
            problem = get_case("coupled-shared-trend")["problem"]
            false_world = get_case_outcomes("coupled-shared-trend", problem)
            false_world["outcomes"][1]["score"] = "2"
            with page.expect_response(lambda r: r.url.endswith("/api/replay")) as response:
                page.locator("#outcomes-upload").set_input_files({
                    "name": "false-common-world.json", "mimeType": "application/json",
                    "buffer": json.dumps(false_world).encode(),
                })
            replay = response.value.json()
            assert replay["outcome_audit"]["lost_optimum_ids"] == ["A"]
            assert replay["diagnostics"]["marginal_coverage"]["score_coverage"]["rate"] == "1"
            expect(page.locator("#replay-results")).to_contain_text("lost a true feasible optimum")
            expect(page.locator("#provided-world-audit")).to_contain_text("does not match all reported quantities")
            page.locator("#coupled-replay-coverage").evaluate("element => element.open = true")
            expect(page.locator("#coupled-replay-coverage")).to_contain_text("Score: 2 / 2")
            expect(page.locator("#coupled-replay-coverage")).to_contain_text("does not establish a single shared world")
            checks.append("false_common_world_loses_optimum_despite_full_marginal_coverage")
            page.screenshot(path=str(artifacts / "desktop-coupled-negative-control.png"), full_page=True)
            partial_truth = get_case_outcomes("coupled-shared-trend", problem)
            partial_truth["outcomes"][0]["score"] = None
            with page.expect_response(lambda r: r.url.endswith("/api/replay")) as response:
                page.locator("#outcomes-upload").set_input_files({
                    "name": "partial-coupled-truth.json", "mimeType": "application/json",
                    "buffer": json.dumps(partial_truth).encode(),
                })
            assert response.value.json()["outcome_audit"]["all_true_minimizers_retained"] is None
            expect(page.locator("#replay-results")).to_contain_text("full-universe optimum retention unresolved")
            expect(page.locator("#provided-world-audit")).to_contain_text("unreported quantities remain unresolved")
            checks.append("partial_coupled_outcomes_leave_global_retention_unknown")

            custom_problem = json.loads(json.dumps(problem))
            custom_problem["candidates"][0]["score"]["constant"] = "1.0000000000000000000001"
            custom_problem["screening"]["proofs"] = []
            original_raw = "\n  " + json.dumps(custom_problem, indent=3) + "\n\n"
            page.locator("#problem-upload").set_input_files({
                "name": "original-affine-input.json", "mimeType": "application/json",
                "buffer": original_raw.encode(),
            })
            expect(page.locator("#case-kind")).to_have_text("CUSTOM INPUT")
            with page.expect_response(lambda r: r.url.endswith("/api/select")) as response:
                page.locator("#analyze").click()
            assert response.value.request.post_data_json == {"problem_raw": original_raw}
            expect(page.locator("#analysis-results")).to_be_visible()
            expect(page.locator("#problem-json")).to_have_value(original_raw)
            export_pair("custom-exact-coupled", original_raw)
            with patch("lupine_discovery.server.run_coupled", side_effect=CoupledWorkerError(
                    "worker_timeout", "Synthetic guard timeout: no receipt produced.")):
                with page.expect_response(lambda r: r.url.endswith("/api/select")) as response:
                    page.locator("#analyze").click()
                assert response.value.status == 503
                expect(page.locator("#notice")).to_contain_text("Synthetic guard timeout")
                expect(page.locator("#analysis-results")).to_be_hidden()
                assert_no_export()
            page.locator("#analyze").click()
            expect(page.locator("#analysis-results")).to_be_visible()
            expect(page.locator("#problem-json")).to_have_value(original_raw)
            checks.append("coupled_raw_input_preserved_and_guard_failure_clears_stale_receipt")

            edited_raw = original_raw + "  \n"
            def edit_while_selection_pending(route):
                response = route.fetch()
                assert_no_export()
                page.locator("#json-editor").evaluate("element => element.open = true")
                page.locator("#problem-json").fill(edited_raw)
                assert_no_export()
                route.fulfill(response=response)
            page.route("**/api/select", edit_while_selection_pending, times=1)
            with page.expect_response(lambda r: r.url.endswith("/api/select")) as response:
                page.locator("#analyze").click()
            assert response.value.status == 200
            expect(page.locator("#notice")).to_contain_text("Inputs changed")
            expect(page.locator("#analysis-results")).to_be_hidden()
            assert_no_export()
            page.locator("#analyze").click()
            expect(page.locator("#analysis-results")).to_be_visible()
            export_pair("new-revision-coupled", edited_raw)
            checks.append("pending_or_stale_revision_cannot_export_and_exact_raw_pair_recovers")

            def upload_projection(value, filename):
                raw = value if isinstance(value, str) else json.dumps(value, indent=2)
                page.locator("#problem-upload").set_input_files({
                    "name": filename, "mimeType": "application/json", "buffer": raw.encode(),
                })
                expect(page.locator("#problem-json")).to_have_value(raw)
                with page.expect_response(lambda r: r.url.endswith("/api/select")) as response:
                    page.locator("#analyze").click()
                assert response.value.status == 200, response.value.json()
                assert response.value.request.post_data_json == {"problem_raw": raw}
                expect(page.locator("#analysis-results")).to_be_visible()
                return response.value.json()

            def upload_projection_outcomes(value, filename):
                with page.expect_response(lambda r: r.url.endswith("/api/replay")) as response:
                    page.locator("#outcomes-upload").set_input_files({
                        "name": filename, "mimeType": "application/json", "buffer": json.dumps(value).encode(),
                    })
                return response.value

            def export_projection_replay(label, expected, outcome_path):
                with page.expect_download() as downloaded:
                    page.locator("#download-replay").click()
                replay_path = artifacts / f"{label}-full-replay.json"
                downloaded.value.save_as(replay_path)
                value = json.loads(replay_path.read_text())
                assert value == expected
                assert value["schema"] == "lupine.discovery.projection_replay.v1"
                assert value["decision"]["certificate"]["schema"] == "lupine.discovery.projection_certificate.v1"
                assert value["replay_digest"] == digest({k: v for k, v in value.items() if k != "replay_digest"})
                actual = subprocess.run([sys.executable, "-m", "lupine_discovery", "replay",
                    str((artifacts / f"{label}-problem.json").resolve()), str(outcome_path)],
                    capture_output=True, text=True, check=True)
                assert json.loads(actual.stdout) == value

            projection = select_case("projection-shared-field")
            assert projection["selection"]["retained"] == ["B"]
            assert projection["selection"] == projection["coupled_certificate"]["selection"]
            expect(page.locator("#result-title")).to_have_text("Conditional projection pool")
            expect(page.locator("#projection-panel")).to_be_visible()
            expect(page.locator("#coupled-panel")).to_be_visible()
            for section, token in (("projection-fields", "parameterization reference"),
                                   ("projection-observations", "weights"),
                                   ("projection-conversions", "entire observation"),
                                   ("projection-anchors", "uncertain-anchor"),
                                   ("projection-sources", "urn:lupine:synthetic:projection-options:v1")):
                expect(page.locator("#" + section)).to_contain_text(token)
            expect(page.locator("#projection-panel")).to_contain_text("fixed-synthetic-conditions")
            expect(page.locator("#selection-metrics")).not_to_contain_text("REGRET")
            expect(page.locator("#pool-table")).not_to_contain_text("undefined")
            export_pair("projection-shared")
            with page.expect_response(lambda r: r.url.endswith("/replay")) as response:
                page.locator("#replay-builtin").click()
            projection_replay = response.value.json()
            assert projection_replay["decision"]["certificate"] == projection
            assert projection_replay["outcome_audit"]["all_true_minimizers_retained"] is True
            export_projection_replay("projection-shared", projection_replay,
                root / "src/lupine_discovery/resources/outcomes/projection-shared-field.json")
            checks.append("projection_scoped_relation_original_pair_and_full_outer_replay_verify")

            # Control the read promises themselves: a previous replay must be
            # cleared before reading, and older files must not win by finishing last.
            page.evaluate("""() => {
                window.projectionReads = {};
                window.originalProjectionFileText = File.prototype.text;
                File.prototype.text = function () {
                    if (!this.name.startsWith('projection-read-'))
                        return window.originalProjectionFileText.call(this);
                    return new Promise((resolve, reject) => {
                        window.projectionReads[this.name] = {resolve, reject};
                    });
                };
            }""")
            replay_requests = []
            def track_projection_replay(request):
                if request.url.endswith("/api/replay"):
                    replay_requests.append(request.post_data)
            page.on("request", track_projection_replay)
            def pending_outcome_file(name):
                page.locator("#outcomes-upload").set_input_files({
                    "name": name, "mimeType": "application/json", "buffer": b"{}",
                })
                page.wait_for_function("name => Boolean(window.projectionReads[name])", arg=name)
                expect(page.locator("#download-replay")).to_be_disabled()
                expect(page.locator("#replay-results")).to_be_hidden()
            pending_outcome_file("projection-read-failed.json")
            page.evaluate("window.projectionReads['projection-read-failed.json'].reject(new Error('Synthetic file read failed'))")
            expect(page.locator("#notice")).to_contain_text("Synthetic file read failed")
            expect(page.locator("#download-replay")).to_be_disabled()
            assert not replay_requests
            pending_outcome_file("projection-read-older.json")
            pending_outcome_file("projection-read-latest.json")
            race_truth = get_case_outcomes("projection-shared-field", get_case("projection-shared-field")["problem"])
            with page.expect_response(lambda r: r.url.endswith("/api/replay")) as response:
                page.evaluate("raw => window.projectionReads['projection-read-latest.json'].resolve(raw)", json.dumps(race_truth))
            latest_replay = response.value.json()
            assert latest_replay["outcome_audit"]["all_true_minimizers_retained"] is True
            expect(page.locator("#download-replay")).to_be_enabled()
            race_truth["outcomes"][0]["score"] = "3"
            race_truth["outcomes"][1]["score"] = "4"
            page.evaluate("""async raw => {
                window.projectionReads['projection-read-older.json'].resolve(raw);
                await Promise.resolve(); await Promise.resolve();
            }""", json.dumps(race_truth))
            assert len(replay_requests) == 1
            export_projection_replay("projection-shared", latest_replay,
                root / "src/lupine_discovery/resources/outcomes/projection-shared-field.json")
            page.evaluate("() => { File.prototype.text = window.originalProjectionFileText; }")
            page.remove_listener("request", track_projection_replay)
            checks.append("projection_failed_or_older_outcome_reads_cannot_restore_stale_replay")

            missing = select_case("projection-missing-bound")
            assert missing["prepared_problem"] is None and missing["coupled_certificate"] is None
            assert missing["selection"]["retained"] == ["A", "B"]
            expect(page.locator("#result-title")).to_have_text("Screening withheld · no prepared model")
            expect(page.locator('[data-reason="finite_field_bound_missing"]')).to_be_visible()
            expect(page.locator("#coupled-panel")).to_be_hidden()
            expect(page.locator("#pool-table tbody tr")).to_have_count(2)
            expect(page.locator("#pool-table .score-line")).to_have_count(0)
            expect(page.locator("#pool-table")).not_to_contain_text("undefined")
            expect(page.locator("#pool-table")).to_contain_text("No prepared model or feasibility certificate")
            export_pair("projection-missing")
            with page.expect_response(lambda r: r.url.endswith("/replay")) as response:
                page.locator("#replay-builtin").click()
            missing_replay = response.value.json()
            assert missing_replay["outcome_audit"]["all_true_minimizers_retained"] is True
            assert missing_replay["provided_world_audit"]["status"] == "unavailable_no_prepared_model"
            expect(page.locator("#provided-world-audit")).to_contain_text("No prepared model exists")
            page.locator("#coupled-replay-coverage").evaluate("element => element.open = true")
            expect(page.locator("#coupled-replay-coverage")).to_contain_text("No intervals or coverage rates were manufactured")
            export_projection_replay("projection-missing", missing_replay,
                root / "src/lupine_discovery/resources/outcomes/projection-missing-bound.json")
            missing_truth = get_case_outcomes("projection-missing-bound", get_case("projection-missing-bound")["problem"])
            missing_truth["outcomes"][0]["score"] = None
            missing_truth["latent_world"] = {"kind": "hypothetical_model_world", "point": ["0"] * 4}
            response = upload_projection_outcomes(missing_truth, "projection-partial-no-model.json")
            assert response.status == 200
            assert response.json()["outcome_audit"]["all_true_minimizers_retained"] is None
            assert response.json()["decision"]["certificate"] == missing
            expect(page.locator("#replay-results")).to_contain_text("full-universe optimum retention unresolved")
            expect(page.locator("#provided-world-audit")).to_contain_text("Outcome point supplied: Yes")
            expect(page.locator("#provided-world-audit")).to_contain_text("Empty mismatches do not mean a fit")
            checks.append("projection_no_model_full_and_partial_truth_preserve_abstention")

            tied = select_case("projection-tie")
            assert tied["selection"]["retained"] == ["A", "B"]
            with page.expect_response(lambda r: r.url.endswith("/replay")) as response:
                page.locator("#replay-builtin").click()
            assert response.value.json()["outcome_audit"]["true_minimizer_ids"] == ["A", "B"]
            expect(page.locator("#replay-results")).to_contain_text("9/2")
            checks.append("projection_exact_ties_survive_original_scope_replay")

            projection = select_case("projection-shared-field")
            projection_problem = get_case("projection-shared-field")["problem"]
            false_projection_truth = get_case_outcomes("projection-shared-field", projection_problem)
            false_projection_truth["outcomes"][0]["score"] = "3"
            false_projection_truth["outcomes"][1]["score"] = "4"
            response = upload_projection_outcomes(false_projection_truth, "projection-false-common-world.json")
            assert response.status == 200
            failed = response.json()
            assert failed["outcome_audit"]["lost_optimum_ids"] == ["A"]
            assert failed["diagnostics"]["marginal_coverage"]["score_coverage"]["rate"] == "1"
            expect(page.locator("#replay-results")).to_contain_text("Actual projection selection lost a true feasible optimum")
            expect(page.locator("#provided-world-audit")).to_contain_text("does not match all reported quantities")
            page.locator("#coupled-replay-coverage").evaluate("element => element.open = true")
            expect(page.locator("#coupled-replay-coverage")).to_contain_text("Score: 2 / 2")
            page.screenshot(path=str(artifacts / "desktop-projection-negative-control.png"), full_page=True)
            checks.append("projection_false_common_world_loss_stays_visible_despite_marginal_coverage")

            metadata_only = json.loads(json.dumps(projection_problem))
            metadata_text = '<img src="never-load" onerror="window.projectionMetadataExecuted=true"> declared source only'
            metadata_only["projection"]["sources"][0]["reference"] = metadata_text
            metadata_only["projection"]["sources"][0]["source_uri"] = 'javascript:window.projectionMetadataExecuted=true'
            metadata_raw = "\n  " + json.dumps(metadata_only, indent=3) + "\n\n"
            changed = upload_projection(metadata_raw, "projection-metadata-only.json")
            assert changed["problem_digest"] != projection["problem_digest"]
            assert changed["projection"]["relation_digest"] != projection["projection"]["relation_digest"]
            assert changed["coupled_certificate"]["problem_digest"] != projection["coupled_certificate"]["problem_digest"]
            assert changed["coupled_certificate"]["model_identity"]["kernel_model_digest"] == projection["coupled_certificate"]["model_identity"]["kernel_model_digest"]
            expect(page.locator("#projection-sources")).to_contain_text(metadata_text)
            expect(page.locator("#projection-sources a, #projection-sources img")).to_have_count(0)
            assert page.evaluate("window.projectionMetadataExecuted") is None
            export_pair("projection-metadata", metadata_raw)
            rejected = subprocess.run([sys.executable, "-m", "lupine_discovery", "verify",
                str((artifacts / "projection-metadata-problem.json").resolve()),
                str((artifacts / "projection-shared-paired-certificate.json").resolve())], capture_output=True, text=True)
            assert rejected.returncode == 2
            response = upload_projection_outcomes(get_case_outcomes("projection-shared-field", projection_problem), "stale-projection-outcomes.json")
            assert response.status == 400
            expect(page.locator("#notice")).to_contain_text("sealed original projection decision")
            expect(page.locator("#download-replay")).to_be_disabled()
            expect(page.locator("#replay-results")).to_be_hidden()
            checks.append("projection_metadata_is_text_and_changes_outer_seals_without_changing_kernel")

            empirical = json.loads(json.dumps(projection_problem))
            empirical["projection"]["blocks"][0]["field_bound_basis"] = "empirical_residual"
            unsupported = upload_projection(empirical, "projection-empirical-field.json")
            assert unsupported["prepared_problem"] is None
            assert unsupported["selection"]["retained"] == ["A", "B"]
            expect(page.locator('[data-reason="empirical_field_range_is_not_a_global_bound"]')).to_be_visible()
            with patch("lupine_discovery.server.run_coupled", side_effect=CoupledWorkerError(
                    "worker_timeout", "Synthetic projection guard failure; no receipt.")):
                with page.expect_response(lambda r: r.url.endswith("/api/select")) as response:
                    page.locator("#analyze").click()
                assert response.value.status == 503
                expect(page.locator("#analysis-results")).to_be_hidden()
                assert_no_export()
            explicit_proof = json.loads(json.dumps(projection_problem))
            explicit_proof["screening"]["proofs"] = [{"kind": "not-accepted-in-v1"}]
            page.locator("#json-editor").evaluate("element => element.open = true")
            page.locator("#problem-json").fill(json.dumps(explicit_proof))
            with page.expect_response(lambda r: r.url.endswith("/api/select")) as response:
                page.locator("#analyze").click()
            assert response.value.status == 400
            expect(page.locator("#notice")).to_contain_text("proofs=[]")
            assert_no_export()
            checks.append("projection_empirical_bounds_and_invalid_proofs_or_guard_failures_never_fake_model")

            # A real in-profile receipt whose pretty representation exceeds the
            # verifier's 2 MiB document cap must remain re-verifiable on export.
            large_problem = json.loads(json.dumps(projection_problem))
            large_problem["projection"]["anchors"] = []
            large_problem["projection"]["observations"] = large_problem["projection"]["observations"][:2]
            large_problem["screening"]["consistency_point"] = ["0"] * 3
            candidate = large_problem["projection"]["candidates"][0]
            large_problem["projection"]["candidates"] = [
                dict(json.loads(json.dumps(candidate)), candidate_id=f"{index:02d}" + "x" * 38)
                for index in range(64)
            ]
            large_certificate = upload_projection(large_problem, "projection-large-receipt.json")
            assert len(large_certificate["selection"]["retained"]) == 64
            assert len(json.dumps(large_certificate, indent=2).encode()) > 2 * 1024 * 1024
            export_pair("projection-large")
            exported = (artifacts / "projection-large-paired-certificate.json").read_bytes()
            assert len(exported) <= 2 * 1024 * 1024
            assert json.loads(exported) == large_certificate
            assert b"\n" not in exported
            checks.append("projection_large_receipt_compact_export_stays_within_verifier_cap")

            def upload_statistical(value, filename="decision-pool-custom.json"):
                raw = value if isinstance(value, str) else json.dumps(value, indent=2)
                page.locator("#problem-upload").set_input_files({
                    "name": filename, "mimeType": "application/json", "buffer": raw.encode(),
                })
                expect(page.locator("#problem-json")).to_have_value(raw)
                with page.expect_response(lambda r: r.url.endswith("/api/select")) as response:
                    page.locator("#analyze").click()
                assert response.value.status == 200, response.value.json()
                assert response.value.request.post_data_json == {"problem_raw": raw}
                expect(page.locator("#analysis-results")).to_be_visible()
                expect(page.locator("#decision-pool-panel")).to_be_visible()
                return response.value.json()

            def statistical_outcomes(problem, receipt, rows):
                return {"schema": "lupine.discovery.decision_pool_outcomes.v1",
                    "scenario_id": problem["protocol"]["scenario_id"],
                    "problem_digest": receipt["problem_digest"],
                    "certificate_digest": receipt["certificate_digest"],
                    "panel_digest": receipt["future_panel"]["panel_digest"],
                    "source_reference": "Constructed browser-test labels; no material experiment",
                    "rows": rows}

            def reveal_statistical(value, filename="decision-pool-custom-outcomes.json"):
                raw = "\n " + json.dumps(value, indent=2) + "\n"
                with page.expect_response(lambda r: r.url.endswith("/api/replay")) as response:
                    page.locator("#outcomes-upload").set_input_files({
                        "name": filename, "mimeType": "application/json", "buffer": raw.encode(),
                    })
                assert response.value.status == 200, response.value.json()
                assert response.value.request.post_data_json["outcomes_raw"] == raw
                expect(page.locator("#decision-pool-replay")).to_be_visible()
                return response.value.json()

            def export_statistical_replay(label, expected, outcomes):
                with page.expect_download() as downloaded:
                    page.locator("#download-replay").click()
                path = artifacts / f"{label}-full-replay.json"
                downloaded.value.save_as(path)
                replay = json.loads(path.read_text())
                assert replay == expected
                assert replay["schema"] == "lupine.discovery.decision_pool_replay.v1"
                assert replay["decision"]["certificate"]["schema"] == "lupine.discovery.decision_pool_certificate.v1"
                assert replay["replay_digest"] == digest({k: v for k, v in replay.items() if k != "replay_digest"})
                truth_path = artifacts / f"{label}-outcomes.json"
                truth_path.write_text(json.dumps(outcomes))
                cli_replay = subprocess.run([sys.executable, "-m", "lupine_discovery", "replay",
                    str((artifacts / f"{label}-problem.json").resolve()), str(truth_path.resolve())],
                    capture_output=True, text=True, check=True)
                assert json.loads(cli_replay.stdout) == replay

            def assert_statistical_pool(receipt):
                selected = receipt["selection"]
                assert page.locator("#pool-table tbody tr").evaluate_all(
                    "rows => rows.map(row => row.dataset.candidateId)") == selected["ranked_ids"]
                for forbidden in ("certified_feasible", "possible_feasible", "certified_infeasible",
                                  "dominated", "incumbent", "regret_bound", "coverage"):
                    assert forbidden not in selected
                expect(page.locator("#selection-metrics")).not_to_contain_text("REGRET")
                expect(page.locator("#pool-table .score-line")).to_have_count(0)
                expect(page.locator("#pool-table")).not_to_contain_text("undefined")
                expect(page.locator("#decision-pool-limitations")).to_contain_text("marginal")

            ranked = select_case("decision-pool-ranked-ties")
            assert ranked["calibration"]["n"] == ranked["calibration"]["complete_count"] == 3
            assert ranked["calibration"]["k"] == 2 and ranked["calibration"]["threshold"] == "1/2"
            assert ranked["selection"]["retained"] == ["a", "b"]
            assert ranked["selection"]["retained_fraction"] == "1/2"
            expect(page.locator("#result-title")).to_have_text("Statistical candidate pool")
            assert_statistical_pool(ranked)
            displayed_facts = page.locator("#decision-pool-facts > div").evaluate_all(
                "rows => Object.fromEntries(rows.map(row => [row.querySelector('dt').textContent, row.querySelector('dd').textContent]))")
            for label, value in (("Risk budget α (exact)", "1/2"), ("Calibration panels n", "3"),
                                 ("Complete calibration panels", "3"), ("Required rank k", "2"),
                                 ("Operational threshold τ", "1/2")):
                assert displayed_facts[label] == value
            expect(page.locator('#pool-table tr[data-candidate-id="b"]')).to_contain_text("2 / 4")
            expect(page.locator("#decision-pool-calibration-table tbody tr")).to_have_count(3)
            assert page.locator("#decision-pool-calibration .decision-calibration-record").evaluate_all(
                "records => records.map(record => record.dataset.panelId)") == [
                    entry["panel"]["panel_id"] for entry in ranked["calibration"]["panels"]]
            for entry in ranked["calibration"]["panels"]:
                record = page.locator(f'.decision-calibration-record[data-panel-id="{entry["panel"]["panel_id"]}"]')
                expect(record).to_contain_text(entry["outcomes"]["source_reference"])
                expect(record).to_contain_text(entry["assessment"]["assessment_digest"])
            for name in ("ranker_id", "ranking_rule_id", "tie_rule_id", "generator_id",
                         "freeze_reference", "sampling_scope", "premise_status"):
                expect(page.locator("#decision-pool-protocol")).to_contain_text(ranked["protocol"][name])
            export_pair("decision-pool-ranked")
            assert paired_schemas == {f"lupine.discovery.{prefix}problem.v1"
                                      for prefix in ("", "calibrated_", "pareto_", "coupled_", "projection_", "decision_pool_")}
            with page.expect_response(lambda r: r.url.endswith("/replay")) as response:
                page.locator("#replay-builtin").click()
            ranked_replay = response.value.json()
            assert ranked_replay["decision"]["certificate"] == ranked
            assert ranked_replay["outcome_audit"]["true_minimizer_ids"] == ["a", "c"]
            assert ranked_replay["outcome_audit"]["lost_minimizer_ids"] == ["c"]
            assert ranked_replay["outcome_audit"]["all_true_minimizers_retained"] is False
            expect(page.locator("#decision-pool-replay")).to_contain_text("c")
            expect(page.locator("#replay-results")).to_contain_text("lost")
            export_statistical_replay("decision-pool-ranked", ranked_replay,
                get_case_outcomes("decision-pool-ranked-ties", get_case("decision-pool-ranked-ties")["problem"]))
            checks.append("decision_pool_all_tied_minima_loss_original_pair_and_full_replay_verify")
            checks.append("six_schema_problem_certificate_downloads_verify_with_real_cli")
            page.screenshot(path=str(artifacts / "desktop-decision-pool-tied-loss.png"), full_page=True)

            missing_pool = select_case("decision-pool-missing-label")
            assert missing_pool["calibration"]["status"] == "incomplete_calibration"
            assert missing_pool["calibration"]["n"] == 3 and missing_pool["calibration"]["complete_count"] == 2
            assert missing_pool["calibration"]["threshold"] is None
            assert missing_pool["selection"]["retained"] == ["a", "b", "c", "d"]
            expect(page.locator("#result-title")).to_have_text("Screening withheld · incomplete calibration")
            expect(page.locator("#decision-pool-calibration-table tbody tr")).to_have_count(3)
            expect(page.locator("#decision-pool-reasons")).to_contain_text("incomplete")
            assert_statistical_pool(missing_pool)
            with page.expect_response(lambda r: r.url.endswith("/replay")) as response:
                page.locator("#replay-builtin").click()
            assert response.value.json()["outcome_audit"]["all_true_minimizers_retained"] is True
            assert response.value.json()["decision"]["certificate"] == missing_pool
            assert missing_pool["selection"]["conditional_guarantee"] is None
            checks.append("decision_pool_missing_calibration_preserves_every_panel_and_full_universe")
            page.screenshot(path=str(artifacts / "desktop-decision-pool-withheld.png"), full_page=True)

            failure_pool = select_case("decision-pool-feasible-failure")
            assert failure_pool["calibration"]["n"] == failure_pool["calibration"]["k"] == 19
            assert failure_pool["calibration"]["threshold"] == "0"
            assert failure_pool["selection"]["retained"] == []
            expect(page.locator("#result-title")).to_have_text("Empty statistical pool")
            expect(page.locator("#analysis-results")).to_contain_text("does not establish infeasibility")
            expect(page.locator("#decision-pool-calibration-table tbody tr")).to_have_count(19)
            with page.expect_response(lambda r: r.url.endswith("/replay")) as response:
                page.locator("#replay-builtin").click()
            failure_replay = response.value.json()
            assert failure_replay["outcome_audit"]["retention_test"] == "feasible_failure"
            assert failure_replay["outcome_audit"]["lost_minimizer_ids"] == ["last"]
            expect(page.locator("#decision-pool-replay")).to_contain_text("last")
            expect(page.locator("#replay-results")).to_contain_text("lost")
            checks.append("decision_pool_empty_statistical_prefix_exposes_feasible_failure")
            page.screenshot(path=str(artifacts / "desktop-decision-pool-empty-failure.png"), full_page=True)

            unsupported_problem = get_case("decision-pool-missing-label")["problem"]
            unsupported_problem["protocol"]["premise_status"] = "unsupported"
            unsupported_pool = upload_statistical(unsupported_problem)
            assert unsupported_pool["calibration"]["status"] == "unsupported_premise"
            assert unsupported_pool["calibration"]["threshold"] is None
            assert unsupported_pool["selection"]["retained"] == ["a", "b", "c", "d"]
            expect(page.locator("#result-title")).to_have_text("Screening withheld · unsupported premise")
            expect(page.locator("#decision-pool-reasons")).to_contain_text("unsupported")
            expect(page.locator("#decision-pool-reasons")).to_contain_text("incomplete")
            expect(page.locator("#decision-pool-calibration-table tbody tr")).to_have_count(3)
            base_pool_problem = get_case("decision-pool-ranked-ties")["problem"]
            insufficient_problem = json.loads(json.dumps(base_pool_problem))
            insufficient_problem["calibration_panels"] = []
            insufficient_pool = upload_statistical(insufficient_problem)
            assert insufficient_pool["calibration"]["status"] == "insufficient_calibration"
            assert insufficient_pool["calibration"]["n"] == 0 and insufficient_pool["calibration"]["k"] == 1
            assert insufficient_pool["selection"]["retained"] == ["a", "b", "c", "d"]
            expect(page.locator("#result-title")).to_have_text("All retained · insufficient calibration")
            finite_one_problem = json.loads(json.dumps(base_pool_problem))
            for entry in finite_one_problem["calibration_panels"]:
                last = entry["panel"]["ranked_ids"][-1]
                for row in entry["outcomes"]["rows"]:
                    row["score"] = "0" if row["candidate_id"] == last else "1"
                    row["constraints"] = {key: "0" for key in row["constraints"]}
            finite_one_pool = upload_statistical(finite_one_problem)
            assert finite_one_pool["calibration"]["status"] == "finite_conditional"
            assert finite_one_pool["calibration"]["threshold"] == "1"
            assert finite_one_pool["selection"]["retained"] == ["a", "b", "c", "d"]
            expect(page.locator("#result-title")).to_have_text("All retained · finite threshold")
            checks.append("decision_pool_unsupported_missing_insufficient_and_finite_one_are_distinct")

            boundary_problem = json.loads(json.dumps(base_pool_problem))
            boundary_problem["protocol"]["constraint_scopes"] = {}
            boundary_problem["alpha"] = "1/4"
            for entry in boundary_problem["calibration_panels"]:
                for row in entry["outcomes"]["rows"]:
                    row["constraints"] = {}
            boundary_pool = upload_statistical(boundary_problem)
            assert boundary_pool["calibration"]["k"] == 3
            assert boundary_pool["calibration"]["threshold"] == "3/4"
            assert boundary_pool["selection"]["retained"] == ["a", "b", "c"]
            boundary_problem["alpha"] = "1/5"
            unresolved_pool = upload_statistical(boundary_problem)
            assert unresolved_pool["calibration"]["k"] == 4
            assert unresolved_pool["calibration"]["status"] == "insufficient_calibration"
            assert unresolved_pool["selection"]["retained"] == ["a", "b", "c", "d"]
            boundary_problem["protocol"]["premise_status"] = "unsupported"
            unsupported_only = upload_statistical(boundary_problem)
            assert unsupported_only["calibration"]["status"] == "unsupported_premise"
            assert unsupported_only["calibration"]["complete_count"] == 3
            assert unsupported_only["selection"]["conditional_guarantee"] is None
            checks.append("decision_pool_zero_constraints_exact_resolution_and_unsupported_complete_input")

            empty_problem = json.loads(json.dumps(base_pool_problem))
            empty_problem["future_panel"]["candidate_ids"] = []
            empty_problem["future_panel"]["ranked_ids"] = []
            empty_problem["future_panel"]["universe_id"] += "-empty-browser-case"
            empty_pool = upload_statistical(empty_problem)
            assert empty_pool["selection"]["retained"] == [] and empty_pool["selection"]["retained_fraction"] is None
            expect(page.locator("#result-title")).to_have_text("Empty candidate universe")
            empty_replay = reveal_statistical(statistical_outcomes(empty_problem, empty_pool, []))
            assert empty_replay["outcome_audit"]["retention_test"] == "vacuous_empty_universe"
            expect(page.locator("#decision-pool-replay")).to_contain_text("vacuous")
            assert empty_replay["outcome_audit"]["all_true_minimizers_retained"] is True
            complete_pool = upload_statistical(base_pool_problem)
            rows = get_case_outcomes("decision-pool-ranked-ties", base_pool_problem)["rows"]
            assert base_pool_problem["protocol"]["constraint_scopes"], "infeasibility probe requires a declared constraint"
            for row in rows:
                row["constraints"] = {key: "1" for key in row["constraints"]}
            vacuous_replay = reveal_statistical(statistical_outcomes(base_pool_problem, complete_pool, rows))
            assert vacuous_replay["outcome_audit"]["retention_test"] == "vacuous_no_feasible_candidate"
            assert vacuous_replay["outcome_audit"]["true_minimizer_ids"] == []
            expect(page.locator("#decision-pool-replay")).to_contain_text("vacuous")
            rows[0]["score"] = None
            partial_replay = reveal_statistical(statistical_outcomes(base_pool_problem, complete_pool, rows))
            for key in ("reported_feasible_ids", "true_minimizer_ids", "true_optimum_value",
                        "has_feasible_candidate", "all_true_minimizers_retained", "lost_minimizer_ids", "threshold_event_holds"):
                assert partial_replay["outcome_audit"][key] is None, key
            assert partial_replay["outcome_audit"]["retention_test"] == "unknown_incomplete_truth"
            expect(page.locator("#decision-pool-replay")).to_contain_text("unknown")
            assert partial_replay["decision"]["certificate"] == complete_pool
            checks.append("decision_pool_empty_vacuous_and_partial_future_truth_remain_distinct")

            metadata_pool_problem = json.loads(json.dumps(base_pool_problem))
            metadata_pool_problem["future_panel"]["ranked_ids"] = ["d", "b", "a", "c"]
            pool_metadata_text = '<img src="never-load" onerror="window.poolMetadataExecuted=true"> frozen declaration'
            metadata_pool_problem["protocol"]["freeze_reference"] = pool_metadata_text
            exact_pool_raw = "\n   " + json.dumps(metadata_pool_problem, indent=3) + "\n\n"
            metadata_pool = upload_statistical(exact_pool_raw)
            assert metadata_pool["selection"]["retained"] == ["d", "b"]
            assert_statistical_pool(metadata_pool)
            expect(page.locator("#decision-pool-protocol")).to_contain_text(pool_metadata_text)
            expect(page.locator("#decision-pool-protocol img")).to_have_count(0)
            assert page.evaluate("window.poolMetadataExecuted") is None
            export_pair("decision-pool-original-order", exact_pool_raw)
            checks.append("decision_pool_original_raw_rank_order_metadata_text_and_exports_preserved")

            # A worker error is an execution failure, never a scientific all-retained state.
            with patch("lupine_discovery.server.run_coupled", side_effect=CoupledWorkerError(
                    "worker_timeout", "Synthetic statistical worker timeout; no receipt.")):
                with page.expect_response(lambda r: r.url.endswith("/api/select")) as response:
                    page.locator("#analyze").click()
                assert response.value.status == 503
                expect(page.locator("#analysis-results")).to_be_hidden()
                assert_no_export()
            page.locator("#analyze").click()
            expect(page.locator("#analysis-results")).to_be_visible()
            export_pair("decision-pool-recovered", exact_pool_raw)
            page.locator("#json-editor").evaluate("element => element.open = true")
            page.locator("#problem-json").fill(exact_pool_raw + " ")
            expect(page.locator("#analysis-results")).to_be_hidden()
            assert_no_export()
            def edit_statistical_while_pending(route):
                response = route.fetch()
                assert_no_export()
                page.locator("#problem-json").fill(exact_pool_raw + "\n  ")
                route.fulfill(response=response)
            page.route("**/api/select", edit_statistical_while_pending, times=1)
            with page.expect_response(lambda r: r.url.endswith("/api/select")) as response:
                page.locator("#analyze").click()
            assert response.value.status == 200
            expect(page.locator("#notice")).to_contain_text("Inputs changed")
            expect(page.locator("#analysis-results")).to_be_hidden()
            assert_no_export()
            checks.append("decision_pool_worker_failure_and_input_edits_clear_stale_exports")

            selected_for_reads = select_case("decision-pool-ranked-ties")
            read_truth = get_case_outcomes("decision-pool-ranked-ties", base_pool_problem)
            reveal_statistical(read_truth)
            with patch("lupine_discovery.server.run_coupled", side_effect=CoupledWorkerError(
                    "worker_timeout", "Synthetic statistical replay failure; no replay.")):
                with page.expect_response(lambda r: r.url.endswith("/replay")) as response:
                    page.locator("#replay-builtin").click()
                assert response.value.status == 503
                expect(page.locator("#replay-results")).to_be_hidden()
                expect(page.locator("#download-replay")).to_be_disabled()
                expect(page.locator("#download-problem")).to_be_enabled()
                expect(page.locator("#download-certificate")).to_be_enabled()
            page.evaluate("""() => {
                window.statisticalReads = {};
                window.originalStatisticalFileText = File.prototype.text;
                File.prototype.text = function () {
                    if (!this.name.startsWith('decision-pool-read-'))
                        return window.originalStatisticalFileText.call(this);
                    return new Promise((resolve, reject) => {
                        window.statisticalReads[this.name] = {resolve, reject};
                    });
                };
            }""")
            statistical_requests = []
            def track_statistical_request(request):
                if request.url.endswith("/api/replay"):
                    statistical_requests.append(request.post_data)
            page.on("request", track_statistical_request)
            def pending_statistical_read(name):
                page.locator("#outcomes-upload").set_input_files({
                    "name": name, "mimeType": "application/json", "buffer": b"{}",
                })
                page.wait_for_function("name => Boolean(window.statisticalReads[name])", arg=name)
                expect(page.locator("#replay-results")).to_be_hidden()
                expect(page.locator("#download-replay")).to_be_disabled()
            pending_statistical_read("decision-pool-read-failed.json")
            page.evaluate("window.statisticalReads['decision-pool-read-failed.json'].reject(new Error('Synthetic statistical file failure'))")
            expect(page.locator("#notice")).to_contain_text("Synthetic statistical file failure")
            assert not statistical_requests
            pending_statistical_read("decision-pool-read-older.json")
            pending_statistical_read("decision-pool-read-latest.json")
            latest_truth = json.loads(json.dumps(read_truth))
            latest_truth["rows"][0]["score"] = None
            with page.expect_response(lambda r: r.url.endswith("/api/replay")) as response:
                page.evaluate("raw => window.statisticalReads['decision-pool-read-latest.json'].resolve(raw)", json.dumps(latest_truth))
            latest_statistical_replay = response.value.json()
            assert latest_statistical_replay["outcome_audit"]["all_true_minimizers_retained"] is None
            assert latest_statistical_replay["decision"]["certificate"] == selected_for_reads
            expect(page.locator("#download-replay")).to_be_enabled()
            page.evaluate("""async raw => {
                window.statisticalReads['decision-pool-read-older.json'].resolve(raw);
                await Promise.resolve(); await Promise.resolve();
            }""", json.dumps(read_truth))
            assert len(statistical_requests) == 1
            expect(page.locator("#decision-pool-replay")).to_contain_text("unknown")
            with page.expect_download() as downloaded:
                page.locator("#download-replay").click()
            latest_path = artifacts / "decision-pool-latest-read-replay.json"
            downloaded.value.save_as(latest_path)
            assert json.loads(latest_path.read_text()) == latest_statistical_replay
            page.evaluate("() => { File.prototype.text = window.originalStatisticalFileText; }")
            page.remove_listener("request", track_statistical_request)
            checks.append("decision_pool_failed_replay_or_older_outcome_reads_cannot_restore_stale_results")

            page.locator("#nav-benchmarks").click()
            expect(page.locator("#benchmark-content")).to_be_visible()
            expect(page.locator("#known-case-list .known-case")).to_have_count(13)
            expect(page.locator("#archive-cards .archive-card")).to_have_count(3)
            expect(page.locator("#archive-cards")).to_contain_text("Molecular hydration energies")
            checks.append("synthetic_and_three_archived_reports_separate")
            constrained = json.loads((root / "src/lupine_discovery/resources/constrained-v1.json").read_text())
            expect(page.locator("#constrained-content")).to_be_visible()
            for gate, result in constrained["gates"].items():
                expect(page.locator(f'[data-gate="{gate}"] .gate-status')).to_have_text(result["status"])
            for arm in ("primary", "shift"):
                for budget in (0, 1, 2, 4, 8, 20):
                    row = page.locator(f'[data-arm="{arm}"] tr[data-budget="{budget}"]')
                    expect(row).to_have_count(1)
                    for policy in ("interval", "nominal_5nn", "nearest_1nn", "random_0"):
                        expect(row.locator(f'td[data-policy="{policy}"]')).to_have_count(1)
            expect(page.locator("#constrained-protocol")).to_contain_text(constrained["scientific_result_sha256"])
            expect(page.locator('[data-arm="shift"]')).to_contain_text("unsupported")
            checks.append("measured_constrained_gates_scopes_budgets_and_identity")
            training = json.loads((root / "src/lupine_discovery/resources/training-tail-v1.json").read_text())
            expect(page.locator("#training-tail-content")).to_be_visible()
            expect(page.locator("#training-tail-verdict")).to_have_attribute("data-status", training["decision"]["status"])
            expect(page.locator("#training-tail-verdict")).to_contain_text("No replacement model was selected")
            expect(page.locator("#training-tail-metrics tbody tr")).to_have_count(8)
            for model in training["models"]:
                for property in training["properties"]:
                    expect(page.locator("#training-tail-metrics")).to_contain_text(str(model["metrics"][property["id"]]["pooled"]["tail"]))
                    if model["role"] != "baseline":
                        card = page.locator(f'#training-tail-gates [data-model="{model["id"]}"]')
                        expect(card).to_have_count(1)
                        expect(card.locator(f'[data-property="{property["id"]}"]')).to_have_count(1)
                        for gate in ("ordinary", "numeric_guard"):
                            margins = training["decision"]["alternatives"][model["id"]][gate][property["id"]]["pooled_margins"]
                            for margin in margins.values():
                                expect(card).to_contain_text(str(margin))
            expect(page.locator("#training-tail-provenance")).to_contain_text(training["scientific_result_sha256"])
            expect(page.locator("#training-tail-content")).to_contain_text("No new coverage guarantee")
            for measured in training["resources"]["passes"]:
                expect(page.locator("#training-tail-content")).to_contain_text(str(measured["peak_rss_kib_linux"]))
            with page.expect_download() as downloaded:
                page.locator("#download-training-tail").click()
            training_target = artifacts / "training-tail-dashboard.json"
            downloaded.value.save_as(training_target)
            assert json.loads(training_target.read_text()) == training
            checks.append("training_only_no_go_all_models_properties_gates_costs_and_exact_export")
            mpea_response = page.request.get(url + "/api/benchmarks")
            assert mpea_response.ok
            mpea_controls = check_mpea_workbench(page, artifacts / "mpea",
                project_root / "tests/fixtures/mpea_ui", mpea_response.json().get("mpea_archived"))
            checks.extend(mpea_controls["checks"])
            page.evaluate("window.scrollTo(0, 0)")
            page.screenshot(path=str(artifacts / "desktop-benchmarks.png"), full_page=True)

            mobile = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
            mobile.on("pageerror", lambda error: errors.append(str(error)))
            mobile.goto(url, wait_until="networkidle")
            mobile.locator("#analyze").click()
            expect(mobile.locator("#analysis-results")).to_be_visible()
            assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
            mobile.locator("#case-select").select_option("calibrated-insufficient")
            expect(mobile.locator("#case-title")).to_have_text(get_case("calibrated-insufficient")["title"])
            mobile.locator("#analyze").click()
            expect(mobile.locator("#result-title")).to_have_text("Screening withheld")
            assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
            mobile.locator("#case-select").select_option("pareto-tradeoffs")
            expect(mobile.locator("#case-title")).to_have_text(get_case("pareto-tradeoffs")["title"])
            mobile.locator("#analyze").click()
            expect(mobile.locator("#result-title")).to_have_text("3 candidates in the Pareto pool")
            assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
            mobile.locator("#case-select").select_option("coupled-shared-trend")
            expect(mobile.locator("#case-title")).to_have_text(get_case("coupled-shared-trend")["title"])
            mobile.locator("#analyze").click()
            expect(mobile.locator("#result-title")).to_have_text("Conditional coupled pool")
            assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
            mobile.locator("#coupled-diagnostic").evaluate("element => element.open = true")
            assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
            mobile.locator("#case-select").select_option("projection-shared-field")
            expect(mobile.locator("#case-title")).to_have_text(get_case("projection-shared-field")["title"])
            mobile.locator("#analyze").click()
            expect(mobile.locator("#result-title")).to_have_text("Conditional projection pool")
            mobile.locator("#projection-fields").evaluate("element => element.open = true")
            mobile.locator("#projection-conversions").evaluate("element => element.open = true")
            assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
            mobile.screenshot(path=str(artifacts / "mobile-projection-scopes.png"), full_page=True)
            mobile.locator("#case-select").select_option("projection-missing-bound")
            expect(mobile.locator("#case-title")).to_have_text(get_case("projection-missing-bound")["title"])
            mobile.locator("#analyze").click()
            expect(mobile.locator("#result-title")).to_have_text("Screening withheld · no prepared model")
            assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
            mobile.locator("#case-select").select_option("decision-pool-ranked-ties")
            expect(mobile.locator("#case-title")).to_have_text(get_case("decision-pool-ranked-ties")["title"])
            mobile.locator("#analyze").click()
            expect(mobile.locator("#result-title")).to_have_text("Statistical candidate pool")
            mobile.locator("#decision-pool-panel details").evaluate_all("items => items.forEach(item => item.open = true)")
            expect(mobile.locator("#decision-pool-calibration-table tbody tr")).to_have_count(3)
            expect(mobile.locator("#decision-pool-calibration-table")).to_have_attribute("tabindex", "0")
            mobile.locator("#decision-pool-calibration-table").focus()
            mobile.keyboard.press("ArrowRight")
            assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
            mobile.locator("#replay-builtin").click()
            expect(mobile.locator("#decision-pool-replay")).to_be_visible()
            expect(mobile.locator("#replay-results")).to_contain_text("lost")
            assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
            mobile.screenshot(path=str(artifacts / "mobile-decision-pool.png"), full_page=True)
            mobile.locator("#case-select").select_option("decision-pool-feasible-failure")
            expect(mobile.locator("#case-title")).to_have_text(get_case("decision-pool-feasible-failure")["title"])
            mobile.locator("#analyze").click()
            expect(mobile.locator("#result-title")).to_have_text("Empty statistical pool")
            expect(mobile.locator("#analysis-results")).to_contain_text("does not establish infeasibility")
            assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
            checks.append("decision_pool_mobile_ordered_prefix_calibration_and_loss_have_no_overflow")
            mobile.locator("#nav-benchmarks").click()
            expect(mobile.locator("#benchmark-content")).to_be_visible()
            assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
            expect(mobile.locator("#constrained-content")).to_be_visible()
            expect(mobile.locator("#training-tail-content")).to_be_visible()
            mobile.locator('[data-arm="primary"] .constrained-table-region').focus()
            mobile.keyboard.press("ArrowRight")
            assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
            mobile.evaluate("window.scrollTo(0, 0)")
            mobile.screenshot(path=str(artifacts / "mobile-benchmarks.png"), full_page=True)
            checks.append("mobile_navigation_selection_and_no_horizontal_overflow")
            empty = browser.new_page()
            empty.on("pageerror", lambda error: errors.append(str(error)))
            def omit_training(route):
                response = route.fetch()
                report = response.json()
                report.pop("training_tail", None)
                route.fulfill(response=response, json=report)
            empty.route("**/api/benchmarks", omit_training)
            empty.goto(url + "#benchmarks", wait_until="networkidle")
            expect(empty.locator("#training-tail-status")).to_contain_text("No training-only development report is bundled")
            expect(empty.locator("#training-tail-content")).to_be_hidden()
            expect(empty.locator("#archive-cards .archive-card")).to_have_count(3)
            checks.append("missing_training_report_does_not_invent_results_or_change_archived_cards")
            assert not errors, errors
            checks.append("no_browser_javascript_errors")
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    sources_after = source_digests()
    assert sources_after == sources_before, "Browser inputs changed during the run"
    report = {"status": "passed", "checks": checks, "javascript_errors": errors,
              "mpea_constructed_fixture_sha256": mpea_controls["fixture_sha256"],
              "source_sha256": sources_after,
              "screenshots_sha256": {path.name: sha256(path.read_bytes()).hexdigest()
                                     for path in artifacts.glob("*decision-pool*.png")},
              "scope": "Chromium research-preview interaction checks; not scientific validation"}
    report_text = json.dumps(report, indent=2) + "\n"
    (artifacts / "browser-report.json").write_text(report_text)
    (artifacts / "browser-problem-export-report.json").write_text(report_text)
    (artifacts / "browser-projection-report.json").write_text(report_text)
    (artifacts.parent / "browser-decision-pool-report.json").write_text(report_text)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    run()
