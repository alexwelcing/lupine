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
  thirty_year_arc: ArcPhase[]
  matter_stack: StackLayer[]
  credo: CredoLine[]
  ceiling: Ceiling
}

export interface Phase4Sector {
  id: string
  sector: string
  subsector: string
  annual_value_usd_b: number
  year_at_scale: number
  tier: string
  notes: string
}

export interface PlatformComp {
  id: string
  company: string
  category: string
  revenue_usd_b: number
  ev_usd_b: number
  ev_revenue_x: number
  ecosystem_value_usd_b: number
  capture_rate_pct: number
  year: number | null
  tier: string
}

export interface CeilingScenario {
  id: string
  name: string
  year_horizon: number | null
  addressable_value_usd_b: number
  capture_rate_pct: number
  implied_revenue_usd_b: number
  multiple: number
  implied_ev_usd_b: number
  probability: number
  tier: string
  notes: string
}

export interface StrategicAcquirer {
  id: string
  acquirer: string
  rationale: string
  npv_to_acquirer_usd_b: number
  plausible_acquisition_price_usd_b: number
  year_horizon: number | null
  tier: string
}

export interface QuantumUnlock {
  id: string
  unlock: string
  materials_layer: string
  classical_baseline_usd_t: number
  quantum_uplift_x: number
  quantum_addressable_usd_t: number
  year_at_scale: number | null
  reference_program: string
  tier: string
}

export interface Ceiling {
  phase4_addressable_total_usd_b: number
  phase4_sectors: Phase4Sector[]
  platform_comps: PlatformComp[]
  scenarios: CeilingScenario[]
  weighted_ev_conditional_usd_b: number
  weighted_probability_total: number
  strategic_acquirers: StrategicAcquirer[]
  median_acquisition_price_usd_b: number
  quantum_unlocks: QuantumUnlock[]
  quantum_total_addressable_usd_b: number
  quantum_total_classical_baseline_usd_b: number
  quantum_aggregate_uplift_x: number
}

export interface CredoLine {
  id: string
  order: number
  title: string
  body: string
  tier: string
}

export interface ArcPhase {
  id: string
  phase: number
  start_year: number
  end_year: number
  name: string
  capability: string
  lupine_role: string
  reference_programs: string
  tier: string
}

export interface StackLayer {
  id: string
  layer_order: number
  layer_name: string
  description: string
  examples: string
  is_lupine: boolean
  tier: string
}
