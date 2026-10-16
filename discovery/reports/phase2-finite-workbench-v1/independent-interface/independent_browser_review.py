"""Independent finite-planner browser review: synthetic inputs, no archive reads."""
from contextlib import ExitStack
from copy import deepcopy
from fractions import Fraction
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import threading
from unittest.mock import patch

from playwright.sync_api import expect, sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--overlay", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--mutate-stale-guards", action="store_true")
    args = parser.parse_args()
    root = args.overlay.resolve()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=False)
    sys.dont_write_bytecode = True
    sys.path.insert(0, str(root / "src"))
    from lupine_discovery import server as module

    prohibited = []
    def forbidden(*_args, **_kwargs):
        prohibited.append("forbidden scientific helper")
        raise AssertionError("This focused review cannot read scientific cases or outcomes")

    checks, requests, errors, screenshots = [], [], [], []
    with ExitStack() as stack:
        stack.enter_context(patch.object(module, "case_catalog", return_value=[]))
        for name in ("get_case", "get_case_outcomes", "archived_reports", "run_known_answers",
                     "benchmark_report", "run_coupled", "certificate", "replay_report"):
            stack.enter_context(patch.object(module, name, side_effect=forbidden))
        server = module.make_server(0)
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        origin = f"http://127.0.0.1:{server.server_address[1]}"
        try:
            with sync_playwright() as pw:
                browser = pw.chromium.launch(headless=True)
                page = browser.new_page(viewport={"width": 1440, "height": 1050})
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.on("request", lambda request: requests.append({
                    "url": request.url, "method": request.method,
                    "body": request.post_data if "/api/plan-" in request.url else None}))
                # No source file changes. The optional mutation is a labeled
                # negative control delivered only to this disposable page.
                def resource_guard(route):
                    assert route.request.url.startswith(origin + "/"), "Non-loopback request"
                    if args.mutate_stale_guards and route.request.url.endswith("/planner.js"):
                        response = route.fetch()
                        source = response.text()
                        guard = "if (revision !== requestRevision) return;"
                        assert source.count(guard) == 2
                        route.fulfill(response=response, body=source.replace(guard, "/* review-only mutation */"))
                    else:
                        route.continue_()
                page.route("**/*", resource_guard)
                # A two-frame completion marker runs after both response JSON
                # resolution and the application's promise continuation. A
                # network response event alone is not an adequate race barrier.
                page.add_init_script("""(() => {
                  const original = window.fetch;
                  window.fetch = async (...args) => {
                    const response = await original(...args);
                    if (String(args[0]).endsWith('/api/plan-finite-zero-loss')) {
                      const decode = response.json.bind(response);
                      response.json = async () => {
                        const body = await decode();
                        requestAnimationFrame(() => requestAnimationFrame(() => {
                          const html = document.documentElement;
                          html.dataset.reviewDecoded = String(Number(html.dataset.reviewDecoded || '0') + 1);
                        }));
                        return body;
                      };
                    }
                    return response;
                  };
                })();""")
                page.goto(origin, wait_until="networkidle")
                page.locator("#nav-planning").click()
                expect(page.locator("#view-planning")).to_be_visible()
                endpoint = "**/api/plan-finite-zero-loss"

                def fill(population="5", ceiling="2/5", significance="3/10", maximum="2"):
                    for name, value in (("population", population), ("ceiling", ceiling),
                                        ("significance", significance), ("maximum", maximum)):
                        page.locator(f"#finite-plan-{name}").fill(value)

                def decoded():
                    return int(page.locator("html").get_attribute("data-review-decoded") or 0)

                def wait_decoded(previous):
                    expect(page.locator("html")).to_have_attribute("data-review-decoded", str(previous + 1))

                def submit(status=200, keyboard=False):
                    prior = decoded()
                    with page.expect_response(lambda r: r.url.endswith("/api/plan-finite-zero-loss")) as pending:
                        if keyboard:
                            page.locator("#finite-plan-maximum").focus()
                            page.keyboard.press("Enter")
                        else:
                            page.locator("#finite-plan-submit").click()
                    response = pending.value
                    assert response.status == status
                    wait_decoded(prior)
                    return response.json()

                def export_matches(value, name):
                    with page.expect_download() as pending:
                        page.locator("#finite-plan-download").click()
                    download = pending.value
                    assert download.suggested_filename == "lupine-finite-zero-failure-resolution-plan.json"
                    target = out / (name + ".json")
                    download.save_as(target)
                    assert json.loads(target.read_text()) == value
                    return target

                def cleared():
                    expect(page.locator("#finite-plan-result")).to_be_hidden()
                    expect(page.locator("#finite-plan-download")).to_be_disabled()
                    expect(page.locator("#finite-plan-submit")).to_be_enabled()

                # Independent hand-enumerable null: 3 nonfailures among 5 IDs,
                # 3 all-success unordered pairs among 10 possible pairs.
                fill()
                value = submit(keyboard=True)
                plan = value["plan"]
                assert value["schema"] == "lupine.discovery.finite_zero_failure_resolution_plan.v1"
                assert plan["minimum_null_failures"] == 2
                assert plan["attainable_null_failure_fraction"] == "2/5"
                assert plan["zero_failure_null_bound"] == "3/10"
                assert plan["minimum_evaluation_panels"] == 2
                assert plan["minimum_zero_failure_null_bound"] == "3/10"
                export_matches(value, "enumerated-five-panel-pairs")
                fill(ceiling="0.4", significance="0.3")
                assert submit() == value
                expect(page.locator("#finite-plan-result")).to_contain_text("Uniform without replacement")
                expect(page.locator("#finite-plan-result")).to_contain_text("Frozen residual finite population only")
                expect(page.locator("#finite-plan-result")).to_contain_text("Not computed / no observations")
                assert plan["premise_status"] == "hypothetical_unverified"
                assert plan["future_population_risk_status"] == "not_established"
                assert any("sample size is fixed before evaluation outcomes" in p for p in plan["premises"])
                checks.append("enumerated_pair_probability_equality_decimal_equivalence_exact_export_and_scope")

                for name in ("population", "ceiling", "significance", "maximum"):
                    field = page.locator(f"#finite-plan-{name}")
                    assert page.locator(f'label[for="finite-plan-{name}"]').inner_text().strip()
                    help_id = field.get_attribute("aria-describedby")
                    assert help_id and page.locator("#" + help_id).inner_text().strip()
                status = page.locator("#finite-plan-status")
                assert status.get_attribute("role") == "status"
                assert status.get_attribute("aria-live") == "polite"
                page.locator("#finite-plan-population").focus()
                for expected in ("ceiling", "significance", "maximum", "submit"):
                    page.keyboard.press("Tab")
                    expect(page.locator("#finite-plan-" + expected)).to_be_focused()
                checks.append("four_accessible_names_help_references_live_status_and_keyboard_tab_order")

                fill(maximum="0")
                cleared()
                empty = submit()
                assert empty["plan"]["zero_failure_null_bound"] == "1"
                assert empty["plan"]["minimum_evaluation_panels"] is None
                assert empty["plan"]["minimum_zero_failure_null_bound"] is None
                export_matches(empty, "empty-sample-cap")
                fill(maximum="5")
                census = submit()
                assert census["plan"]["zero_failure_null_bound"] == "0"
                assert census["plan"]["observed_evidence_status"] == "no_observations"
                expect(page.locator("#finite-plan-result")).to_contain_text("impossible zero-failure sample under the stated finite null")
                export_matches(census, "hypothetical-census")
                checks.append("zero_cap_nulls_and_census_zero_are_hypothetical_not_observed_success")

                for other in ("pool", "zero"):
                    with page.expect_response(lambda r: r.url.endswith("/api/plan-pool") or r.url.endswith("/api/plan-zero-loss")):
                        page.locator(f"#{other}-plan-submit").click()
                    expect(page.locator(f"#{other}-plan-result")).to_be_visible()
                before_other = {other: page.locator(f"#{other}-plan-result").inner_text() for other in ("pool", "zero")}
                fill(significance="1")
                cleared()
                submit(400)
                cleared()
                assert "error" in status.get_attribute("class")
                for other in ("pool", "zero"):
                    assert page.locator(f"#{other}-plan-result").inner_text() == before_other[other]
                    expect(page.locator(f"#{other}-plan-download")).to_be_enabled()
                fill()
                assert submit() == value
                export_matches(value, "recovered-after-real-error")
                checks.append("per_form_invalidation_preserves_iid_plans_and_real_http_error_recovers")

                for success in (True, False):
                    held = []
                    def hold(route):
                        held.append((route, route.fetch()))
                        page.locator("html").evaluate("(el, n) => {el.dataset.reviewHeld=String(n)}", len(held))
                    page.route(endpoint, hold)
                    fill(population="11", significance="1/20" if success else "1", maximum="9")
                    page.locator("#finite-plan-submit").click()
                    expect(page.locator("html")).to_have_attribute("data-review-held", "1")
                    fill()
                    page.locator("#finite-plan-submit").click()
                    expect(page.locator("html")).to_have_attribute("data-review-held", "2")
                    before = decoded()
                    held[1][0].fulfill(response=held[1][1])
                    wait_decoded(before)
                    expect(page.locator("#finite-plan-result")).to_be_visible()
                    newest_text = page.locator("#finite-plan-result").inner_text()
                    before = decoded()
                    held[0][0].fulfill(response=held[0][1])
                    wait_decoded(before)
                    assert page.locator("#finite-plan-result").inner_text() == newest_text, "stale response changed newest result"
                    assert "error" not in status.get_attribute("class"), "stale error changed newest status"
                    export_matches(value, "stale-success-ignored" if success else "stale-error-ignored")
                    page.unroute(endpoint, hold)
                checks.append("stale_success_and_stale_error_ignored_after_two_frame_json_completion_barrier")

                for scope, key, bad in (("plan", "claim_scope", "future_population"),
                                        ("plan", "future_population_risk_status", "established"),
                                        ("plan", "premise_status", "verified"),
                                        ("response", "scientific_guarantee", True)):
                    def forge(route):
                        response = route.fetch()
                        body = deepcopy(response.json())
                        (body["plan"] if scope == "plan" else body)[key] = bad
                        route.fulfill(response=response, json=body)
                    page.route(endpoint, forge)
                    fill()
                    submit()
                    cleared()
                    expect(status).to_contain_text("unsupported planning result")
                    page.unroute(endpoint, forge)
                fill()
                assert submit() == value
                checks.append("forged_scope_premise_future_claim_and_extra_response_field_fail_closed")

                fill("256", "71/256", "1/20", "71")
                large = submit()
                exact = large["plan"]["zero_failure_null_bound"]
                assert isinstance(exact, str) and len(exact) >= 90 and 0 < Fraction(exact) < 1
                export_matches(large, "large-exact")
                details = page.locator("#finite-plan-result details")
                details.locator("summary").click()
                assert json.loads(details.locator("pre").inner_text()) == large
                for width in (1440, 320):
                    page.set_viewport_size({"width": width, "height": 1050 if width == 1440 else 844})
                    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
                    expect(page.locator("#finite-plan-result")).to_contain_text(exact)
                    page.evaluate("window.scrollTo(0,0)")
                    card = page.locator("#finite-plan-heading").locator("..")
                    box = card.bounding_box()
                    assert box
                    name = f"finite-card-{width}.png"
                    page.screenshot(path=str(out / name), clip=box, full_page=True)
                    screenshots.append(name)
                checks.append("exact_details_export_match_and_desktop_mobile_320_no_horizontal_overflow")

                page.locator("#nav-workbench").click()
                expect(page.locator("#view-workbench")).to_be_visible()
                page.locator("#nav-planning").click()
                expect(page.locator("#finite-plan-result")).to_be_visible()
                export_matches(large, "navigation-preserved")
                allowed = {"/api/catalog", "/api/plan-pool", "/api/plan-zero-loss", "/api/plan-finite-zero-loss"}
                for request in requests:
                    suffix = request["url"].removeprefix(origin)
                    assert "/api/" not in suffix or suffix in allowed
                    if suffix == "/api/plan-finite-zero-loss":
                        assert set(json.loads(request["body"])) == {"population_panels", "loss_ceiling", "significance", "maximum_evaluation_panels"}
                assert not prohibited
                assert not errors
                checks.append("navigation_preserves_result_and_only_four_declared_inputs_reach_finite_route")
                browser.close()
        finally:
            server.shutdown()
            server.server_close()
            worker.join(timeout=5)
    report = {"scope": "independent synthetic browser review; no observations or scientific experiment",
              "checks": checks, "check_count": len(checks), "javascript_errors": errors,
              "prohibited_scientific_calls": prohibited, "requests": requests,
              "mutation_control": args.mutate_stale_guards, "screenshots": screenshots}
    (out / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: report[key] for key in ("scope", "check_count", "javascript_errors", "mutation_control")}))


if __name__ == "__main__":
    main()
