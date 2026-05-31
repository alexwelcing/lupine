// ═══════════════════════════════════════════════════════════════════
// minimax.ts — the server-side MiniMax tool-use loop.
//
// Uses the EXISTING MiniMax deployment this project already runs (see
// glim-think/src/agents/models.ts + src/admin/diag.ts): a raw-HTTP,
// OpenAI-compatible call to MiniMax's `/chat/completions` endpoint with a
// Bearer MINIMAX_API_KEY. No Anthropic — this customer endpoint must not
// incur Anthropic token costs.
//
//   endpoint: ${MINIMAX_BASE_URL || "https://api.minimax.io/v1"}/chat/completions
//   auth:     Authorization: Bearer ${MINIMAX_API_KEY}
//   model:    ${MINIMAX_MODEL || "MiniMax-M2.7"}   (tools + json capable)
//
// The MINIMAX_API_KEY secret is already provisioned on this Cloudflare
// account (glim-think uses it); set it on this Worker with the same value.
//
// Two server-side tools are exposed to the model (OpenAI function-calling):
//   1. search_catalog     — executed here against the request's catalog
//   2. apply_configuration — the model's channel to emit final MCP actions
//
// Loop: call MiniMax → if it requests search_catalog, run it and feed the
// tool result back → call again. If it calls apply_configuration, capture the
// actions and finish. Otherwise return the assistant text as a clarifying reply.
// ═══════════════════════════════════════════════════════════════════

import { searchCatalog } from "./catalog";
import type {
  CatalogEntry,
  ChatMessage,
  ChatResponseBody,
  McpRequest,
  ViewerState,
} from "./types";

const DEFAULT_BASE_URL = "https://api.minimax.io/v1";
/** Default MiniMax model — matches glim-think's deep tier. Override via env. */
export const DEFAULT_MODEL = "MiniMax-M2.7";

const MAX_TOKENS = 1024;
/** Safety bound on the tool-use loop so a misbehaving model can't spin. */
const MAX_TURNS = 6;

