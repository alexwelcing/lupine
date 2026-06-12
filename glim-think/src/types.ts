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
 * Row in the `claims` D1 table — adjudicated discovery claims produced by
 * the archived lupine-distill Rust crate and ingested via POST /claims/ingest. Schema mirrors
 * archive/lupine-distill-rust/src/db/schema.rs so rows round-trip without transform.
 * See migrations/0004_claims.sql AND docs/contracts/lupine_distill_to_vectorize.md
 * (the contract doc is the canonical source; this interface and the matching
 * Rust `WorkerSyncClaim` are asserted against it).
 */
export type ClaimStatus = "proposed" | "confirmed" | "refuted" | "formally_proven" | "insufficient";

export interface ClaimRecord {
  claim_id: string;
  agent_id: string;
  claim_type: string;
  claim_data: string;
  evidence_ids: string;
  confidence: number;
  status: string;
  description: string;
  created_at: string;
}

/**
 * Projection of `ClaimRecord` that lives in the Vectorize index metadata
 * column. `description` is the embedded text and is NOT in metadata;
 * `claim_data` and `evidence_ids` are joined back from D1 on read.
 *
 * Cloudflare Vectorize indexes are immutable on metadata field set, so any
 * change here is breaking and requires a new index. See
 * docs/contracts/lupine_distill_to_vectorize.md.
 */
