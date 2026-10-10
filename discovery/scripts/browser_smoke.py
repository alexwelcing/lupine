#!/usr/bin/env python3
"""Real Chromium checks against an isolated local workbench server.

Install: pip install -e '.[test-ui]' && python -m playwright install chromium
Run: python scripts/browser_smoke.py
"""
import json
from pathlib import Path
import threading
from unittest.mock import patch

from playwright.sync_api import expect, sync_playwright

from lupine_discovery.benchmarks import case_catalog, get_case, get_case_outcomes
from lupine_discovery.cli import verify_certificate
from lupine_discovery.coupled_worker import CoupledWorkerError
from lupine_discovery.server import make_server


def run():
    artifacts = Path(".cache/browser")
    artifacts.mkdir(parents=True, exist_ok=True)
    server = make_server(0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_address[1]}"
    checks = []
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1440, "height": 1050})
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(url, wait_until="networkidle")
            expect(page.locator("#case-select option")).to_have_count(len(case_catalog()) + 1)

            def select_case(case_id):
                page.locator("#case-select").select_option(case_id)
                expect(page.locator("#case-title")).to_have_text(get_case(case_id)["title"])
                with page.expect_response(lambda r: r.url.endswith("/api/select")) as response:
                    page.locator("#analyze").click()
                expect(page.locator("#analysis-results")).to_be_visible()
                return response.value.json()

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

            original_raw = "\n  " + json.dumps(problem, indent=3) + "\n\n"
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
            with patch("lupine_discovery.server.run_coupled", side_effect=CoupledWorkerError(
                    "worker_timeout", "Synthetic guard timeout: no receipt produced.")):
                with page.expect_response(lambda r: r.url.endswith("/api/select")) as response:
                    page.locator("#analyze").click()
                assert response.value.status == 503
                expect(page.locator("#notice")).to_contain_text("Synthetic guard timeout")
                expect(page.locator("#analysis-results")).to_be_hidden()
            page.locator("#analyze").click()
            expect(page.locator("#analysis-results")).to_be_visible()
            expect(page.locator("#problem-json")).to_have_value(original_raw)
            checks.append("coupled_raw_input_preserved_and_guard_failure_clears_stale_receipt")

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
    report = {"status": "passed", "checks": checks, "javascript_errors": errors,
              "scope": "Chromium research-preview interaction checks; not scientific validation"}
    (artifacts / "browser-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    run()
