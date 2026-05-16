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
 * lupine-distill (Rust) and ingested via POST /claims/ingest. Schema mirrors
 * lupine-distill/src/db/schema.rs so rows round-trip without transform.
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
  /** Override the MiniMax model used by deep-tier agents. Default: MiniMax-M2.
   * Set via `wrangler secret put MINIMAX_MODEL` to e.g. "MiniMax-M2-Pro"
   * when the Max plan exposes a higher-tier model. */
  MINIMAX_MODEL?: string;
  /** Override the MiniMax OpenAI-compatible base URL (e.g. swap to
   * api.minimaxi.com for the international plan). Default: api.minimax.chat/v1. */
  MINIMAX_BASE_URL?: string;
  HF_API_KEY?: string;
  /** HF Inference Providers model id (router.huggingface.co). Default:
   * meta-llama/Llama-3.1-8B-Instruct. The legacy api-inference endpoint is
   * deprecated. */
  HF_MODEL?: string;
  /** Cloudflare AI Gateway auth token (`cf-aig` bearer). Set in prod via
   * `wrangler secret put AI_GATEWAY_TOKEN`; the local value lives only in
   * the gitignored `.dev.vars`. When this AND `AI_GATEWAY_ACCOUNT_ID` AND
   * `AI_GATEWAY_NAME` are all present, the router sends Gateway-eligible
   * providers (Workers AI, ZAI, MiniMax) through Cloudflare AI Gateway.
   * If any is absent the router falls back to direct provider fetches —
   * this absence IS the one-flag rollback switch (see router.ts). */
  AI_GATEWAY_TOKEN?: string;
  /** Cloudflare account id that owns the AI Gateway (URL path segment). */
  AI_GATEWAY_ACCOUNT_ID?: string;
  /** AI Gateway name — the `{gateway}` URL path segment. */
  AI_GATEWAY_NAME?: string;
  /** Gateway-level auth token for an AUTHENTICATED AI Gateway, sent as
   * `cf-aig-authorization`. Distinct from `AI_GATEWAY_TOKEN` (the provider
   * token). Leave unset for unauthenticated gateways (e.g. `glimgate`) —
   * sending it with a non-gateway token returns 401. */
  AI_GATEWAY_AUTH_TOKEN?: string;
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
  /** Phoenix Cloud OTLP collector endpoint (e.g. https://app.phoenix.arize.com/v1/traces) */
  PHOENIX_COLLECTOR_ENDPOINT?: string;
  /** Phoenix Cloud API key for trace ingestion. */
  PHOENIX_API_KEY?: string;
  /** Phoenix Cloud project name. Default: "glim-think" */
  PHOENIX_PROJECT_NAME?: string;
  /**
   * GCP Cloud Run OTLP relay base URL. Cloudflare black-holes Worker→Phoenix
   * Cloud OTLP at the edge (see OBSERVABILITY.md); when set, traces export
   * through this relay (GCP→Phoenix ingests fine). Strongly recommended.
   */
  PHOENIX_RELAY_URL?: string;
  /** Shared secret authenticating the Worker to the OTLP relay. */
  PHOENIX_RELAY_TOKEN?: string;
  /**
   * Shared secret authorizing internal queue→Worker subrequests past the
   * Cloudflare Access gate (the queue consumer self-fetches gated routes
   * like POST /run to reuse handler logic). See middleware/access.ts.
   */
  INTERNAL_TASK_TOKEN?: string;
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