// ─── OpenAI-compatible wire types (minimal subset MiniMax returns) ───

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}
interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}
interface OpenAIChoice {
  message: { role: "assistant"; content: string | null; tool_calls?: OpenAIToolCall[] };
  finish_reason: string;
}
interface OpenAIResponse {
  choices?: OpenAIChoice[];
}
interface OpenAIToolDef {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

// ─── System prompt: how the model should drive the configuration dialog ───

const SYSTEM_PROMPT = `You are LUPI, a concise, friendly molecular-visualization assistant on the home page of a 3D molecular viewer. Your job is to help a visitor pick a molecule and configure how it is displayed, then load + configure it in the viewer.

You have two tools:
- search_catalog(query, elements?) — find the molecule the user means from the site's catalog. ALWAYS use this to confirm the exact molecule before configuring. Pass element symbols (e.g. ["Fe","O"]) in "elements" when the user names them.
- apply_configuration(molecule_id?, actions, done) — emit the final viewer commands. Call this ONLY when you have enough to load and configure the molecule.

Conversation rules:
1. First, identify the molecule the user wants and confirm it via search_catalog. If several match, briefly offer the top option(s).
2. Then INTERROGATE the user about the configuration dimensions, ONE concise question per turn (never more than one question in a single reply):
   a. coloring — color by element, or by a property/scheme.
   b. bonds — show bonds? and if so, how tolerant should bond detection be.
   c. lattice / supercell size — ONLY when generating a procedural crystal (e.g. FCC copper): single cell vs a larger supercell. Fixed catalog molecules have a set structure, so skip lattice for them.
3. Keep every reply short, scientific, and friendly. If the user is vague or says "you pick" / "defaults", choose sensible defaults and proceed — do not keep asking.
4. When you have enough information, call apply_configuration with:
   - one "lupi.generate_molecule" action to LOAD the molecule, and
   - one "lupi.set_viewer" action to CONFIGURE it (coloring, bonds, etc.),
   then set done=true.

Action shapes you MUST follow:
- lupi.generate_molecule arguments: { inputType: "name"|"template"|"procedural", input: string, atomCount?: number, element?: string, elements?: string[], lattice?: "sc"|"bcc"|"fcc", viewer?: ViewerPatch }. For a catalog molecule use inputType:"name" and input set to the molecule title (or formula). For a procedural crystal use inputType:"procedural" with element + lattice + atomCount.
- lupi.set_viewer arguments (ViewerPatch): { showBonds?: boolean, atomScale?: number, colorScheme?: "element"|"property"|"family"|"botanical"|"uniform", colorProperty?: string, colormap?: string, cameraPreset?: string, postprocessPreset?: string, bondTolerance?: number, bondColorMode?: "type"|"length"|"energy"|"screening" }.
- Each action needs a short unique "id" (e.g. "load", "config") and a "tool" set to one of the two MCP tool names above.

Sensible defaults when the user defers: colorScheme "element", showBonds true with bondTolerance 0.45.

Always ground the molecule choice in search_catalog results; never invent a catalog id. Reply in plain prose (no markdown headers).`;

// ─── Tool definitions sent to the model (OpenAI function-calling) ───

const TOOLS: OpenAIToolDef[] = [
  {
    type: "function",
    function: {
      name: "search_catalog",
      description:
        "Search the site's molecule catalog for entries matching the user's words. Returns up to 5 candidates with id, title, formula, elements, and domain. Use this to confirm the exact molecule before configuring.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Free-text description of the molecule (name, formula, or words the user used).",
          },
          elements: {
            type: "array",
            items: { type: "string" },
            description: "Optional element symbols to bias the search, e.g. [\"Fe\",\"O\"].",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_configuration",
      description:
        "Emit the final MCP actions for the client to execute against the viewer. Call this once you have enough information to load AND configure the molecule.",
      parameters: {
        type: "object",
        properties: {
          molecule_id: {
            type: "string",
            description: "The chosen catalog molecule id (from search_catalog results), if any.",
          },
          actions: {
            type: "array",
            description:
              "Ordered MCP requests. Typically one lupi.generate_molecule (load) followed by one lupi.set_viewer (configure).",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "Short unique id for this action." },
                tool: {
                  type: "string",
                  enum: ["lupi.generate_molecule", "lupi.set_viewer"],
                },
                arguments: { type: "object", description: "Tool-specific arguments." },
              },
              required: ["id", "tool", "arguments"],
            },
          },
          done: {
            type: "boolean",
            description: "True when configuration is complete and the molecule is loaded+configured.",
          },
        },
        required: ["actions", "done"],
      },
    },
  },
];

// ─── Public entry point ───

export interface MiniMaxEnv {
  MINIMAX_API_KEY: string;
  MINIMAX_BASE_URL?: string;
  MINIMAX_MODEL?: string;
}

export interface RunChatInput {
  messages: ChatMessage[];
  viewer: ViewerState;
  catalog: CatalogEntry[];
}

/**
 * Run the MiniMax tool-use loop and return the public chat response.
 * Throws on transport / API errors; the caller maps those to HTTP 5xx.
 */
export async function runChat(env: MiniMaxEnv, input: RunChatInput): Promise<ChatResponseBody> {
  const baseURL = (env.MINIMAX_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = env.MINIMAX_MODEL?.trim() || DEFAULT_MODEL;

  // OpenAI-compatible: the system prompt is the first message. Seed with a
  // compact viewer snapshot so the model knows the current state, then the
  // client transcript.
  const convo: OpenAIMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        `Current viewer state: ${JSON.stringify(input.viewer)}.\n` +
        `Catalog size: ${input.catalog.length} molecules.\n` +
        `Begin/continue the conversation based on the messages that follow.`,
    },
    { role: "assistant", content: "Understood — I'll help configure the viewer." },
    ...input.messages.map((m): OpenAIMessage => ({ role: m.role, content: m.content })),
  ];

  // If the client transcript ends on an assistant turn (e.g. a pre-seeded
  // greeting), append a user nudge so the model has a turn to answer.
  if (convo[convo.length - 1]?.role === "assistant") {
    convo.push({ role: "user", content: "Please continue." });
  }

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const message = await callMiniMax(baseURL, env.MINIMAX_API_KEY, model, convo);
    const toolCalls = message.tool_calls ?? [];

    // No tool call → the assistant is asking a clarifying question / replying.
    if (toolCalls.length === 0) {
      return { reply: (message.content ?? "").trim() || "How would you like to configure it?" };
    }

    // If the model decided to finalize, honor apply_configuration immediately.
    const finalize = toolCalls.find((t) => t.function.name === "apply_configuration");
    if (finalize) {
      return buildFinalResponse(finalize, (message.content ?? "").trim());
    }

    // Otherwise execute the requested (search_catalog) tools and loop. Echo the
    // assistant's tool_calls turn, then one tool message per call.
    convo.push({ role: "assistant", content: message.content ?? "", tool_calls: toolCalls });
    for (const tc of toolCalls) {
      convo.push({
        role: "tool",
        tool_call_id: tc.id,
        content: executeServerTool(tc, input.catalog),
      });
    }
  }

  // Loop guard exhausted — return a graceful clarifying prompt.
  return {
    reply:
      "Let's narrow it down — which molecule would you like to view, and how should I color it?",
  };
}

