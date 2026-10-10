#!/usr/bin/env python3
"""Real Chromium checks against an isolated local workbench server.

Install: pip install -e '.[test-ui]' && python -m playwright install chromium
Run: python scripts/browser_smoke.py
"""
import json
from pathlib import Path
import threading

from playwright.sync_api import expect, sync_playwright

from lupine_discovery.benchmarks import get_case
from lupine_discovery.cli import verify_certificate
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
            expect(page.locator("#case-select option")).to_have_count(14)

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

            page.locator("#nav-benchmarks").click()
            expect(page.locator("#benchmark-content")).to_be_visible()
            expect(page.locator("#known-case-list .known-case")).to_have_count(13)
            expect(page.locator("#archive-cards .archive-card")).to_have_count(3)
            expect(page.locator("#archive-cards")).to_contain_text("Molecular hydration energies")
            checks.append("synthetic_and_three_archived_reports_separate")
            page.evaluate("window.scrollTo(0, 0)")
            page.screenshot(path=str(artifacts / "desktop-benchmarks.png"), full_page=True)

            mobile = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
            mobile.on("pageerror", lambda error: errors.append(str(error)))
            mobile.goto(url, wait_until="networkidle")
            mobile.locator("#analyze").click()
            expect(mobile.locator("#analysis-results")).to_be_visible()
            assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
            mobile.locator("#nav-benchmarks").click()
            expect(mobile.locator("#benchmark-content")).to_be_visible()
            assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
            mobile.evaluate("window.scrollTo(0, 0)")
            mobile.screenshot(path=str(artifacts / "mobile-benchmarks.png"), full_page=True)
            checks.append("mobile_navigation_selection_and_no_horizontal_overflow")
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
