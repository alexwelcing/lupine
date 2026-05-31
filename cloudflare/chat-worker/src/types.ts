// ═══════════════════════════════════════════════════════════════════
// types.ts — shared types for the lupi-chat Worker.
//
// The request/response shapes here are the PUBLIC contract the LUPI
// home-page chat frontend is built against. Do not change them without
// updating the frontend in lockstep (see README.md "API contract").
// ═══════════════════════════════════════════════════════════════════

/** Worker bindings (wrangler.toml + secrets). */
export interface Env {
  /** Per-IP rate-limit counters. Bind in wrangler.toml `[[kv_namespaces]]`. */
  CHAT_RL: KVNamespace;
  /**
   * MiniMax API key (OpenAI-compatible). Set via `wrangler secret put
   * MINIMAX_API_KEY` — already provisioned on this Cloudflare account (the
   * glim-think Worker uses the same secret). This customer endpoint runs on the
   * existing MiniMax deployment; it must NOT incur Anthropic token costs.
   */
  MINIMAX_API_KEY: string;
  /** Optional override of the MiniMax base URL. Default https://api.minimax.io/v1. */
  MINIMAX_BASE_URL?: string;
  /**
   * Optional override of the MiniMax model id. Defaults to DEFAULT_MODEL in
   * minimax.ts (MiniMax-M2.7). Set via `wrangler secret put MINIMAX_MODEL` or a
   * `[vars]` entry to pin a different model without a code change.
   */
  MINIMAX_MODEL?: string;
  /** Optional comma-separated extra allowed origins (exact match). */
  EXTRA_ALLOWED_ORIGINS?: string;
  /** Optional override of requests-per-window. Defaults to RATE_LIMIT_MAX. */
  RATE_LIMIT_MAX?: string;
}

// ─── Chat transcript ───

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

// ─── Viewer state the client reports each turn ───

export interface ViewerState {
  fileName: string | null;
  atomCount: number;
  colorScheme: string;
  showBonds: boolean;
  // The viewer may report additional, forward-compatible fields.
  [k: string]: unknown;
}

// ─── Catalog entries the client ships with each request ───

export interface CatalogEntry {
  id: string;
  title: string;
  subtitle?: string;
  formula?: string;
  elements?: string[];
  tags?: string[];
  domain?: string;
}

// ─── MCP requests the client executes against the viewer ───

export type McpTool = "lupi.generate_molecule" | "lupi.set_viewer";

export interface McpRequest {
  id: string;
  tool: McpTool;
  arguments: Record<string, unknown>;
}

/** Keys the client's viewer understands for `lupi.set_viewer`. */
export interface ViewerPatch {
  showBonds?: boolean;
  atomScale?: number;
  colorScheme?: "element" | "property" | "family" | "botanical" | "uniform";
  colorProperty?: string;
  colormap?: string;
  cameraPreset?: string;
  postprocessPreset?: string;
  bondTolerance?: number;
  bondColorMode?: "type" | "length" | "energy" | "screening";
  latticeReplication?: [number, number, number];
}

/** Arguments shape for `lupi.generate_molecule`. */
export interface GenerateMoleculeArgs {
  inputType: "name" | "template" | "procedural";
  input: string;
  atomCount?: number;
  element?: string;
  elements?: string[];
  lattice?: "sc" | "bcc" | "fcc";
  viewer?: ViewerPatch;
}

// ─── HTTP request / response envelopes ───

export interface ChatRequestBody {
  messages: ChatMessage[];
  viewer: ViewerState;
  catalog: CatalogEntry[];
}

export interface ChatResponseBody {
  /** Assistant message to display in the chat. */
  reply: string;
  /** MCP requests for the client to execute against the viewer. */
  actions?: McpRequest[];
  /** True when configuration is complete and the molecule is loaded+configured. */
  done?: boolean;
  /** The catalog molecule chosen, if any. */
  molecule?: { id: string; title: string } | null;
}
