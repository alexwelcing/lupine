// Schema for business-plan/financials/analysis_data.json
// Synced via `python3 business-plan/scripts/analyze.py` writing to
// lupine-start/src/data/value-model.json

export type Scenario = 'bear' | 'base' | 'bull'

export interface DcfScenarioData {
  wacc: number
  terminal_growth: number
  fcfs: number[]
  pv_fcfs: number[]
  discount_factors: number[]
  sum_pv_fcfs: number
  pv_terminal: number
  enterprise_value: number
  terminal_pct_of_ev: number
}

export interface CompRow {
  id: string
  company: string
  ticker: string
  sector: string
  ev_revenue: number | null
  ev_ebitda: number | null
  gross_margin: number | null
  rev_growth: number | null
  rev_ltm: number | null
  tier: string
}

export interface ValueModelData {
  schema_version: number
  generated_on: string
  round: {
    check_size_usd_m: number
    post_money_usd_m: number
    ownership_pct: number
  }
  years: number[]
  sector_unlock: {
    compute: number[]
    travel: number[]
    bio: number[]
    total: number[]
  }
  lupine: {
    revenue_total_m: number[]
    penetration_pct: number[]
    attributed_unlock_m: number[]
    capture_pct: number[]
    yoy_growth_pct: number[]
    fy26_fy30_cagr_pct: number
    fy28_fy32_cagr_pct: number
  }
  dcf: {
    wacc_inputs: Record<string, number>
    scenarios: Record<Scenario, DcfScenarioData>
    sensitivity: {
      wacc_axis: number[]
      g_axis: number[]
      grid: number[][]
    }
  }
  comps: {
    sim_set: CompRow[]
    ai_bio_set: CompRow[]
    others: CompRow[]
    sim_median_ev_rev: number
    ai_bio_median_ev_rev: number
  }
  implied_valuation: { label: string; arr_m: number }[]
  returns: {
    outcomes: { name: string; p: number; exit_m: number }[]
    weighted_ev_on_slice_m: number
    weighted_irr_5y: number
  }
}
