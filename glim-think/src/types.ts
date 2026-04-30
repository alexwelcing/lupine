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

/**
 * Row in the `hypotheses` D1 table — persisted research hypotheses tracked
 * across the agent fleet. See migrations/0001_hypotheses.sql.
 */
export type HypothesisStatus = "proposed" | "testing" | "confirmed" | "refuted";

export interface HypothesisRecord {
  id: string;
  title: string;
  status: HypothesisStatus;
  confidence: number | null;
  evidence_ids: string | null;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Row in the `critiques` D1 table — peer-review critique queue with R2-backed
 * markdown responses. See migrations/0002_critiques.sql.
 */
export type CritiqueStatus = "pending" | "in_progress" | "completed";

export interface Critique {
  id: string;
  source: string;
  question: string;
  target_hypothesis_id: string | null;
  status: CritiqueStatus;
  response_md: string | null;
  response_artifact_key: string | null;
  created_at: string;
  completed_at: string | null;
}

/**
 * Row in the `research_questions` D1 table — lab-notebook style Q/A queue.
 * Distinct from peer-review critiques (Critique) and hypotheses
 * (HypothesisRecord). See migrations/0003_research_questions.sql.
 */
export type ResearchQuestionStatus = "open" | "in_progress" | "answered";

export interface ResearchQuestion {
  id: string;
  question: string;
  asked_by: string | null;
  status: ResearchQuestionStatus;
  answer_md: string | null;
  answer_artifact_key: string | null;
  target_hypothesis_id: string | null;
  created_at: string;
  answered_at: string | null;
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
  LITERATURIST_AGENT: DurableObjectNamespace;
}