// ─── Helpers ───

/** Parse an OpenAI tool-call argument string; never throws. */
function parseArgs(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Execute a server-side tool and return the tool-message content (JSON string). */
function executeServerTool(tc: OpenAIToolCall, catalog: CatalogEntry[]): string {
  if (tc.function.name === "search_catalog") {
    const args = parseArgs(tc.function.arguments);
    const query = typeof args.query === "string" ? args.query : "";
    const elements = Array.isArray(args.elements)
      ? (args.elements.filter((e) => typeof e === "string") as string[])
      : undefined;
    const hits = searchCatalog(catalog, { query, elements });
    return JSON.stringify({ results: hits });
  }
  return JSON.stringify({ error: `Unknown tool: ${tc.function.name}` });
}

/** Map an apply_configuration tool call into the public ChatResponseBody. */
function buildFinalResponse(finalize: OpenAIToolCall, trailingText: string): ChatResponseBody {
  const input = parseArgs(finalize.function.arguments) as {
    molecule_id?: unknown;
    actions?: unknown;
    done?: unknown;
  };

  const actions = sanitizeActions(input.actions);
  const done = input.done === true;

  let molecule: { id: string; title: string } | null = null;
  if (typeof input.molecule_id === "string" && input.molecule_id.trim()) {
    molecule = { id: input.molecule_id, title: titleFromActions(actions, input.molecule_id) };
  }

  const reply =
    trailingText ||
    (done
      ? "Done — I've loaded and configured the molecule in the viewer."
      : "Here's the configuration.");

  const body: ChatResponseBody = { reply, actions, done };
  if (molecule) body.molecule = molecule;
  return body;
}

/** Validate/normalize the model-emitted actions into well-formed McpRequests. */
function sanitizeActions(raw: unknown): McpRequest[] {
  if (!Array.isArray(raw)) return [];
  const out: McpRequest[] = [];
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i] as Record<string, unknown> | null;
    if (!a || typeof a !== "object") continue;
    const tool = a.tool;
    if (tool !== "lupi.generate_molecule" && tool !== "lupi.set_viewer") continue;
    const args =
      a.arguments && typeof a.arguments === "object"
        ? (a.arguments as Record<string, unknown>)
        : {};
    const id = typeof a.id === "string" && a.id.trim() ? a.id : `action-${i + 1}`;
    out.push({ id, tool, arguments: args });
  }
  return out;
}

/** Best-effort molecule title: the generate_molecule input, else the id. */
function titleFromActions(actions: McpRequest[], fallbackId: string): string {
  const gen = actions.find((a) => a.tool === "lupi.generate_molecule");
  const input = gen?.arguments?.input;
  return typeof input === "string" && input.trim() ? input : fallbackId;
}

/** POST a single turn to MiniMax's OpenAI-compatible chat/completions endpoint. */
async function callMiniMax(
  baseURL: string,
  apiKey: string,
  model: string,
  messages: OpenAIMessage[],
): Promise<OpenAIChoice["message"]> {
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
      max_tokens: MAX_TOKENS,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`MiniMax API ${res.status}: ${detail.slice(0, 500)}`);
  }

  const json = (await res.json()) as OpenAIResponse;
  const message = json.choices?.[0]?.message;
  if (!message) {
    throw new Error("MiniMax API returned no choices");
  }
  return message;
}
