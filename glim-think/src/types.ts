/**
 * Shared types and environment interface for glim-think.
 */

export interface Claim {
  claimId: string;
  claimType: string;
  confidence: number;
  description: string;
  payload?: Record<string, unknown>;
}

export interface Hypothesis {
  observationClaimId: string;
  explanation: string;
  prediction: string;
  testStrategy: string;
  discriminativeProperty: string;
  provider?: string;
  model?: string;
}

export type LiteratureSource = "arxiv" | "semantic_scholar" | "openalex";

export interface LiteraturePaper {
  /** DOI is the canonical key when present; otherwise we synthesize one. */
  doi: string;
  arxivId: string | null;
  title: string;
  abstract: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  source: LiteratureSource;
  fetchedAt: string;
  rawArtifactKey: string | null;
  /** External-id passthrough for downstream agents. */
  externalIds?: Record<string, string>;
}

export interface LiteratureSearchResult {
  results: Partial<Record<LiteratureSource, LiteraturePaper[]>>;
  cached: Partial<Record<LiteratureSource, boolean>>;
  errors: Partial<Record<LiteratureSource, string>>;
}

export interface BenchmarkRecord {
  recordId: string;
  element: string;
  potentialId: string;
  potentialLabel: string;
  pairStyle: string;
  property: string;
  reference: number;
  predicted: number;
  unit: string;
  provenance: Record<string, unknown>;
  agentId: string;
  timestamp: string;
}

export interface Env {
  AI: Ai;
  ARTIFACTS: R2Bucket;
  CONFIG: KVNamespace;
  LEDGER: D1Database;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  ZAI_API_KEY?: string;
  MINIMAX_API_KEY?: string;
  HF_API_KEY?: string;
  ORCHESTRATOR: DurableObjectNamespace;
  MANIFOLD_AGENT: DurableObjectNamespace;
  CAUSAL_AGENT: DurableObjectNamespace;
  THEORIST_AGENT: DurableObjectNamespace;
  EXPERIMENT_AGENT: DurableObjectNamespace;
  FLEET_ORCHESTRATOR: DurableObjectNamespace;
  DASHBOARD: DurableObjectNamespace;
  EXTENSION_MANAGER: DurableObjectNamespace;
}
