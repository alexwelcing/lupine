/**
 * Client helpers for the research-dashboard page.
 *
 * Each fetch is `safeFetch`-wrapped so a 404 from a sibling-unit endpoint that
 * isn't deployed yet returns `null` instead of throwing — the dashboard
 * gracefully renders an empty-state placeholder.
 */
const API_BASE = 'https://glim-think-v1.aw-ab5.workers.dev'

export interface Hypothesis {
  id: string
  title: string
  status: 'proposed' | 'testing' | 'confirmed' | 'refuted' | string
  confidence: number | null
  evidence_ids?: string | null
  agent_id?: string | null
  created_at: string
  updated_at: string
}

export interface Critique {
  id: string
  source: string
  question: string
  target_hypothesis_id: string | null
  status: 'pending' | 'in_progress' | 'completed' | string
  response_md: string | null
  response_artifact_key: string | null
  created_at: string
  completed_at: string | null
}

export interface ResearchQuestion {
  id: string
  question: string
  asked_by: string | null
  status: 'open' | 'in_progress' | 'answered' | string
  answer_md: string | null
  target_hypothesis_id: string | null
  created_at: string
  answered_at: string | null
}

export interface LiteraturePaper {
  doi: string | null
  arxiv_id: string | null
  title: string
  abstract?: string
  authors_json?: string
  year: number | null
  venue: string | null
  source: 'arxiv' | 'semantic_scholar' | 'openalex' | string
  fetched_at: string
}

interface FetchOk<T> { ok: true; data: T }
interface FetchMissing { ok: false; reason: 'not_deployed' | 'network_error'; statusCode?: number; message?: string }
export type FetchResult<T> = FetchOk<T> | FetchMissing

async function safeFetch<T>(path: string, init?: RequestInit): Promise<FetchResult<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, init)
    if (res.status === 404) {
      return { ok: false, reason: 'not_deployed', statusCode: 404 }
    }
    if (!res.ok) {
      return { ok: false, reason: 'network_error', statusCode: res.status, message: await res.text() }
    }
    return { ok: true, data: (await res.json()) as T }
  } catch (e) {
    return { ok: false, reason: 'network_error', message: e instanceof Error ? e.message : String(e) }
  }
}

function listFromBody<T>(body: unknown, fallbackKey: string): T[] {
  if (Array.isArray(body)) return body as T[]
  if (body && typeof body === 'object' && fallbackKey in body) {
    const inner = (body as Record<string, unknown>)[fallbackKey]
    if (Array.isArray(inner)) return inner as T[]
  }
  return []
}

export async function fetchHypotheses(): Promise<FetchResult<Hypothesis[]>> {
  const r = await safeFetch<unknown>('/hypotheses')
  return r.ok ? { ok: true, data: listFromBody<Hypothesis>(r.data, 'hypotheses') } : r
}

export async function fetchPendingCritiques(): Promise<FetchResult<Critique[]>> {
  const r = await safeFetch<unknown>('/critiques/pending?limit=20')
  return r.ok ? { ok: true, data: listFromBody<Critique>(r.data, 'critiques') } : r
}

export async function fetchRecentCompletedCritiques(): Promise<FetchResult<Critique[]>> {
  const r = await safeFetch<unknown>('/critiques?status=completed&limit=5')
  return r.ok ? { ok: true, data: listFromBody<Critique>(r.data, 'critiques') } : r
}

export async function fetchResearchQuestions(): Promise<FetchResult<ResearchQuestion[]>> {
  const r = await safeFetch<unknown>('/research/questions?limit=20')
  return r.ok ? { ok: true, data: listFromBody<ResearchQuestion>(r.data, 'research_questions') } : r
}

export async function fetchRecentLiterature(): Promise<FetchResult<LiteraturePaper[]>> {
  const r = await safeFetch<unknown>('/literature/papers?limit=10')
  return r.ok ? { ok: true, data: listFromBody<LiteraturePaper>(r.data, 'papers') } : r
}

export function statusColor(status: string): string {
  switch (status) {
    case 'confirmed':
    case 'answered':
    case 'completed':
      return 'var(--primary)'
    case 'refuted':
      return 'var(--error)'
    case 'testing':
    case 'in_progress':
      return 'var(--secondary)'
    case 'pending':
    case 'open':
    case 'proposed':
    default:
      return 'var(--on-surface-variant)'
  }
}