export interface VectorizeClaimMetadata {
  agent_id: string;
  claim_type: string;
  status: string;
  confidence: number;
  created_at: string;
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
  RESEARCH_QUEUE: Queue<unknown>;
  MLIP_BASELINE_GRID?: Workflow<import("./research/mlipBaselineGrid").MlipBaselineGridWorkflowParams>;
  OPENAI_API_KEY?: string;
  /** OpenAI model. Default gpt-5.5 (requires max_completion_tokens +
   * default temperature — handled in OpenAIProvider). */
  OPENAI_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  ZAI_API_KEY?: string;
  /** Z.ai base URL. Default https://api.z.ai/api/coding/paas/v4 (GLM Coding
   * Plan — token-plan accounts 429 on the standard paas/v4 endpoints). */
  ZAI_BASE_URL?: string;
  /** Z.ai model. Default glm-5.1. */
  ZAI_MODEL?: string;
  MINIMAX_API_KEY?: string;
  /** Override the MiniMax model used by deep-tier agents. Default: MiniMax-M3
   * (MINIMAX_DEFAULT_MODEL in agents/models.ts). Set via
   * `wrangler secret put MINIMAX_MODEL` to pin a specific id — e.g. the
   * "MiniMax-M2.7" A/B baseline, which is also the documented rollback target. */
  MINIMAX_MODEL?: string;
  /** Override the MiniMax OpenAI-compatible base URL. Default: api.minimax.io/v1
   * (used by the /admin diagnostics + model-list probes). */
  MINIMAX_BASE_URL?: string;
  /** Override the MiniMax Anthropic-compatible base URL (Messages API). Default:
   * api.minimax.io/anthropic/v1 — MUST include /v1 (@ai-sdk/anthropic POSTs to
   * `${baseURL}/messages`). The endpoint the deep-tier agents call M3 through. */
  MINIMAX_ANTHROPIC_BASE_URL?: string;
  HF_API_KEY?: string;
  /** HF Inference Providers model id (router.huggingface.co). Default:
   * meta-llama/Llama-3.1-8B-Instruct. The legacy api-inference endpoint is
   * deprecated. */
  HF_MODEL?: string;
  /** Hours a window:"experiment" ModelScorecard stays authoritative over
   * production sampling in getModelQualityTrend. Default 168 (7 days). */
  EXPERIMENT_FRESH_HOURS?: string;
  /** Cloudflare Access team subdomain (e.g. "lupine" for lupine.cloudflareaccess.com).
   * Used by middleware/access.ts to fetch JWKS and verify Cf-Access-Jwt-Assertion
   * on /admin/*, /ops/* writes, and other gated routes. */
  CF_ACCESS_TEAM_DOMAIN?: string;
  /** Audience tag of the CF Access application policy fronting this worker. */
  CF_ACCESS_AUD?: string;
  /** Email allow-list for gated routes (single address; expand to comma-split
   * if multi-admin becomes a need). */
  ADMIN_EMAIL?: string;
  /** When "true", bypasses both CF Access middleware AND /feed/beats OIDC JWT
   * verification. Local dev only. */
  DEV_MODE?: string;
  /** Public URL this Worker is reachable at. Used as the expected `aud` claim
   * when verifying OIDC tokens on /feed/beats. Defaults to the request origin. */
  WORKER_URL?: string;
  /** Default GCS manifest used by the MLIP baseline grid Lab runner. */
  MLIP_BASELINE_MANIFEST_URL?: string;
  /** Default GCS output prefix used by the MLIP baseline grid Lab runner. */
  MLIP_BASELINE_OUTPUT_PREFIX?: string;
  /** Default GCS output prefix used by the real MLIP 5x5x3 campaign runner. */
  MLIP_5X5X3_OUTPUT_PREFIX?: string;
  /** Default support manifest used by Distill variants in the MLIP 5x5x3 campaign. */
  MLIP_DISTILL_SUPPORT_MANIFEST_URL?: string;
  /** Canonical Distill policy engine used by MLIP runner variants. */
  MLIP_DISTILL_POLICY_ENGINE?: string;
  /** Optional selected Distill policy-limits artifact used by MLIP runner variants. */
  MLIP_DISTILL_POLICY_URL?: string;
  /** Optional JSON map of row/backend-specific Distill policy-limits artifacts. */
  MLIP_DISTILL_POLICY_URLS_JSON?: string;
  /** Canonical Distill hyperribbon version used by MLIP runner variants. */
  MLIP_DISTILL_RIBBON_VERSION?: string;
  /** Phoenix Cloud OTLP collector endpoint (e.g. https://app.phoenix.arize.com/v1/traces) */
  PHOENIX_COLLECTOR_ENDPOINT?: string;
  /** Phoenix Cloud API key for trace ingestion. */
  PHOENIX_API_KEY?: string;
  /** Phoenix Cloud project name. Default: "glim-think" */
  PHOENIX_PROJECT_NAME?: string;
  /** Route-scoped operator token for Phoenix sync workflow POST routes. */
  PHOENIX_SYNC_TOKEN?: string;
  /**
   * GCP Cloud Run OTLP relay base URL. Cloudflare black-holes Worker→Phoenix
   * Cloud OTLP at the edge (see OBSERVABILITY.md); when set, traces export
   * through this relay (GCP→Phoenix ingests fine). Strongly recommended.
   */
  PHOENIX_RELAY_URL?: string;
  /** Shared secret authenticating the Worker to the OTLP relay. */
  PHOENIX_RELAY_TOKEN?: string;
  /**
   * ATLAS-Lean telemetry config as JSON (§9.2): the pinned ATLAS/Mathlib
   * revisions + theorem inventory rollup the fleet is running against. Shape:
   * { atlas_revision, mathlib_revision, theorem_inventory_summary:
   * { total_imported, total_extended, by_facet } }. Stamped onto OTLP exports
   * as x-lupine-atlas-revision / x-lupine-mathlib-revision /
   * x-lupine-theorem-count. See telemetry/atlas.ts.
   */
  ATLAS_TELEMETRY_CONFIG?: string;
  /** ATLAS-Lean revision (git sha/tag) — discrete fallback for ATLAS_TELEMETRY_CONFIG. */
  ATLAS_REVISION?: string;
  /** Mathlib revision (git sha/tag) — discrete fallback for ATLAS_TELEMETRY_CONFIG. */
  MATHLIB_REVISION?: string;
  /**
   * Shared secret authorizing internal queue→Worker subrequests past the
   * Cloudflare Access gate (the queue consumer self-fetches gated routes
   * like POST /run to reuse handler logic). See middleware/access.ts.
   */
  INTERNAL_TASK_TOKEN?: string;
  TASKS_CONSUMER_URL?: string;
  TASKS_CONSUMER_AUDIENCE?: string;
  TASKS_CONSUMER_INVOKER_SA?: string;
  GCP_SA_KEY?: string;
  GCP_PROJECT_ID?: string;
  GCP_TASKS_LOCATION?: string;
  GCP_TASKS_QUEUE?: string;
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
