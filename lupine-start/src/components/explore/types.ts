// Shared types + worker base URL for the /console route.
export const WORKER = import.meta.env.VITE_GLIM_THINK_URL ?? 'https://glim-think-v1.aw-ab5.workers.dev'

export type TabKey =
  | 'hypotheses'
  | 'claims'
  | 'insights'
  | 'papers'
  | 'hits'
  | 'critiques'
  | 'vignettes'
  | 'deployments'
  | 'agents'

export interface Hypothesis {
  id: string
  title: string
  status: string
  confidence: number | null
  evidence_ids: string | null
  agent_id: string | null
  created_at: string
}

export interface Claim {
  claim_id: string
  agent_id: string
  claim_type: string
  claim_data: string | null
  description: string
  confidence: number
  status: string
  created_at: string
}

export interface Insight {
  insight_id: string
  paper_doi: string
  hypothesis_id: string
  key_finding: string
  relevance_score: number | null
  agrees_or_refutes: string | null
  paper_title?: string
  paper_year?: number
}

export interface Paper {
  doi: string
  arxiv_id: string | null
  title: string
  year: number | null
  source: string
  fetched_at: string
}

export interface Hit {
  id: string
  hypothesis_id: string
  kind: string
  summary: string
  proposed_action: string | null
  status: string
  hypothesis_title?: string | null
  age_hours?: number
  created_at: string
}

export interface Deployment {
  id: string
  service: string
  status: string
  branch: string
  commit_sha: string
  run_url?: string
  started_at: string
  completed_at: string | null
}

export interface AgentInstance {
  do_class: string
  instance_name: string
  tables: Record<string, number>
  total_rows: number
  error?: string
}

export interface GraphNode {
  id: string
  type: string
  label: string
  status?: string | null
  created_at?: string | null
  source?: string | null
  kind?: string | null
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  try {
    return new Date(s).toISOString().slice(0, 16).replace('T', ' ')
  } catch {
    return s.slice(0, 16)
  }
}

export function fmtConf(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return v.toFixed(2)
}
