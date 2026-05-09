#!/usr/bin/env python3
"""Run the Lupine financial analysis in pure Python.

Loads source data from business-plan/value-model/*.csv, computes:
  - DCF for bear / base / bull
  - WACC vs terminal-growth sensitivity table for the base case
  - Comparable-company medians and implied Lupine valuation
  - Probability-weighted exit return analysis

Writes the report to business-plan/financials/analysis_report.md.
Re-run any time a CSV cell changes.

Usage:
    python3 business-plan/scripts/analyze.py [--check]

--check  Exit non-zero if the report is out of sync with the CSVs.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib_finance import (
    DCFResult,
    Outcome,
    capm_cost_of_equity,
    dcf,
    expected_value,
    fmt_money,
    fmt_pct,
    fmt_signed_pct,
    implied_valuation,
    irr_5y_from_multiple,
    median_multiple,
    wacc,
    wacc_sensitivity,
)

ROOT = Path(__file__).resolve().parent.parent
VALUE_MODEL = ROOT / "value-model"
OUT = ROOT / "financials" / "analysis_report.md"
OUT_JSON = ROOT / "financials" / "analysis_data.json"

# ---------------------------------------------------------------------------
# CSV loading
# ---------------------------------------------------------------------------

def load(csv_name: str) -> list[dict]:
    with (VALUE_MODEL / csv_name).open() as f:
        return list(csv.DictReader(f))


def find(rows: list[dict], **kv) -> dict:
    for r in rows:
        if all(r.get(k) == v for k, v in kv.items()):
            return r
    raise KeyError(f"No row matching {kv}")


def num(v, default: float | None = None) -> float:
    if v in (None, "", "n/a", "negative"):
        return float("nan") if default is None else default
    return float(v)


# ---------------------------------------------------------------------------
# Build inputs
# ---------------------------------------------------------------------------

def build_fcf_streams(revenue_rows: list[dict], dcf_input_rows: list[dict]):
    """Return {scenario: [fcf, fcf, ...]} for bear/base/bull."""
    base_fcfs = [num(find(revenue_rows, id="fcf")[f"fy{2026 + i}"]) for i in range(7)]
    bear_fcfs = [num(find(dcf_input_rows, id=f"fy{26 + i}-fcf-bear")["value"]) for i in range(7)]
    bull_fcfs = [num(find(dcf_input_rows, id=f"fy{26 + i}-fcf-bull")["value"]) for i in range(7)]
    return {"bear": bear_fcfs, "base": base_fcfs, "bull": bull_fcfs}


def build_wacc_inputs(dcf_input_rows: list[dict]) -> dict:
    rf = num(find(dcf_input_rows, id="risk-free-rate")["value"]) / 100
    beta = num(find(dcf_input_rows, id="beta-base")["value"])
    erp = num(find(dcf_input_rows, id="equity-risk-premium")["value"]) / 100
    coe = capm_cost_of_equity(rf, beta, erp)
    base_wacc = wacc(coe)
    return {
        "risk_free_rate": rf,
        "beta": beta,
        "equity_risk_premium": erp,
        "cost_of_equity": coe,
        "wacc": base_wacc,
        "wacc_bear": num(find(dcf_input_rows, id="wacc-bear")["value"]) / 100,
        "wacc_bull": num(find(dcf_input_rows, id="wacc-bull")["value"]) / 100,
        "g_base": num(find(dcf_input_rows, id="terminal-growth-base")["value"]) / 100,
        "g_bear": num(find(dcf_input_rows, id="terminal-growth-bear")["value"]) / 100,
        "g_bull": num(find(dcf_input_rows, id="terminal-growth-bull")["value"]) / 100,
    }


# ---------------------------------------------------------------------------
# Report rendering
# ---------------------------------------------------------------------------

def render_table(headers: list[str], rows: list[list[str]], aligns: list[str] | None = None) -> str:
    aligns = aligns or ["left"] * len(headers)
    sep = []
    for a in aligns:
        if a == "right":
            sep.append("---:")
        elif a == "center":
            sep.append(":---:")
        else:
            sep.append("---")
    out = "| " + " | ".join(headers) + " |\n"
    out += "|" + "|".join(sep) + "|\n"
    for row in rows:
        out += "| " + " | ".join(str(c) for c in row) + " |\n"
    return out


def section_dcf(scenarios: dict, wacc_in: dict, sector_unlock: dict) -> str:
    out = ["## 2. DCF Valuation\n"]
    out.append(
        "Mid-year discount, 7-year projection (FY26–FY32), Gordon-growth "
        "terminal value. All figures $M.\n"
    )

    out.append("### 2.1 WACC build (base case, CAPM)\n")
    out.append(
        render_table(
            ["Component", "Value"],
            [
                ["Risk-free rate (US 10Y)", fmt_pct(wacc_in["risk_free_rate"], 2)],
                ["Levered beta (vertical SaaS)", f"{wacc_in['beta']:.2f}"],
                ["Equity risk premium", fmt_pct(wacc_in["equity_risk_premium"], 2)],
                ["Cost of equity", fmt_pct(wacc_in["cost_of_equity"], 2)],
                ["Debt weight", "0.0% (all-equity at seed)"],
                ["**WACC (base)**", f"**{fmt_pct(wacc_in['wacc'], 2)}**"],
                ["WACC (bear, execution risk uplift)", fmt_pct(wacc_in["wacc_bear"], 2)],
                ["WACC (bull, derisked)", fmt_pct(wacc_in["wacc_bull"], 2)],
                ["Terminal growth (base)", fmt_pct(wacc_in["g_base"], 2)],
            ],
        )
    )

    out.append("\n### 2.2 Three-scenario DCF\n")

    rows = []
    results = {}
    for scen, fcfs in scenarios.items():
        w = wacc_in[f"wacc_{scen}" if scen != "base" else "wacc"]
        g = wacc_in[f"g_{scen}"]
        r = dcf(fcfs, w, g)
        results[scen] = r
        rows.append([
            scen.title(),
            fmt_pct(w, 1),
            fmt_pct(g, 1),
            fmt_money(r.sum_pv_fcfs),
            fmt_money(r.pv_terminal),
            fmt_money(r.enterprise_value),
            fmt_pct(r.terminal_pct_of_ev, 1),
        ])
    out.append(
        render_table(
            ["Scenario", "WACC", "Term g", "Σ PV FCF", "PV Terminal", "EV", "TV % of EV"],
            rows,
        )
    )

    base = results["base"]
    out.append("\n### 2.3 Base-case FCF projection ($M)\n")
    fcfs = scenarios["base"]
    rows = []
    rows.append(["FY"] + [f"FY{2026+i}" for i in range(7)])
    rows.append(["FCF"] + [fmt_money(f) for f in fcfs])
    rows.append(["Period"] + [f"{0.5 + i:.1f}" for i in range(7)])
    rows.append(["Disc factor"] + [f"{df:.4f}" for df in base.discount_factors])
    rows.append(["PV FCF"] + [fmt_money(p) for p in base.pv_fcfs])
    out.append(render_table(rows[0], rows[1:]))

    out.append("\n### 2.4 Comparison to proposed post-money\n")
    proposed_post = 150.0
    margin_of_safety = base.equity_value / proposed_post - 1
    out.append(
        render_table(
            ["Item", "Value"],
            [
                ["DCF intrinsic equity value (base)", fmt_money(base.equity_value)],
                ["Proposed post-money (mid-point)", fmt_money(proposed_post)],
                ["**Margin of safety**", f"**{fmt_signed_pct(margin_of_safety)}**"],
                ["Bear case equity value", fmt_money(results["bear"].equity_value)],
                ["Bull case equity value", fmt_money(results["bull"].equity_value)],
            ],
        )
    )

    return "\n".join(out)


def section_sensitivity(scenarios: dict, wacc_in: dict) -> str:
    out = ["\n## 3. Sensitivity: WACC vs Terminal Growth (base-case FCFs)\n"]
    base_w = wacc_in["wacc"]
    base_g = wacc_in["g_base"]
    wacc_axis = [base_w - 0.020, base_w - 0.010, base_w, base_w + 0.010, base_w + 0.020]
    g_axis = [base_g - 0.010, base_g - 0.005, base_g, base_g + 0.005, base_g + 0.010]
    grid = wacc_sensitivity(scenarios["base"], wacc_axis, g_axis)
    headers = ["WACC \\ Term g"] + [fmt_pct(g, 1) for g in g_axis]
    rows = []
    for i, w in enumerate(wacc_axis):
        row = [fmt_pct(w, 1)]
        for j, _ in enumerate(g_axis):
            v = grid[i][j]
            cell = fmt_money(v, decimals=0)
            if i == 2 and j == 2:
                cell = f"**{cell}**"  # base case
            row.append(cell)
        rows.append(row)
    out.append(render_table(headers, rows))
    out.append(
        "\n_Center cell (bold) is the model's actual base-case equity value._\n"
    )
    return "\n".join(out)


def section_comps(comps_rows: list[dict], revenue_rows: list[dict]) -> str:
    out = ["\n## 4. Comparable-Company Analysis\n"]

    sim_set = ["synopsys", "cadence", "ansys-pre", "altair", "veeva"]
    ai_bio_set = ["recursion", "schrodinger", "relay-therapeutics", "roivant"]

    sim_comps = [r for r in comps_rows if r["id"] in sim_set]
    ai_bio_comps = [r for r in comps_rows if r["id"] in ai_bio_set]

    sim_median = median_multiple(sim_comps, "ev_revenue_x")
    ai_median = median_multiple(ai_bio_comps, "ev_revenue_x")

    out.append("### 4.1 Comp set medians\n")
    out.append(
        render_table(
            ["Set", "n", "Median EV/Revenue", "Median EV/EBITDA", "Median Gross Margin", "Median Growth"],
            [
                [
                    "Engineering simulation + vertical SaaS",
                    len(sim_comps),
                    f"{sim_median:.1f}x",
                    f"{median_multiple(sim_comps, 'ev_ebitda_x'):.1f}x",
                    fmt_pct(median_multiple(sim_comps, 'gross_margin_pct') / 100, 1),
                    fmt_pct(median_multiple(sim_comps, 'rev_growth_pct') / 100, 1),
                ],
                [
                    "AI-for-science premium (Recursion / Schrödinger / Relay / Roivant)",
                    len(ai_bio_comps),
                    f"{ai_median:.1f}x",
                    "n/m",
                    fmt_pct(median_multiple(ai_bio_comps, 'gross_margin_pct') / 100, 1),
                    fmt_pct(median_multiple(ai_bio_comps, 'rev_growth_pct') / 100 if any(r['rev_growth_pct'] not in ('','n/a') for r in ai_bio_comps) else 0, 1),
                ],
            ],
        )
    )

    out.append("\n### 4.2 Constituents\n")
    rows = []
    for r in comps_rows:
        if r["id"].startswith("median-"):
            continue
        rows.append(
            [
                r["company"],
                r["ticker"],
                r["sector"],
                r.get("revenue_ltm_usd_m", "") or "—",
                r.get("ev_revenue_x", "") or "—",
                r.get("rev_growth_pct", "") or "—",
                r["tier"],
            ]
        )
    out.append(
        render_table(
            ["Company", "Ticker", "Sector", "Rev LTM ($M)", "EV/Rev", "Growth %", "Tier"],
            rows,
        )
    )

    out.append("\n### 4.3 Implied Lupine valuation\n")
    arr_scenarios = [
        ("FY27 base ARR", num(find(revenue_rows, id="rev-total")["fy2027"])),
        ("FY28 base ARR", num(find(revenue_rows, id="rev-total")["fy2028"])),
        ("FY30 base ARR", num(find(revenue_rows, id="rev-total")["fy2030"])),
        ("FY32 base ARR", num(find(revenue_rows, id="rev-total")["fy2032"])),
        ("FY30 bull ARR", 200.0),
        ("FY30 bear ARR", 22.0),
    ]
    rows = []
    for label, arr in arr_scenarios:
        rows.append(
            [
                label,
                fmt_money(arr),
                fmt_money(implied_valuation(arr, sim_median), decimals=0),
                fmt_money(implied_valuation(arr, ai_median), decimals=0),
            ]
        )
    out.append(
        render_table(
            ["ARR scenario", "ARR ($M)", f"At sim median ({sim_median:.1f}x)", f"At AI-bio median ({ai_median:.1f}x)"],
            rows,
        )
    )
    return "\n".join(out)


def section_returns(check_size: float, post_money: float) -> str:
    out = ["\n## 5. Probability-Weighted Return Analysis\n"]
    ownership = check_size / post_money
    outcomes = [
        Outcome("Zero", 0.50, 0.0),
        Outcome("Modest", 0.20, 100.0),
        Outcome("Strategic", 0.20, 500.0),
        Outcome("Moonshot", 0.07, 3000.0),
        Outcome("Asymmetric tail", 0.03, 15000.0),
    ]
    ev = expected_value(outcomes, ownership_pct=ownership)
    rows = []
    for o in outcomes:
        investor_return = o.exit_value_usd_m * ownership
        irr = irr_5y_from_multiple(check_size, investor_return)
        rows.append(
            [
                o.name,
                fmt_pct(o.probability, 0),
                fmt_money(o.exit_value_usd_m, decimals=0),
                fmt_money(investor_return),
                fmt_signed_pct(irr) if irr == irr else "n/a",
            ]
        )
    out.append(
        render_table(
            ["Outcome", "P", "Exit value", f"Investor slice ({fmt_pct(ownership)})", "5-yr IRR"],
            rows,
        )
    )
    irr_weighted = irr_5y_from_multiple(check_size, ev["ev_usd_m"])
    out.append(
        f"\n**Probability-weighted EV on the slice:** {fmt_money(ev['ev_usd_m'])}M  \n"
        f"**Implied 5-year IRR (weighted):** {fmt_signed_pct(irr_weighted)}\n"
    )
    return "\n".join(out)


def section_value_unlock(unlock_rows: list[dict], accel_rows: list[dict], revenue_rows: list[dict]) -> str:
    out = ["## 1. Sector Value Unlock\n"]
    sector_totals = {
        "Compute": num(find(accel_rows, id="total-compute-unlock-2030")["economic_value_usd_b_per_year"]),
        "Travel": num(find(accel_rows, id="total-travel-unlock-2030")["economic_value_usd_b_per_year"]),
        "Bio": num(find(accel_rows, id="total-bio-unlock-2030")["economic_value_usd_b_per_year"]),
    }
    rows = [[s, f"${v:.0f}B/yr"] for s, v in sector_totals.items()]
    rows.append(["**Total**", f"**${sum(sector_totals.values()):.0f}B/yr**"])
    out.append(render_table(["Sector (2030 mature)", "Value unlock"], rows))

    out.append("\n### 1.1 Lupine attribution (revenue / value unlock)\n")
    headers = ["FY"] + [f"FY{2026+i}" for i in range(7)]
    rev = [num(find(revenue_rows, id="rev-total")[f"fy{2026+i}"]) for i in range(7)]
    pen = [num(find(revenue_rows, id="lupine-penetration-pct")[f"fy{2026+i}"]) for i in range(7)]
    unlock_total = [num(find(revenue_rows, id="sector-unlock-total")[f"fy{2026+i}"]) for i in range(7)]
    attributed = [num(find(revenue_rows, id="lupine-attributed-unlock")[f"fy{2026+i}"]) for i in range(7)]
    capture = [rev[i] / attributed[i] for i in range(7)]
    rows = [
        ["Sector unlock ($B/yr)"] + [f"{u:.1f}" for u in unlock_total],
        ["Lupine penetration"] + [fmt_pct(p / 100, 2) for p in pen],
        ["Attributed unlock ($M)"] + [f"{a:,.0f}" for a in attributed],
        ["Lupine revenue ($M)"] + [fmt_money(r) for r in rev],
        ["**Capture %**"] + [f"**{fmt_pct(c, 1)}**" for c in capture],
    ]
    out.append(render_table(headers, rows))
    out.append(
        "\n_Mature capture % of 2-3% sits in the band Synopsys / Cadence "
        "earn against semi design productivity._\n"
    )
    return "\n".join(out)


def main(check_only: bool = False) -> int:
    revenue_rows = load("lupine_revenue_v2.csv")
    dcf_input_rows = load("dcf_inputs.csv")
    sector_rows = load("sector_value_unlock.csv")
    accel_rows = load("materials_acceleration_economics.csv")
    comps_rows = load("comparable_companies_v2.csv")
    arc_rows = load("thirty_year_arc.csv")
    stack_rows = load("matter_stack.csv")
    credo_rows = load("credo.csv")
    p4_value_rows = load("phase4_addressable_value.csv")
    platform_comps_rows = load("platform_comps.csv")
    ceiling_rows = load("ceiling_scenarios.csv")
    acquirer_rows = load("strategic_acquirer_npv.csv")
    quantum_rows = load("quantum_unlocks.csv")

    scenarios = build_fcf_streams(revenue_rows, dcf_input_rows)
    wacc_in = build_wacc_inputs(dcf_input_rows)

    pieces = [
        f"# Lupine Financial Analysis — Computed Report\n\n"
        f"_Generated by `business-plan/scripts/analyze.py` on {date.today().isoformat()}.  \n"
        f"Source of truth: `business-plan/value-model/*.csv`. Re-run after any edit._\n",
        section_value_unlock(sector_rows, accel_rows, revenue_rows),
        section_dcf(scenarios, wacc_in, {"placeholder": None}),
        section_sensitivity(scenarios, wacc_in),
        section_comps(comps_rows, revenue_rows),
        section_returns(check_size=8.0, post_money=150.0),
    ]
    report = "\n".join(pieces)

    # Build a JSON payload the lupine-start /value-model route consumes
    json_payload = build_json_payload(
        revenue_rows, dcf_input_rows, sector_rows, accel_rows, comps_rows,
        scenarios, wacc_in, arc_rows, stack_rows, credo_rows,
        p4_value_rows, platform_comps_rows, ceiling_rows, acquirer_rows,
        quantum_rows,
    )
    json_text = json.dumps(json_payload, indent=2) + "\n"

    if check_only:
        existing = OUT.read_text() if OUT.exists() else ""
        existing_json = OUT_JSON.read_text() if OUT_JSON.exists() else ""
        stale = []
        if existing != report:
            stale.append("analysis_report.md")
        if existing_json != json_text:
            stale.append("analysis_data.json")
        if stale:
            print(f"OUT OF SYNC with CSVs: {', '.join(stale)}", file=sys.stderr)
            return 2
        print("analysis_report.md and analysis_data.json are in sync.")
        return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(report)
    OUT_JSON.write_text(json_text)
    print(f"Wrote {OUT.relative_to(ROOT.parent)}")
    print(f"Wrote {OUT_JSON.relative_to(ROOT.parent)}")

    # Mirror JSON into lupine-start so the React route stays in sync.
    react_data_path = ROOT.parent / "lupine-start" / "src" / "data" / "value-model.json"
    if react_data_path.parent.exists():
        react_data_path.write_text(json_text)
        print(f"Wrote {react_data_path.relative_to(ROOT.parent)}")
    return 0


def build_json_payload(revenue_rows, dcf_input_rows, sector_rows, accel_rows, comps_rows, scenarios, wacc_in, arc_rows, stack_rows, credo_rows, p4_value_rows, platform_comps_rows, ceiling_rows, acquirer_rows, quantum_rows) -> dict:
    """Single JSON document the React route consumes.

    Schema is stable; bump version + migrate consumers if changed.
    """
    years = [2026 + i for i in range(7)]

    def rev(rid):
        return [num(find(revenue_rows, id=rid)[f"fy{y}"]) for y in years]

    sector_unlock_compute = rev("sector-unlock-compute")
    sector_unlock_travel = rev("sector-unlock-travel")
    sector_unlock_bio = rev("sector-unlock-bio")
    sector_unlock_total = rev("sector-unlock-total")

    revenue_total = rev("rev-total")
    penetration_pct = rev("lupine-penetration-pct")
    attributed_unlock_m = rev("lupine-attributed-unlock")
    capture_pct = [revenue_total[i] / attributed_unlock_m[i] * 100 for i in range(7)]

    # YoY growth rates and CAGR — used by the comps scatter to place
    # Lupine on the growth axis with a CSV-derived value rather than a
    # founder estimate.
    yoy_growth_pct = []
    for i in range(7):
        prev = 0.05 if i == 0 else revenue_total[i - 1]
        yoy_growth_pct.append((revenue_total[i] / prev - 1.0) * 100 if prev > 0 else 0.0)
    fy26_to_fy30_cagr = (revenue_total[4] / revenue_total[0]) ** (1 / 4) - 1
    fy28_to_fy32_cagr = (revenue_total[6] / revenue_total[2]) ** (1 / 4) - 1

    # DCF results
    dcf_results = {}
    for scen, fcfs in scenarios.items():
        w = wacc_in[f"wacc_{scen}" if scen != "base" else "wacc"]
        g = wacc_in[f"g_{scen}"]
        r = dcf(fcfs, w, g)
        dcf_results[scen] = {
            "wacc": w,
            "terminal_growth": g,
            "fcfs": fcfs,
            "pv_fcfs": r.pv_fcfs,
            "discount_factors": r.discount_factors,
            "sum_pv_fcfs": r.sum_pv_fcfs,
            "pv_terminal": r.pv_terminal,
            "enterprise_value": r.enterprise_value,
            "terminal_pct_of_ev": r.terminal_pct_of_ev,
        }

    # Sensitivity grid (base FCFs)
    base_w = wacc_in["wacc"]
    base_g = wacc_in["g_base"]
    wacc_axis = [base_w - 0.020, base_w - 0.010, base_w, base_w + 0.010, base_w + 0.020]
    g_axis = [base_g - 0.010, base_g - 0.005, base_g, base_g + 0.005, base_g + 0.010]
    grid = wacc_sensitivity(scenarios["base"], wacc_axis, g_axis)

    # Comps
    sim_set = ["synopsys", "cadence", "ansys-pre", "altair", "veeva"]
    ai_bio_set = ["recursion", "schrodinger", "relay-therapeutics", "roivant"]

    def _clean(v):
        # NaN is not valid JSON per RFC 8259 — coerce to None so the
        # consuming React route can use null-safe handling.
        if isinstance(v, float) and v != v:
            return None
        return v

    def comp_to_json(r):
        return {
            "id": r["id"],
            "company": r["company"],
            "ticker": r["ticker"],
            "sector": r["sector"],
            "ev_revenue": _clean(num(r.get("ev_revenue_x"), float("nan"))),
            "ev_ebitda": _clean(num(r.get("ev_ebitda_x"), float("nan"))),
            "gross_margin": _clean(num(r.get("gross_margin_pct"), float("nan"))),
            "rev_growth": _clean(num(r.get("rev_growth_pct"), float("nan"))),
            "rev_ltm": _clean(num(r.get("revenue_ltm_usd_m"), float("nan"))),
            "tier": r["tier"],
        }

    sim_comps = [r for r in comps_rows if r["id"] in sim_set]
    ai_bio_comps = [r for r in comps_rows if r["id"] in ai_bio_set]
    other_comps = [r for r in comps_rows if r["id"] not in sim_set + ai_bio_set]

    sim_median = median_multiple(sim_comps, "ev_revenue_x")
    ai_median = median_multiple(ai_bio_comps, "ev_revenue_x")

    # Returns
    outcomes = [
        {"name": "Zero", "p": 0.50, "exit_m": 0.0},
        {"name": "Modest", "p": 0.20, "exit_m": 100.0},
        {"name": "Strategic", "p": 0.20, "exit_m": 500.0},
        {"name": "Moonshot", "p": 0.07, "exit_m": 3000.0},
        {"name": "Asymmetric tail", "p": 0.03, "exit_m": 15000.0},
    ]
    check_size = 8.0
    post_money = 150.0
    ownership = check_size / post_money
    ev_total = sum(o["p"] * o["exit_m"] * ownership for o in outcomes)
    weighted_irr = irr_5y_from_multiple(check_size, ev_total)

    return {
        "schema_version": 1,
        "generated_on": date.today().isoformat(),
        "round": {
            "check_size_usd_m": check_size,
            "post_money_usd_m": post_money,
            "ownership_pct": ownership,
        },
        "years": years,
        "sector_unlock": {
            "compute": sector_unlock_compute,
            "travel": sector_unlock_travel,
            "bio": sector_unlock_bio,
            "total": sector_unlock_total,
        },
        "lupine": {
            "revenue_total_m": revenue_total,
            "penetration_pct": penetration_pct,
            "attributed_unlock_m": attributed_unlock_m,
            "capture_pct": capture_pct,
            "yoy_growth_pct": yoy_growth_pct,
            "fy26_fy30_cagr_pct": fy26_to_fy30_cagr * 100,
            "fy28_fy32_cagr_pct": fy28_to_fy32_cagr * 100,
        },
        "dcf": {
            "wacc_inputs": wacc_in,
            "scenarios": dcf_results,
            "sensitivity": {
                "wacc_axis": wacc_axis,
                "g_axis": g_axis,
                "grid": grid,
            },
        },
        "comps": {
            "sim_set": [comp_to_json(r) for r in sim_comps],
            "ai_bio_set": [comp_to_json(r) for r in ai_bio_comps],
            "others": [comp_to_json(r) for r in other_comps],
            "sim_median_ev_rev": sim_median,
            "ai_bio_median_ev_rev": ai_median,
        },
        "implied_valuation": [
            {"label": "FY27 base ARR", "arr_m": revenue_total[1]},
            {"label": "FY28 base ARR", "arr_m": revenue_total[2]},
            {"label": "FY30 base ARR", "arr_m": revenue_total[4]},
            {"label": "FY32 base ARR", "arr_m": revenue_total[6]},
            {"label": "FY30 bull ARR", "arr_m": 200.0},
            {"label": "FY30 bear ARR", "arr_m": 22.0},
        ],
        "returns": {
            "outcomes": outcomes,
            "weighted_ev_on_slice_m": ev_total,
            "weighted_irr_5y": weighted_irr,
        },
        "thirty_year_arc": [
            {
                "id": r["id"],
                "phase": int(r["phase"]),
                "start_year": int(r["start_year"]),
                "end_year": int(r["end_year"]),
                "name": r["name"],
                "capability": r["capability"],
                "lupine_role": r["lupine_role"],
                "reference_programs": r["reference_programs"],
                "tier": r["tier"],
            }
            for r in arc_rows
        ],
        "matter_stack": [
            {
                "id": r["id"],
                "layer_order": int(r["layer_order"]),
                "layer_name": r["layer_name"],
                "description": r["description"],
                "examples": r["examples"],
                "is_lupine": r["is_lupine"].lower() == "true",
                "tier": r["tier"],
            }
            for r in stack_rows
        ],
        "credo": [
            {
                "id": r["id"],
                "order": int(r["order"]),
                "title": r["title"],
                "body": r["body"],
                "tier": r["tier"],
            }
            for r in sorted(credo_rows, key=lambda r: int(r["order"]))
        ],
        "ceiling": build_ceiling(p4_value_rows, platform_comps_rows, ceiling_rows, acquirer_rows, quantum_rows),
    }


def build_ceiling(p4_value_rows, platform_comps_rows, ceiling_rows, acquirer_rows, quantum_rows) -> dict:
    """Aggregate the platform-tier (McKinsey-style) valuation payload."""
    # Phase-4 addressable value by sector, excluding the total row
    sectors = []
    total_addressable = 0.0
    for r in p4_value_rows:
        if not r["id"] or r["id"] == "total":
            continue
        v = num(r["annual_value_usd_b"])
        sectors.append({
            "id": r["id"],
            "sector": r["sector"],
            "subsector": r["subsector"],
            "annual_value_usd_b": v,
            "year_at_scale": int(r["year_at_scale"]),
            "tier": r["tier"],
            "notes": r["notes"],
        })
        total_addressable += v

    # Platform comps + medians
    comps = []
    for r in platform_comps_rows:
        if not r["id"]:
            continue
        comps.append({
            "id": r["id"],
            "company": r["company"],
            "category": r["category"],
            "revenue_usd_b": num(r["revenue_usd_b"], 0.0),
            "ev_usd_b": num(r["ev_usd_b"], 0.0),
            "ev_revenue_x": num(r["ev_revenue_x"], 0.0),
            "ecosystem_value_usd_b": num(r["ecosystem_value_usd_b"], 0.0),
            "capture_rate_pct": num(r["capture_rate_pct"], 0.0),
            "year": int(r["year"]) if r["year"] else None,
            "tier": r["tier"],
        })

    # Ceiling scenarios
    scenarios = []
    weighted_ev = 0.0
    weighted_p = 0.0
    for r in ceiling_rows:
        if not r["id"]:
            continue
        p = num(r["probability"], 0.0)
        ev = num(r["implied_ev_usd_b"], 0.0)
        scenarios.append({
            "id": r["id"],
            "name": r["name"],
            "year_horizon": int(r["year_horizon"]) if r["year_horizon"] else None,
            "addressable_value_usd_b": num(r["addressable_value_usd_b"], 0.0),
            "capture_rate_pct": num(r["capture_rate_pct"], 0.0),
            "implied_revenue_usd_b": num(r["implied_revenue_usd_b"], 0.0),
            "multiple": num(r["multiple"], 0.0),
            "implied_ev_usd_b": ev,
            "probability": p,
            "tier": r["tier"],
            "notes": r["notes"],
        })
        weighted_ev += p * ev
        weighted_p += p

    # Strategic acquirers
    acquirers = []
    median_acquisition_price = None
    for r in acquirer_rows:
        if not r["id"]:
            continue
        if r["id"] == "median":
            median_acquisition_price = num(r["plausible_acquisition_price_usd_b"], 0.0)
            continue
        acquirers.append({
            "id": r["id"],
            "acquirer": r["acquirer"],
            "rationale": r["strategic_rationale"],
            "npv_to_acquirer_usd_b": num(r["5yr_npv_to_acquirer_usd_b"], 0.0),
            "plausible_acquisition_price_usd_b": num(r["plausible_acquisition_price_usd_b"], 0.0),
            "year_horizon": int(r["year_horizon"]) if r["year_horizon"] else None,
            "tier": r["tier"],
        })

    # Quantum unlocks (phase 5 multiplier layer)
    quantum_unlocks = []
    quantum_total_addressable_usd_b = 0.0
    quantum_total_classical_baseline_usd_b = 0.0
    quantum_aggregate_uplift_x = None
    for r in quantum_rows:
        if not r["id"]:
            continue
        if r["id"] == "total-quantum-addressable":
            # Aggregate row: capture the totals + weighted uplift
            quantum_total_addressable_usd_b = num(r["quantum_addressable_usd_t"], 0.0) * 1000
            quantum_total_classical_baseline_usd_b = num(r["classical_baseline_usd_t"], 0.0) * 1000
            quantum_aggregate_uplift_x = num(r["quantum_uplift_x"], 0.0)
            continue
        quantum_unlocks.append({
            "id": r["id"],
            "unlock": r["unlock"],
            "materials_layer": r["materials_layer"],
            "classical_baseline_usd_t": num(r["classical_baseline_usd_t"], 0.0),
            "quantum_uplift_x": num(r["quantum_uplift_x"], 0.0),
            "quantum_addressable_usd_t": num(r["quantum_addressable_usd_t"], 0.0),
            "year_at_scale": int(r["year_at_scale"]) if r["year_at_scale"] else None,
            "reference_program": r["reference_program"],
            "tier": r["tier"],
        })

    return {
        "phase4_addressable_total_usd_b": total_addressable,
        "phase4_sectors": sectors,
        "platform_comps": comps,
        "scenarios": scenarios,
        "weighted_ev_conditional_usd_b": weighted_ev,
        "weighted_probability_total": weighted_p,
        "strategic_acquirers": acquirers,
        "median_acquisition_price_usd_b": median_acquisition_price,
        "quantum_unlocks": quantum_unlocks,
        "quantum_total_addressable_usd_b": quantum_total_addressable_usd_b,
        "quantum_total_classical_baseline_usd_b": quantum_total_classical_baseline_usd_b,
        "quantum_aggregate_uplift_x": quantum_aggregate_uplift_x,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Verify report is in sync with CSVs")
    args = parser.parse_args()
    sys.exit(main(check_only=args.check))
