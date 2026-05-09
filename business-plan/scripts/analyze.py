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

    if check_only:
        existing = OUT.read_text() if OUT.exists() else ""
        if existing != report:
            print("analysis_report.md is OUT OF SYNC with CSVs", file=sys.stderr)
            return 2
        print("analysis_report.md is in sync.")
        return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(report)
    print(f"Wrote {OUT.relative_to(ROOT.parent)}")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Verify report is in sync with CSVs")
    args = parser.parse_args()
    sys.exit(main(check_only=args.check))
