/**
 * OpenAPI 3.1 specification for the glim-think Cloudflare Worker.
 *
 * Single source of truth for the spec. Served at GET /openapi.json. To get a
 * static file artifact for tooling (swagger-ui, codegen), curl the live spec:
 *   curl https://glim-think-v1.aw-ab5.workers.dev/openapi.json > openapi.json
 * The companion `scripts/gen_routes_md.mjs` reads the live /openapi.json and
 * regenerates `docs/routes.md`.
 *
 * Routes marked `x-status: planned-unit-N` are owned by sibling PRs that may
 * not be merged yet — the spec documents the intended surface so clients can
 * code against it; calls to unmerged routes 404 until the corresponding PR
 * lands.
 */
export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "glim-think",
    version: "2.1.0",
    description:
      "Autoresearch swarm for Lupine Materials Science. Think-enhanced Durable Object agents (Orchestrator, Manifold, Causal, Theorist, Experiment) reasoning over a D1 ledger of interatomic-potential benchmark records, with R2 artifact storage and a multi-provider AI router.",
    contact: { name: "Lupine Materials Science" },
    license: { name: "MIT" },
  },
  servers: [
    { url: "https://glim-think-v1.aw-ab5.workers.dev", description: "production" },
    { url: "http://localhost:8787", description: "local wrangler dev" },
  ],
  tags: [
    { name: "health", description: "Liveness + research-mode metadata" },
    { name: "analysis", description: "Manifold + causal analysis triggers" },
    { name: "fleet", description: "Multi-element parallel orchestration" },
    { name: "experiments", description: "Pending-experiment queue (LAMMPS handoff)" },
    { name: "ingest", description: "Bulk record ingestion" },
    { name: "diary", description: "LLM narrative generation" },
    { name: "extensions", description: "Runtime tool registration" },
    { name: "ops", description: "Deployment observability" },
    { name: "research", description: "Live research-state snapshot" },
    { name: "feed", description: "Real-time swarm activity stream" },
    { name: "spec", description: "Self-describing API spec" },
    { name: "hypotheses", description: "Persisted hypothesis tracker (D1)" },
    { name: "critiques", description: "Peer-review critique queue with R2-backed responses" },
    { name: "research-questions", description: "Lab-notebook Q/A queue (D1)" },
    { name: "claims", description: "Discovery-claim ingestion bridge for lupine-distill verdicts" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["health"],
        summary: "Liveness check + active hypothesis list",
        responses: {
          "200": {
            description: "Service is healthy",
            content: { "application/json": { schema: { $ref: "#/components/schemas/HealthResponse" } } },
          },
        },
      },
    },
    "/run": {
      post: {
        tags: ["analysis"],
        summary: "Synchronous manifold + causal analysis with auto-diary",
        description:
          "Reads the D1 records ledger, computes error vectors and PCA eigenvalues, screens for Simpson's paradox, then asks the AI router for a diary narrative which is also stored in R2. Returns full results inline.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RunRequest" } } },
        },
        responses: {
          "200": {
            description: "Analysis complete",
            content: { "application/json": { schema: { $ref: "#/components/schemas/RunResponse" } } },
          },
          "500": { $ref: "#/components/responses/Error" },
        },
      },
    },
    "/fleet/run": {
      post: {
        tags: ["fleet"],
        summary: "Trigger parallel manifold analysis across multiple elements",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { elements: { type: "array", items: { type: "string" }, description: "Defaults to 15 standard metals" } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Fleet job queued",
            content: { "application/json": { schema: { type: "object", properties: { job_id: { type: "string" }, queued_count: { type: "integer" } } } } },
          },
        },
      },
    },
    "/fleet/status": {
      get: {
        tags: ["fleet"],
        summary: "Fleet execution progress",
        responses: { "200": { description: "Fleet status snapshot" } },
      },
    },
    "/fleet/schedule": {
      post: {
        tags: ["fleet"],
        summary: "Configure recurring fleet runs",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { cron: { type: "string", example: "0 6 * * *" }, elements: { type: "array", items: { type: "string" } } },
              },
            },
          },
        },
        responses: { "200": { description: "Schedule registered" } },
      },
    },
    "/dashboard": {
      get: {
        tags: ["health"],
        summary: "HTML dashboard (delegates to DashboardAgent DO)",
        responses: { "200": { description: "HTML", content: { "text/html": {} } } },
      },
    },
    "/experiments/pending": {
      get: {
        tags: ["experiments"],
        summary: "Pending LAMMPS experiments awaiting local execution",
        responses: {
          "200": {
            description: "Up to 50 pending experiments",
            content: { "application/json": { schema: { type: "object", properties: { experiments: { type: "array", items: { $ref: "#/components/schemas/PendingExperiment" } } } } } },
          },
        },
      },
    },
    "/experiments/complete": {
      post: {
        tags: ["experiments"],
        summary: "Mark a pending experiment as completed",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["experiment_id"], properties: { experiment_id: { type: "string" } } } } },
        },
        responses: { "200": { description: "Marked complete" }, "400": { $ref: "#/components/responses/Error" } },
      },
    },
    "/ingest/batch": {
      post: {
        tags: ["ingest"],
        summary: "Bulk insert benchmark records into the D1 ledger",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["records"], properties: { records: { type: "array", items: { $ref: "#/components/schemas/BenchmarkRecord" } } } } } },
        },
        responses: {
          "200": {
            description: "Insertion summary",
            content: { "application/json": { schema: { type: "object", properties: { ingested: { type: "integer" }, total: { type: "integer" } } } } },
          },
          "400": { $ref: "#/components/responses/Error" },
        },
      },
    },
    "/diary/draft": {
      post: {
        tags: ["diary"],
        summary: "On-demand LLM diary narrative for an element/potential pair",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  element: { type: "string" },
                  potential: { type: "string" },
                  structure: { type: "string", example: "fcc" },
                  records: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Generated narrative",
            content: { "application/json": { schema: { type: "object", properties: { narrative: { type: "string" }, provider: { type: "string" }, model: { type: "string" } } } } },
          },
        },
      },
    },
    "/ext/register": {
      post: {
        tags: ["extensions"],
        summary: "Register a runtime extension (custom agent tool)",
        responses: { "200": { description: "Registered" } },
      },
    },
    "/ext/list": {
      get: { tags: ["extensions"], summary: "List installed extensions", responses: { "200": { description: "Extension list" } } },
    },
    "/ext/run": {
      post: { tags: ["extensions"], summary: "Invoke a registered extension", responses: { "200": { description: "Extension output" } } },
    },
    "/ops/report": {
      post: {
        tags: ["ops"],
        summary: "GitHub Actions deployment telemetry",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/OpsReportRequest" } } },
        },
        responses: { "200": { description: "Recorded" }, "400": { $ref: "#/components/responses/Error" } },
      },
      options: { tags: ["ops"], summary: "CORS preflight", responses: { "204": { description: "No content" } } },
    },
    "/ops/deployments": {
      get: {
        tags: ["ops"],
        summary: "Recent deployment history (filterable by service)",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          { name: "service", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Deployment list",
            content: { "application/json": { schema: { type: "object", properties: { deployments: { type: "array", items: { $ref: "#/components/schemas/Deployment" } } } } } },
          },
        },
      },
      options: { tags: ["ops"], summary: "CORS preflight", responses: { "204": { description: "No content" } } },
    },
    "/research/causal-geometry": {
      get: {
        tags: ["research"],
        summary: "Snapshot of the active research agenda + ledger stats",
        description:
          "Returns hardcoded hypothesis status (h1-h4) along with live record counts and pending-experiment counts from the D1 ledger. Hypothesis state will move to the persisted /hypotheses table once unit 1 lands.",
        responses: {
          "200": {
            description: "Research snapshot",
            content: { "application/json": { schema: { $ref: "#/components/schemas/CausalGeometryResponse" } } },
          },
        },
      },
    },
    "/feed": {
      get: {
        tags: ["feed"],
        summary: "Real-time swarm activity stream",
        responses: {
          "200": {
            description: "Live feed of swarm status, recent records, pending experiments, latest diary",
            content: { "application/json": { schema: { type: "object" } } },
          },
        },
      },
      options: { tags: ["feed"], summary: "CORS preflight", responses: { "204": { description: "No content" } } },
    },
    "/openapi.json": {
      get: {
        tags: ["spec"],
        summary: "This OpenAPI spec",
        responses: {
          "200": { description: "OpenAPI 3.1 spec", content: { "application/json": { schema: { type: "object" } } } },
        },
      },
    },
    "/agents/{class}/{name}": {
      post: {
        tags: ["analysis"],
        summary: "Think agent chat (auto-routed via @cloudflare/think)",
        description:
          "Accepts a chat-style prompt. Available agent classes today: orchestrator, manifold, causal, theorist, experiment. Literaturist is added by unit 5.",
        parameters: [
          { name: "class", in: "path", required: true, schema: { type: "string", enum: ["orchestrator", "manifold", "causal", "theorist", "experiment", "literaturist"] } },
          { name: "name", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { type: "object", properties: { prompt: { type: "string" } } } } },
        },
        responses: { "200": { description: "Agent response" } },
      },
    },
    "/hypotheses": {
      get: { tags: ["hypotheses"], summary: "List hypotheses", responses: { "200": { description: "Hypotheses" } } },
      post: { tags: ["hypotheses"], summary: "Create a hypothesis", responses: { "201": { description: "Created" }, "409": { description: "ID already exists" } } },
    },
    "/hypotheses/{id}": {
      get: { tags: ["hypotheses"], summary: "Single hypothesis", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Hypothesis" }, "404": { description: "Not found" } } },
      patch: { tags: ["hypotheses"], summary: "Update status/confidence/evidence_ids", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Updated" }, "404": { description: "Not found" } } },
    },
    "/critiques": {
      post: { tags: ["critiques"], summary: "Queue a critique for asynchronous response", responses: { "201": { description: "Queued" } } },
      get: { tags: ["critiques"], summary: "List critiques (filter by status/source)", responses: { "200": { description: "Critiques" } } },
    },
    "/critiques/pending": {
      get: { tags: ["critiques"], summary: "Pending critiques only", responses: { "200": { description: "Pending critiques" } } },
    },
    "/critiques/{id}/respond": {
      post: {
        tags: ["critiques"],
        summary: "Submit response markdown for a critique (writes R2 artifact + marks complete)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Responded" } },
      },
    },
    "/research/questions": {
      post: { tags: ["research-questions"], summary: "Ask a lab-notebook question", responses: { "201": { description: "Queued" } } },
      get: { tags: ["research-questions"], summary: "List questions (filter by status, limit)", responses: { "200": { description: "Questions" } } },
    },
    "/research/questions/{id}/answer": {
      post: {
        tags: ["research-questions"],
        summary: "Answer a research question (writes answer_md to R2 + marks answered)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Answered" }, "404": { description: "Not found" } },
      },
    },
    "/claims/ingest": {
      post: {
        tags: ["claims"],
        summary: "Bulk-ingest discovery claims from lupine-distill",
        description:
          "Mirrors lupine-distill's local `claims` table. Each claim row carries a typed payload (CrossStyleAlignment, DimensionalityRanking, ManifoldEvolution, HyperRibbonConfirmed, ...) and is keyed by claim_id (idempotent on conflict).",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["claims"],
            properties: { claims: { type: "array", items: { $ref: "#/components/schemas/ClaimRow" } } },
          } } },
        },
        responses: { "200": { description: "Ingestion summary", content: { "application/json": { schema: {
          type: "object",
          properties: {
            ingested: { type: "integer" },
            total: { type: "integer" },
            errors: { type: "array", items: { type: "object" } },
          },
        } } } } },
      },
    },
    "/claims": {
      get: {
        tags: ["claims"],
        summary: "List claims (filter by status, claim_type, agent_id)",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["proposed", "confirmed", "refuted", "formally_proven", "insufficient"] } },
          { name: "claim_type", in: "query", schema: { type: "string" } },
          { name: "agent_id", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 500 } },
        ],
        responses: { "200": { description: "Claim list", content: { "application/json": { schema: {
          type: "object",
          properties: {
            claims: { type: "array", items: { $ref: "#/components/schemas/ClaimRow" } },
            count: { type: "integer" },
          },
        } } } } },
      },
    },
    "/claims/{id}": {
      get: {
        tags: ["claims"],
        summary: "Single claim by claim_id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Claim", content: { "application/json": { schema: { $ref: "#/components/schemas/ClaimRow" } } } },
          "404": { description: "Not found" },
        },
      },
    },
  },
  components: {
    schemas: {
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string" },
          service: { type: "string" },
          version: { type: "string" },
          runtime: { type: "string" },
          research_mode: { type: "string" },
          research_direction: { type: "string" },
          agents: { type: "array", items: { type: "string" } },
          active_hypotheses: { type: "array", items: { type: "string" } },
        },
      },
      RunRequest: {
        type: "object",
        properties: {
          element: { type: "string", description: "Filter to a single element (Al, Cu, ...). Omit for global." },
          analysis_types: { type: "array", items: { type: "string", enum: ["manifold", "causal"] }, default: ["manifold", "causal"] },
          exclude_styles: { type: "array", items: { type: "string" } },
          only_styles: { type: "array", items: { type: "string" } },
        },
      },
      RunResponse: {
        type: "object",
        properties: {
          element: { type: ["string", "null"] },
          timestamp: { type: "string", format: "date-time" },
          recordCounts: { type: "array", items: { type: "object" } },
          manifold: { $ref: "#/components/schemas/ManifoldResult" },
          causal: { $ref: "#/components/schemas/CausalResult" },
          diary: { $ref: "#/components/schemas/DiaryResult" },
        },
      },
      ManifoldResult: {
        type: "object",
        properties: {
          vectorCount: { type: "integer" },
          properties: { type: "array", items: { type: "string" } },
          means: { type: "array", items: { type: "number" } },
          covarianceMatrix: { type: "array", items: { type: "array", items: { type: "number" } } },
          topEigenvalue: { type: "number" },
          traceCovariance: { type: "number" },
          participationRatio: { type: "number" },
          hyperRibbon: { type: "boolean" },
          principalDirection: { type: "array", items: { type: "number" } },
        },
      },
      CausalResult: {
        type: "object",
        properties: {
          pooledCorrelation: { type: "number" },
          pooledN: { type: "integer" },
          withinElement: { type: "array", items: { type: "object" } },
          withinPairStyle: { type: "array", items: { type: "object" } },
          simpsonsParadoxes: { type: "array", items: { type: "object" } },
          paradoxDetected: { type: "boolean" },
        },
      },
      DiaryResult: {
        type: "object",
        properties: {
          narrative: { type: ["string", "null"] },
          articleId: { type: "string" },
          provider: { type: "string" },
          model: { type: "string" },
          error: { type: "string" },
        },
      },
      BenchmarkRecord: {
        type: "object",
        required: ["recordId", "element", "potentialId", "property", "reference", "predicted", "unit", "timestamp"],
        properties: {
          recordId: { type: "string" },
          element: { type: "string" },
          potentialId: { type: "string" },
          potentialLabel: { type: "string" },
          pairStyle: { type: "string" },
          property: { type: "string", example: "C11" },
          reference: { type: "number" },
          predicted: { type: "number" },
          unit: { type: "string", example: "GPa" },
          provenance: { type: "object" },
          agentId: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      PendingExperiment: {
        type: "object",
        properties: {
          experiment_id: { type: "string" },
          run_id: { type: "string" },
          element: { type: "string" },
          potential_label: { type: "string" },
          potential_id: { type: "string" },
          pair_style: { type: "string" },
          structure: { type: "string" },
          properties: { type: "string", description: "JSON-encoded list" },
          discriminative_property: { type: "string" },
          hypothesis_id: { type: "string" },
          spec: { type: "string" },
          status: { type: "string", enum: ["pending", "completed"] },
          created_at: { type: "string", format: "date-time" },
          completed_at: { type: ["string", "null"], format: "date-time" },
        },
      },
      OpsReportRequest: {
        type: "object",
        required: ["repo", "workflow", "run_id", "status", "service"],
        properties: {
          repo: { type: "string" },
          workflow: { type: "string" },
          run_id: { type: "string" },
          status: { type: "string" },
          commit_sha: { type: "string" },
          branch: { type: "string" },
          service: { type: "string" },
          run_url: { type: "string" },
          started_at: { type: "string", format: "date-time" },
          logs: { type: "string" },
        },
      },
      Deployment: {
        type: "object",
        properties: {
          id: { type: "integer" },
          repo: { type: "string" },
          workflow: { type: "string" },
          run_id: { type: "string" },
          status: { type: "string" },
          commit_sha: { type: ["string", "null"] },
          branch: { type: ["string", "null"] },
          service: { type: "string" },
          run_url: { type: ["string", "null"] },
          started_at: { type: ["string", "null"], format: "date-time" },
          completed_at: { type: ["string", "null"], format: "date-time" },
          logs: { type: ["string", "null"] },
        },
      },
      CausalGeometryResponse: {
        type: "object",
        properties: {
          status: { type: "string" },
          research_mode: { type: "string" },
          hypotheses: { type: "object", additionalProperties: { type: "object" } },
          stats: {
            type: "object",
            properties: {
              total_records: { type: "integer" },
              pending_experiments: { type: "integer" },
              completed_experiments: { type: "integer" },
            },
          },
          critique_response: { type: "object", additionalProperties: { type: "string" } },
        },
      },
      ClaimRow: {
        type: "object",
        required: ["claim_id", "agent_id", "claim_type", "description"],
        properties: {
          claim_id: { type: "string", description: "Unique stable id, e.g. cross_style_pc1_<rec>" },
          agent_id: { type: "string" },
          claim_type: { type: "string", description: "e.g. CrossStyleAlignment, DimensionalityRanking, HyperRibbonConfirmed, ManifoldEvolution" },
          claim_data: {
            oneOf: [
              { type: "string", description: "JSON-encoded payload" },
              { type: "object", additionalProperties: true },
            ],
          },
          evidence_ids: {
            oneOf: [
              { type: "string", description: "JSON-encoded array of record_ids" },
              { type: "array", items: { type: "string" } },
            ],
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          status: { type: "string", enum: ["proposed", "confirmed", "refuted", "formally_proven", "insufficient"] },
          description: { type: "string" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: { error: { type: "string" } },
      },
    },
    responses: {
      Error: {
        description: "Error",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
    },
  },
} as const;
